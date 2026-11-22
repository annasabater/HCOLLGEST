import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { actualitzarPla, esborrarPla } from '@/lib/services/neteja-planificacio';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/neteja/planificacio/:id — canvia sortida/manteniment o l'observació.
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await params;
    return ok({ pla: await actualitzarPla(id, await req.json().catch(() => null), { id: auth.id }, clientIp(req)) });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/neteja/planificacio/:id — treu l'habitació de la planificació.
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await params;
    await esborrarPla(id, { id: auth.id }, clientIp(req));
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
