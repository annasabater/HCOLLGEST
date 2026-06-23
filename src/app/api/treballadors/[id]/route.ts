import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError, notFound } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/treballadors/:id — esborrat lògic (conserva jornades/nòmines històriques).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const existing = await prisma.treballador.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return notFound();

    await prisma.treballador.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'treballador', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
