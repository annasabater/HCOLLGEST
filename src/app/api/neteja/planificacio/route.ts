import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { ok, created, badRequest, handleApiError } from '@/lib/http';
import { esborrarDia, getPlanificacio, plansDelDia, planificar } from '@/lib/services/neteja-planificacio';

const RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/neteja/planificacio?desde=&fins= — el full per setmanes (fetes + planificades).
// GET /api/neteja/planificacio?dia=YYYY-MM-DD — només la planificació d'un dia (per al full del dia).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const sp = new URL(req.url).searchParams;
    const dia = sp.get('dia');
    if (dia) return ok(await plansDelDia(dia));
    const desde = sp.get('desde') ?? '';
    const fins = sp.get('fins') ?? '';
    if (!RE.test(desde) || !RE.test(fins) || desde > fins) return badRequest('Període no vàlid');
    return ok(await getPlanificacio(desde, fins));
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/neteja/planificacio — planifica una habitació un dia {data, habitacioId, tipus?, treballadorId?, nota?}
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    return created({ pla: await planificar(await req.json().catch(() => null), { id: auth.id }, clientIp(req)) });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/neteja/planificacio?dia=YYYY-MM-DD — treu tot el que hi ha planificat aquell dia.
export async function DELETE(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const dia = new URL(req.url).searchParams.get('dia') ?? '';
    return ok({ esborrades: await esborrarDia(dia, { id: auth.id }, clientIp(req)) });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
