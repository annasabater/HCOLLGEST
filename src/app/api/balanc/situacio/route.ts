import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { badRequest, ok } from '@/lib/http';
import { getBalancSituacio } from '@/lib/services/dashboard';

// GET /api/balanc/situacio?data=YYYY-MM-DD — balanç de situació a una data (ADMIN)
// La data és opcional; per defecte, avui.
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;

  const params = new URL(req.url).searchParams;
  const dataParam = params.get('data'); // YYYY-MM-DD
  const incloureCustodia = params.get('custodia') !== 'false';
  let dataTall = new Date();
  if (dataParam) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataParam);
    if (!m) return badRequest('Data no vàlida (YYYY-MM-DD)');
    // Final del dia perquè inclogui tot el que s'ha registrat aquell dia.
    dataTall = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
  }

  return ok(await getBalancSituacio(dataTall, { incloureCustodia }));
}

export const dynamic = 'force-dynamic';
