import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError, ok, readJson } from '@/lib/http';
import { desaRepartiment, proposaRepartiment } from '@/lib/services/repartiment-cobraments';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/cobraments/:id/periodes — proposta automàtica de repartiment per mesos.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    return ok(await proposaRepartiment(id));
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/cobraments/:id/periodes — { periodes: [...] } desa el repartiment d'un
// pagament ja fet ([] el treu). La factura no canvia: només el Balanç.
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    return ok(await desaRepartiment(id, await readJson(req), { id: auth.id }, clientIp(req)));
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
