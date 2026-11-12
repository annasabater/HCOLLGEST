import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError, ok, readJson } from '@/lib/http';
import { creaRecordatori, llistaRecordatoris } from '@/lib/services/recordatoris';

// GET /api/recordatoris — pendents i últims fets.
export async function GET() {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    return ok(await llistaRecordatoris());
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/recordatoris — nou recordatori.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    return created(await creaRecordatori(await readJson(req), auth, clientIp(req)));
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
