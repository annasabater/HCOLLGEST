import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok } from '@/lib/http';
import { getBalancAny } from '@/lib/services/dashboard';
import { teVistaRestringida } from '@/lib/auth/restriccions';

// GET /api/balanc/any?any=YYYY — balanç dels 12 mesos (només ADMIN)
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;
  const raw = new URL(req.url).searchParams.get('any');
  const year = raw && /^\d{4}$/.test(raw) ? Number(raw) : new Date().getFullYear();
  return ok(await getBalancAny(year, { excloureMetodeAltres: teVistaRestringida(auth) }));
}

export const dynamic = 'force-dynamic';
