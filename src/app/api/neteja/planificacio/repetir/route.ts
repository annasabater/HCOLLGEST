import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { repetirSetmana } from '@/lib/services/neteja-planificacio';

// POST /api/neteja/planificacio/repetir {dilluns} — copia la setmana anterior a aquesta.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = (await req.json().catch(() => null)) as { dilluns?: string } | null;
    return ok({ creades: await repetirSetmana(body?.dilluns ?? '', { id: auth.id }, clientIp(req)) });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
