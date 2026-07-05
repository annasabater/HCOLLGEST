import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { badRequest, ok } from '@/lib/http';
import { getBalanc } from '@/lib/services/dashboard';
import { teVistaRestringida } from '@/lib/auth/restriccions';

// GET /api/balanc/mesos?desde=YYYY-MM&fins=YYYY-MM
// Sèrie mes a mes (ingressos, fiança, despeses, personal, benefici) per a gràfiques.
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;

  const p = new URL(req.url).searchParams;
  const md = /^(\d{4})-(\d{2})$/.exec(p.get('desde') ?? '');
  const mf = /^(\d{4})-(\d{2})$/.exec(p.get('fins') ?? '');
  if (!md || !mf) return badRequest('Rang no vàlid (YYYY-MM)');

  const start = { y: Number(md[1]), m: Number(md[2]) - 1 };
  const end = { y: Number(mf[1]), m: Number(mf[2]) - 1 };
  const nMesos = (end.y - start.y) * 12 + (end.m - start.m) + 1;
  if (nMesos < 1 || nMesos > 24) return badRequest('Rang fora de límits (1–24 mesos)');

  const opts = { excloureMetodeAltres: teVistaRestringida(auth) };
  const mesos = [];
  for (let i = 0; i < nMesos; i++) {
    const y = start.y + Math.floor((start.m + i) / 12);
    const m = (start.m + i) % 12;
    const b = await getBalanc(new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59, 999), opts);
    mesos.push({
      any: y,
      mes: m + 1,
      ingressos: b.ingressos,
      retencions: b.retencions,
      ingressosAmbRetencions: b.ingressosAmbRetencions,
      despeses: b.despeses,
      personal: b.personal,
      benefici: b.benefici,
    });
  }

  return ok({ mesos });
}

export const dynamic = 'force-dynamic';
