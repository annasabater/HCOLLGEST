import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/valoracions/:id — elimina una valoració (panell de gestió).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    await prisma.valoracio.delete({ where: { id } });

    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'valoracio',
      entitatId: id,
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
