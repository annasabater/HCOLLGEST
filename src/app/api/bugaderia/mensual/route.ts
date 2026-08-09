import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError } from '@/lib/http';

interface Item { article: string; qty: number }
interface Seleccio { manteniment?: Item[]; sortida?: Item[] }

// GET /api/bugaderia/mensual?mes=YYYY-MM
// Total estimat de bugaderia del mes: suma, per cada estada que fa SORTIDA aquell
// mes, els articles de manteniment + sortida (segons el catàleg de preus). Serveix
// per comprovar la factura mensual de la bugaderia (la Mireia).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const mes = new URL(req.url).searchParams.get('mes'); // YYYY-MM
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return badRequest('Cal el paràmetre mes=YYYY-MM');
    const [y, m] = mes.split('-').map(Number);
    const start = new Date(y!, m! - 1, 1, 0, 0, 0, 0);
    const end = new Date(y!, m!, 0, 23, 59, 59, 999);

    const [articles, estades] = await Promise.all([
      prisma.articleBugaderia.findMany({ where: { deletedAt: null }, select: { nom: true, preu: true } }),
      prisma.estancia.findMany({
        where: { deletedAt: null, estat: { not: 'CANCELLADA' }, dataSortida: { gte: start, lte: end } },
        select: {
          id: true, dataSortida: true, bugaderia: true,
          habitacio: { select: { nom: true } },
          viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true } } } },
        },
      }),
    ]);

    const preu = new Map(articles.map((a) => [a.nom, Number(a.preu)]));
    const totalDe = (items?: Item[]) =>
      Math.round((items ?? []).reduce((s, i) => s + (preu.get(i.article) ?? 0) * i.qty, 0) * 100) / 100;

    const detall = estades
      .filter((e) => e.bugaderia != null)
      .map((e) => {
      const sel = (e.bugaderia as Seleccio | null) ?? {};
      const mant = totalDe(sel.manteniment);
      const sort = totalDe(sel.sortida);
      const h = e.viatgers[0]?.huesped;
      return {
        id: e.id,
        titular: h ? `${h.nom} ${h.cognom1}` : '—',
        habitacio: e.habitacio?.nom ?? null,
        dataSortida: e.dataSortida?.toISOString() ?? null,
        manteniment: mant,
        sortida: sort,
        total: Math.round((mant + sort) * 100) / 100,
      };
    });
    const total = Math.round(detall.reduce((s, d) => s + d.total, 0) * 100) / 100;

    return ok({ mes, total, detall });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
