import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, noContent, notFound, ok } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/jornades/:id — marca/desmarca com a pagada
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const pagada = Boolean(body.pagada);
    const j = await prisma.jornada.update({
      where: { id },
      data: { pagada, dataPagament: pagada ? new Date() : null },
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'jornada', entitatId: id, detall: { pagada }, ip: clientIp(req) });
    return ok({ jornada: j });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/jornades/:id — elimina una jornada registrada
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const j = await prisma.jornada.findUnique({ where: { id }, select: { id: true } });
    if (!j) return notFound();
    await prisma.jornada.delete({ where: { id } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'jornada',
      entitatId: id,
      ip: clientIp(req),
    });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
