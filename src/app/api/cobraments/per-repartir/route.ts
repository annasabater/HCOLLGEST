import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError, ok } from '@/lib/http';
import { pagamentsPerRepartir, repartirTotsAutomatics } from '@/lib/services/repartiment-cobraments';

export const maxDuration = 60;

// GET /api/cobraments/per-repartir — pagaments d'estades de més d'un mes sense repartir.
export async function GET() {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    return ok(await pagamentsPerRepartir());
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/cobraments/per-repartir — reparteix tots els automàtics (estades d'un sol pagament).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    return ok(await repartirTotsAutomatics({ id: auth.id }, clientIp(req)));
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
