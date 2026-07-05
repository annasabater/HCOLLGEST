import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { badRequest, ok } from '@/lib/http';
import { getBalancDetall } from '@/lib/services/dashboard';
import { teVistaRestringida } from '@/lib/auth/restriccions';

// GET /api/balanc/rang?desde=YYYY-MM[-DD]&fins=YYYY-MM[-DD]
// Balanç de caixa agregat d'un rang: mesos sencers (YYYY-MM) o dies exactes
// (YYYY-MM-DD), p. ex. del 15/06 al 10/07.
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;

  const p = new URL(req.url).searchParams;
  const re = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;
  const md = re.exec(p.get('desde') ?? '');
  const mf = re.exec(p.get('fins') ?? '');
  if (!md || !mf) return badRequest('Rang no vàlid (YYYY-MM o YYYY-MM-DD)');

  // Sense dia: el rang cobreix els mesos sencers.
  const start = new Date(Number(md[1]), Number(md[2]) - 1, md[3] ? Number(md[3]) : 1);
  const end = mf[3]
    ? new Date(Number(mf[1]), Number(mf[2]) - 1, Number(mf[3]), 23, 59, 59, 999)
    : new Date(Number(mf[1]), Number(mf[2]), 0, 23, 59, 59, 999);
  if (end < start) return badRequest('La data final ha de ser anterior a la inicial');

  const fmt = (m: RegExpExecArray) => (m[3] ? `${m[3]}/${m[2]}/${m[1]}` : `${m[2]}/${m[1]}`);
  return ok({
    mes: `${fmt(md)} … ${fmt(mf)}`,
    desde: p.get('desde'),
    fins: p.get('fins'),
    ...(await getBalancDetall(start, end, { excloureMetodeAltres: teVistaRestringida(auth) })),
  });
}

export const dynamic = 'force-dynamic';
