import { authorize } from '@/lib/auth/guard';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { getPersonesPeriode } from '@/lib/services/ocupacio';

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/ocupacio/persones?desde=&fins= — persones que han estat al període (per triar-les al full).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const sp = new URL(req.url).searchParams;
    const desde = sp.get('desde') ?? '';
    const fins = sp.get('fins') ?? '';
    if (!RE_DATA.test(desde) || !RE_DATA.test(fins) || desde > fins) return badRequest('Període no vàlid');
    return ok(await getPersonesPeriode(desde, fins, teVistaRestringida(auth)));
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
