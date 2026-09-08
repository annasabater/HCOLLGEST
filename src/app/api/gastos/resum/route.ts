import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { resumDespeses } from '@/lib/services/despeses';

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/gastos/resum?desde=YYYY-MM-DD&fins=YYYY-MM-DD
// Despesa real del període partida en variables / fixes / personal, amb les
// fiances a part, el desglossament per categoria, el detall del personal i la
// sèrie mensual de l'any (la del gràfic de /gastos).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const sp = new URL(req.url).searchParams;
    const desde = sp.get('desde') ?? '';
    const fins = sp.get('fins') ?? '';
    if (!RE_DATA.test(desde) || !RE_DATA.test(fins)) {
      return badRequest('Cal desde i fins en format YYYY-MM-DD');
    }
    if (desde > fins) return badRequest('La data inicial ha de ser anterior a la final');

    return ok(await resumDespeses(desde, fins));
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
