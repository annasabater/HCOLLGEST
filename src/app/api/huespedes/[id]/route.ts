import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { HuespedUpdateSchema } from '@/lib/validation/huesped';
import { nights } from '@/lib/dates';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/huespedes/:id — ficha + historial + estadísticas (§8 Fase 2)
export async function GET(_req: Request, ctx: Ctx) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;

  const huesped = await prisma.huesped.findFirst({
    where: { id, deletedAt: null },
    include: {
      estancies: {
        include: { estancia: { include: { factures: true } } },
        orderBy: { createdAt: 'desc' },
      },
      anotacions: { where: { deletedAt: null }, orderBy: { data: 'desc' } },
      documents: { where: { deletedAt: null } },
    },
  });
  if (!huesped) return notFound();

  const estancies = huesped.estancies.map((ev) => ev.estancia);
  const nitsAcumulades = estancies.reduce(
    (acc, e) => acc + nights(e.dataEntrada, e.dataSortida),
    0,
  );
  const gastoTotal = estancies
    .flatMap((e) => e.factures)
    .reduce((acc, f) => acc + Number(f.total), 0);
  const dates = estancies.map((e) => e.dataEntrada).sort((a, b) => a.getTime() - b.getTime());

  return ok({
    huesped,
    estadistiques: {
      visites: estancies.length,
      nitsAcumulades,
      gastoTotal,
      primeraVisita: dates[0] ?? null,
      ultimaVisita: dates[dates.length - 1] ?? null,
      noAcollir: huesped.anotacions.some((a) => a.noAcollir),
    },
  });
}

// PATCH /api/huespedes/:id — actualizar solo lo cambiado (mantiene historial)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = HuespedUpdateSchema.parse(body);

    const exists = await prisma.huesped.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!exists) return notFound();
    const huesped = await prisma.huesped.update({ where: { id }, data });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'huesped',
      entitatId: id,
      detall: { camps: Object.keys(data) },
      ip: clientIp(req),
    });

    return ok({ huesped });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
