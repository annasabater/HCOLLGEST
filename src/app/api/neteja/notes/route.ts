import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { desarNota } from '@/lib/services/neteja-planificacio';

// PUT /api/neteja/notes {data, ambit: DIA|SETMANA, text} — desa l'observació; text buit = l'esborra.
export async function PUT(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    return ok({ nota: await desarNota(await req.json().catch(() => null), { id: auth.id }, clientIp(req)) });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
