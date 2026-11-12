import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError, ok, readJson } from '@/lib/http';
import { accioRecordatori, editaRecordatori, eliminaRecordatori } from '@/lib/services/recordatoris';

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/recordatoris/:id — editar.
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    return ok(await editaRecordatori(id, await readJson(req), auth, clientIp(req)));
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/recordatoris/:id — { accio: 'FET' } | { accio: 'AJORNA', dies } | { accio: 'DESFES' }
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    return ok(await accioRecordatori(id, await readJson(req), auth, clientIp(req)));
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/recordatoris/:id — baixa lògica.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await eliminaRecordatori(id, auth, clientIp(req));
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
