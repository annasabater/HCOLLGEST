import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { badRequest, created, handleApiError, ok, readJson } from '@/lib/http';
import { creaMovimentTresoreria, registreTresoreria } from '@/lib/services/tresoreria';

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/tresoreria?desde=YYYY-MM-DD&fins=YYYY-MM-DD — registre de Deure i Haver de banc i caixa.
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const sp = new URL(req.url).searchParams;
    const desde = sp.get('desde') ?? '';
    const fins = sp.get('fins') ?? '';
    if (!RE_DATA.test(desde) || !RE_DATA.test(fins)) return badRequest('Cal desde i fins en format YYYY-MM-DD');
    if (desde > fins) return badRequest('La data inicial ha de ser anterior a la final');
    return ok(await registreTresoreria(desde, fins));
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/tresoreria — moviment a mà (saldo inicial, traspàs, entrada o sortida).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    return created(await creaMovimentTresoreria(await readJson(req), auth, clientIp(req)));
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
