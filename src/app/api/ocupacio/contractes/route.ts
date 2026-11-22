import { authorize } from '@/lib/auth/guard';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { getOcupacio } from '@/lib/services/ocupacio';

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/ocupacio/contractes?desde=&fins= — les estades (contractes) que sortiran al full
// d'Ocupació: les de les persones del període, amb tot el seu historial. Per triar-les.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const sp = new URL(req.url).searchParams;
    const desde = sp.get('desde') ?? '';
    const fins = sp.get('fins') ?? '';
    if (!RE_DATA.test(desde) || !RE_DATA.test(fins) || desde > fins) return badRequest('Període no vàlid');
    const full = await getOcupacio(desde, fins, teVistaRestringida(auth), undefined, sp.get('reserves') !== '0');
    return ok(
      full.map((c) => ({
        clau: c.clau,
        numero: c.numero,
        habitacions: c.habitacions,
        persones: c.persones.map((p) => p.nom),
        del: c.trams[0]?.del ?? null,
        al: c.trams.at(-1)?.al ?? null,
        trams: c.trams.length,
        reserva: c.reserva,
      })),
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
