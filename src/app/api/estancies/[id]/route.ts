import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { TipusPagamentEnum } from '@/lib/validation/enums';
import { RegistreSchema, RegistreEsborranySchema } from '@/lib/validation/registre';
import { updateRegistre } from '@/lib/services/registre';

type Ctx = { params: Promise<{ id: string }> };

const UpdateSchema = z
  .object({
    estat: z.enum(['RESERVA', 'EN_CURS', 'FINALITZADA', 'CANCELLADA']).optional(),
    tipusRegistre: z.enum(['RESERVA', 'CONTRACTE_EN_CURS']).optional(),
    numContracte: z.string().trim().optional(),
    observacions: z.string().nullable().optional(),
    habitacioId: z.string().nullable().optional(),
    avisDadesParat: z.boolean().optional(),
    avisMossosParat: z.boolean().optional(),
    benvingudaEnviada: z.boolean().optional(),
    esBorrany: z.boolean().optional(),
    // Edició de l'estada.
    dataEntrada: z.coerce.date().optional(),
    dataSortida: z.coerce.date().optional(),
    tipusPagament: TipusPagamentEnum.optional(),
    numHabitacions: z.coerce.number().int().min(0).nullable().optional(),
    teInternet: z.boolean().optional(),
    idioma: z.enum(['ca', 'es', 'en', 'fr']).nullable().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.dataEntrada && d.dataSortida && d.dataSortida <= d.dataEntrada) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dataSortida'],
        message: 'La data de sortida ha de ser posterior a l’entrada',
      });
    }
  });

// GET /api/estancies/:id — detalle completo
export async function GET(_req: Request, ctx: Ctx) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;

  const estancia = await prisma.estancia.findFirst({
    where: { id, deletedAt: null },
    include: {
      viatgers: { include: { huesped: true, signatura: true }, orderBy: { esTitular: 'desc' } },
      enviaments: { orderBy: { createdAt: 'desc' } },
      habitacio: true,
      factures: { include: { linies: true, cobraments: true } },
      tasesTuristiques: true,
    },
  });
  if (!estancia) return notFound();
  return ok({ estancia });
}

// PATCH /api/estancies/:id — estado / observaciones / habitación
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = UpdateSchema.parse(body);

    const exists = await prisma.estancia.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!exists) return notFound();
    const estancia = await prisma.estancia.update({ where: { id }, data });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'estancia',
      entitatId: id,
      detall: { camps: Object.keys(data) },
      ip: clientIp(req),
    });

    return ok({ estancia });
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/estancies/:id — edició COMPLETA (formulari mestre): dades de
// l'estada + viatgers + esborrany. ?borrany=1 desa amb validació laxa.
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const borrany = new URL(req.url).searchParams.get('borrany') === '1';
    const body = await req.json().catch(() => null);
    const input = (borrany ? RegistreEsborranySchema : RegistreSchema).parse(body);

    const result = await updateRegistre(id, input, { id: auth.id }, clientIp(req), {
      esBorrany: borrany,
    });
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/estancies/:id — esborrat lògic de l'estada i de les seves factures
// (la treu del llibre, de les llistes i de la comptabilitat). Les dades queden a
// la BD i a l'audit_log (recuperable per un administrador si cal).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const exists = await prisma.estancia.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, viatgers: { select: { huespedId: true, huesped: { select: { deletedAt: true } } } } },
    });
    if (!exists) return notFound();

    // ?hostes=1 → treu també del CRM els clients que es quedarien sense cap
    // estada visible. Es recalcula aquí (no es confia en el client) i va dins
    // la mateixa transacció, perquè no quedi a mitges.
    const ambHostes = new URL(req.url).searchParams.get('hostes') === '1';
    const orfes: string[] = [];
    if (ambHostes) {
      const vius = exists.viatgers.filter((v) => !v.huesped.deletedAt).map((v) => v.huespedId);
      for (const huespedId of new Set(vius)) {
        const altres = await prisma.estanciaViatger.count({
          where: { huespedId, estanciaId: { not: id }, estancia: { deletedAt: null } },
        });
        if (altres === 0) orfes.push(huespedId);
      }
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.factura.updateMany({ where: { estanciaId: id, deletedAt: null }, data: { deletedAt: now } }),
      prisma.estancia.update({ where: { id }, data: { deletedAt: now } }),
      ...(orfes.length
        ? [prisma.huesped.updateMany({ where: { id: { in: orfes }, deletedAt: null }, data: { deletedAt: now } })]
        : []),
    ]);

    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'estancia',
      entitatId: id,
      detall: orfes.length ? { hostesEliminats: orfes } : undefined,
      ip: clientIp(req),
    });
    for (const huespedId of orfes) {
      await audit({
        usuariId: auth.id,
        accio: 'ELIMINACIO',
        entitat: 'huesped',
        entitatId: huespedId,
        detall: { motiu: 'sense estades en eliminar l’estada', estanciaId: id },
        ip: clientIp(req),
      });
    }
    return ok({ ok: true, hostesEliminats: orfes });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
