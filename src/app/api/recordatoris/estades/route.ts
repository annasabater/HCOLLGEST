import { authorize } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError, ok } from '@/lib/http';
import { cercaEstadesPerRecordatori } from '@/lib/services/recordatoris';

// GET /api/recordatoris/estades?q= — estades d'ara i futures per lligar-hi un
// recordatori (per habitació, número de contracte o nom d'un hoste).
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 60);
    return ok({ estades: await cercaEstadesPerRecordatori(q) });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
