import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { badRequest, ok } from '@/lib/http';
import { getBalancSituacio } from '@/lib/services/dashboard';

// GET /api/balanc/situacio?desde=YYYY-MM-DD&fins=YYYY-MM-DD — balanç del PERÍODE
// (només els moviments entre les dues dates). `data` (llegat) equival a `fins`;
// sense `desde`, es pren des de l'inici dels registres (acumulat).
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;

  const params = new URL(req.url).searchParams;
  const incloureCustodia = params.get('custodia') !== 'false';
  const re = /^(\d{4})-(\d{2})-(\d{2})$/;

  const finsParam = params.get('fins') ?? params.get('data');
  let end = new Date();
  end.setHours(23, 59, 59, 999);
  if (finsParam) {
    const m = re.exec(finsParam);
    if (!m) return badRequest('Data final no vàlida (YYYY-MM-DD)');
    end = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
  }

  const desdeParam = params.get('desde');
  let start = new Date(1970, 0, 1);
  if (desdeParam) {
    const m = re.exec(desdeParam);
    if (!m) return badRequest('Data inicial no vàlida (YYYY-MM-DD)');
    start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  if (end < start) return badRequest('La data final ha de ser posterior a la inicial');

  return ok(await getBalancSituacio(start, end, { incloureCustodia }));
}

export const dynamic = 'force-dynamic';
