import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { badRequest, ok } from '@/lib/http';
import { getBalancDetall } from '@/lib/services/dashboard';
import { teVistaRestringida } from '@/lib/auth/restriccions';

// GET /api/balanc?mes=YYYY-MM — balanç de caixa del mes (només ADMIN)
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;

  const mes = new URL(req.url).searchParams.get('mes'); // YYYY-MM
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (mes) {
    const m = /^(\d{4})-(\d{2})$/.exec(mes);
    if (!m) return badRequest('Mes no vàlid (YYYY-MM)');
    year = Number(m[1]);
    month = Number(m[2]) - 1;
  }
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return ok({
    mes: `${year}-${String(month + 1).padStart(2, '0')}`,
    ...(await getBalancDetall(monthStart, monthEnd, { excloureMetodeAltres: teVistaRestringida(auth) })),
  });
}

export const dynamic = 'force-dynamic';
