import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { reactivarEstancia } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/reactivar — desfà una sortida anticipada (per error):
// torna l'estada a allotjada i restaura la data de sortida original.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const result = await reactivarEstancia(id, { id: auth.id }, clientIp(req));
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
