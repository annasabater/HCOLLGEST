import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { DipositResolSchema } from '@/lib/validation/factura';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/diposits/:id — resol el dipòsit: TORNAT (es retorna) o RETINGUT (passa a ingrés)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const exists = await prisma.diposit.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return notFound();

    const body = await req.json().catch(() => null);
    const data = DipositResolSchema.parse(body);

    const diposit = await prisma.diposit.update({
      where: { id },
      data: { estat: data.estat, motiu: data.motiu ?? null, dataResolucio: new Date() },
    });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'diposit',
      entitatId: id,
      detall: { estat: data.estat },
      ip: clientIp(req),
    });
    return ok({ diposit });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
