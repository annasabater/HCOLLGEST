import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { disponibilitatIPropostes } from '@/lib/services/propostes-habitacio';
import { GRUP_TARIFA, type GrupTarifa } from '@/lib/validation/tarifa-tipus';

// GET /api/tarifes-tipus/propostes?grup=&entrada=YYYY-MM-DD&sortida=YYYY-MM-DD&mensual=1|0
// Ocupació dia a dia de les habitacions per a l'estada i propostes d'habitació
// (amb un canvi com a molt), de més barata a més cara.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const grup = url.searchParams.get('grup') as GrupTarifa | null;
    const entradaStr = url.searchParams.get('entrada');
    const sortidaStr = url.searchParams.get('sortida');
    const mensualStr = url.searchParams.get('mensual');
    const mensual = mensualStr === '1' ? true : mensualStr === '0' ? false : undefined;

    if (!grup || !GRUP_TARIFA.includes(grup)) return badRequest('Tipus d\'habitació no vàlid');
    if (!entradaStr || !sortidaStr) return badRequest('Cal data d\'entrada i de sortida');
    const entrada = new Date(entradaStr);
    const sortida = new Date(sortidaStr);
    if (Number.isNaN(entrada.getTime()) || Number.isNaN(sortida.getTime())) return badRequest('Dates no vàlides');

    return ok(await disponibilitatIPropostes({ grup, entrada, sortida, mensual }));
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
