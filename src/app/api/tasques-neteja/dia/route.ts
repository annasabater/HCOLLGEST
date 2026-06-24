import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError, ok } from '@/lib/http';
import { desarFullDia } from '@/lib/services/neteja';

// PUT /api/tasques-neteja/dia — desa el full de neteja d'un dia per a una persona
// (substitueix d'un cop totes les seves habitacions d'aquell dia).
export async function PUT(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const result = await desarFullDia(body, { id: auth.id }, clientIp(req));
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
