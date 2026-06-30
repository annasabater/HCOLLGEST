import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { finalitzarEstanciaAnticipada } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/finalitzar-anticipada — sortida anticipada: escurça la
// data de sortida, marca FINALITZADA, deixa nota interna i (opcional) devolució.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const result = await finalitzarEstanciaAnticipada(id, body, { id: auth.id }, clientIp(req));
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
