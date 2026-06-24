import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { editCobrament, removeCobrament } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/cobraments/:id — corregeix un cobrament (mètode/import/data). Si és
// d'una factura, en recalcula l'estat (cobrada/pendent).
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const result = await editCobrament(id, body, { id: auth.id }, clientIp(req));
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/cobraments/:id — elimina un cobrament (a compte o dins d'una
// factura). Si era d'una factura, en recalcula l'estat. No toca el registre
// fiscal: esborrar un pagament no modifica Veri*Factu.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const result = await removeCobrament(id, { id: auth.id }, clientIp(req));
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
