import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

const UpdateSchema = z.object({
  estat: z.enum(['RESERVA', 'EN_CURS', 'FINALITZADA', 'CANCELLADA']).optional(),
  observacions: z.string().optional(),
  habitacioId: z.string().nullable().optional(),
  avisDadesParat: z.boolean().optional(),
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

export const dynamic = 'force-dynamic';
