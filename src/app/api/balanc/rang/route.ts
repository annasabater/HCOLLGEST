import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { badRequest, ok } from '@/lib/http';
import { getBalancDetall } from '@/lib/services/dashboard';
import { teVistaRestringida } from '@/lib/auth/restriccions';

// GET /api/balanc/rang?desde=YYYY-MM&fins=YYYY-MM
// Balanç de caixa agregat d'un rang de mesos (trimestre, de X mes a Y mes…).
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;

  const p = new URL(req.url).searchParams;
  const md = /^(\d{4})-(\d{2})$/.exec(p.get('desde') ?? '');
  const mf = /^(\d{4})-(\d{2})$/.exec(p.get('fins') ?? '');
  if (!md || !mf) return badRequest('Rang no vàlid (YYYY-MM)');

  const start = new Date(Number(md[1]), Number(md[2]) - 1, 1);
  const end = new Date(Number(mf[1]), Number(mf[2]), 0, 23, 59, 59, 999);
  if (end < start) return badRequest('La data final ha de ser anterior a la inicial');

  return ok({
    mes: `${md[1]}-${md[2]} … ${mf[1]}-${mf[2]}`,
    desde: `${md[1]}-${md[2]}`,
    fins: `${mf[1]}-${mf[2]}`,
    ...(await getBalancDetall(start, end, { excloureMetodeAltres: teVistaRestringida(auth) })),
  });
}

export const dynamic = 'force-dynamic';
