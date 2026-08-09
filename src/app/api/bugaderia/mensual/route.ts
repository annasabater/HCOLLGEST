import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError } from '@/lib/http';

interface Item { article: string; qty: number }

// GET /api/bugaderia/mensual?mes=YYYY-MM
// Total de bugaderia del mes: suma els articles marcats a les TASQUES DE NETEJA
// d'aquell mes (opt-in). Només compta el que s'ha marcat de veritat que fa la
// persona de neteja. Serveix per comprovar la factura mensual (la Mireia).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const mes = new URL(req.url).searchParams.get('mes'); // YYYY-MM
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return badRequest('Cal el paràmetre mes=YYYY-MM');
    const [y, m] = mes.split('-').map(Number);
    const start = new Date(y!, m! - 1, 1, 0, 0, 0, 0);
    const end = new Date(y!, m!, 0, 23, 59, 59, 999);

    const [articles, tasques] = await Promise.all([
      prisma.articleBugaderia.findMany({ where: { deletedAt: null }, select: { nom: true, preu: true } }),
      prisma.tascaNeteja.findMany({
        where: { data: { gte: start, lte: end } },
        select: { id: true, data: true, tipus: true, bugaderia: true, habitacio: { select: { nom: true } } },
        orderBy: { data: 'asc' },
      }),
    ]);

    // Normalitza (NFC) el nom per casar preus encara que la codificació Unicode
    // dels accents difereixi entre l'article desat i el catàleg.
    const clau = (s: string) => s.normalize('NFC');
    const preu = new Map(articles.map((a) => [clau(a.nom), Number(a.preu)]));
    const totalDe = (items?: Item[]) =>
      Math.round((items ?? []).reduce((s, i) => s + (preu.get(clau(i.article)) ?? 0) * i.qty, 0) * 100) / 100;

    const detall = tasques
      .filter((t) => Array.isArray(t.bugaderia) && (t.bugaderia as unknown[]).length > 0)
      .map((t) => {
        const items = t.bugaderia as unknown as Item[];
        return {
          id: t.id,
          data: t.data.toISOString(),
          habitacio: t.habitacio?.nom ?? null,
          tipus: t.tipus as 'CANVI_COMPLET' | 'REPAS',
          articles: items.map((i) => `${i.qty}× ${i.article}`).join(', '),
          total: totalDe(items),
        };
      })
      .filter((r) => r.total > 0);

    const total = Math.round(detall.reduce((s, d) => s + d.total, 0) * 100) / 100;

    return ok({ mes, total, detall });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
