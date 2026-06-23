import { authorize } from '@/lib/auth/guard';
import { ok } from '@/lib/http';
import { getResum } from '@/lib/services/dashboard';
import { teVistaRestringida } from '@/lib/auth/restriccions';

export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  return ok(await getResum({ excloureMetodeAltres: teVistaRestringida(auth) }));
}

export const dynamic = 'force-dynamic';
