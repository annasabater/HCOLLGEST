import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok } from '@/lib/http';
import { getFiancesObertes } from '@/lib/services/dashboard';

// GET /api/balanc/fiances
// Fiances obertes de qualsevol data: les rebudes de clients que encara són en
// custòdia (s'han de tornar) i les pagades a proveïdors (recuperables).
export async function GET() {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;
  return ok(await getFiancesObertes());
}

export const dynamic = 'force-dynamic';
