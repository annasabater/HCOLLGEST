import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { calcularPreu } from '@/lib/services/calcul-preu';
import { GRUP_TARIFA, type GrupTarifa } from '@/lib/validation/tarifa-tipus';

// GET /api/tarifes-tipus/calcular?grup=&entrada=YYYY-MM-DD&sortida=YYYY-MM-DD&temporadaId=
// Calcula el preu d'una estada (combinació més barata) + disponibilitat del tipus.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const grup = url.searchParams.get('grup') as GrupTarifa | null;
    const entradaStr = url.searchParams.get('entrada');
    const sortidaStr = url.searchParams.get('sortida');
    const temporadaId = url.searchParams.get('temporadaId');

    if (!grup || !GRUP_TARIFA.includes(grup)) return badRequest('Tipus d\'habitació no vàlid');
    if (!entradaStr || !sortidaStr) return badRequest('Cal data d\'entrada i de sortida');
    const entrada = new Date(entradaStr);
    const sortida = new Date(sortidaStr);
    if (Number.isNaN(entrada.getTime()) || Number.isNaN(sortida.getTime())) return badRequest('Dates no vàlides');

    const resultat = await calcularPreu({ grup, entrada, sortida, temporadaId });
    return ok(resultat);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
