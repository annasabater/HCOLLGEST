import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { handleApiError, ok } from '@/lib/http';
import { eliminaMovimentTresoreria } from '@/lib/services/tresoreria';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/tresoreria/:id — treu un moviment entrat a mà (baixa lògica).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await eliminaMovimentTresoreria(id, auth, clientIp(req));
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
