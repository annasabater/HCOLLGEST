import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { addDays, endOfToday } from '@/lib/dates';

interface Item { article: string; qty: number }
interface Seleccio { manteniment?: Item[]; sortida?: Item[] }

// GET /api/bugaderia/mensual?mes=YYYY-MM
// Total estimat de bugaderia del mes: un REPÀS (manteniment) per setmana mentre
// l'hoste hi és, més la SORTIDA al checkout. Cada neteja compta al mes en què
// passa (no es compten neteges futures). Serveix per comprovar la factura mensual
// de la bugaderia (la Mireia).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const mes = new URL(req.url).searchParams.get('mes'); // YYYY-MM
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return badRequest('Cal el paràmetre mes=YYYY-MM');
    const [y, m] = mes.split('-').map(Number);
    const start = new Date(y!, m! - 1, 1, 0, 0, 0, 0);
    const end = new Date(y!, m!, 0, 23, 59, 59, 999);
    // No comptar neteges futures: sostre = mín(final del mes, avui).
    const avui = endOfToday();
    const sostre = end.getTime() < avui.getTime() ? end : avui;

    const [articles, estades] = await Promise.all([
      prisma.articleBugaderia.findMany({ where: { deletedAt: null }, select: { nom: true, preu: true } }),
      prisma.estancia.findMany({
        // Estades que solapen el mes (van entrar abans del final del mes).
        where: { deletedAt: null, estat: { not: 'CANCELLADA' }, dataEntrada: { not: null, lte: end } },
        select: {
          id: true, dataEntrada: true, dataSortida: true, dataSortidaPrevista: true, bugaderia: true,
          habitacio: { select: { nom: true } },
          viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true } } } },
        },
      }),
    ]);

    const preu = new Map(articles.map((a) => [a.nom, Number(a.preu)]));
    const totalDe = (items?: Item[]) =>
      Math.round((items ?? []).reduce((s, i) => s + (preu.get(i.article) ?? 0) * i.qty, 0) * 100) / 100;
    const dins = (d: Date) => d.getTime() >= start.getTime() && d.getTime() <= end.getTime() && d.getTime() <= sostre.getTime();

    const detall = estades
      .filter((e) => e.bugaderia != null && e.dataEntrada != null)
      .map((e) => {
        const sel = (e.bugaderia as Seleccio | null) ?? {};
        const costMant = totalDe(sel.manteniment);
        const costSort = totalDe(sel.sortida);
        const entrada = e.dataEntrada!;
        // Fi de l'ocupació per generar repassos: sortida real, o prevista, o avui (si segueix).
        const fiOcupacio = e.dataSortida ?? e.dataSortidaPrevista ?? avui;

        // Un repàs cada 7 dies des de l'entrada, mentre encara hi és (< fiOcupacio).
        let repassos = 0;
        for (let d = addDays(entrada, 7); d.getTime() < fiOcupacio.getTime(); d = addDays(d, 7)) {
          if (dins(d)) repassos += 1;
        }
        // La sortida compta si l'hoste ja ha marxat aquest mes.
        const sortidaComptada = e.dataSortida != null && dins(e.dataSortida);

        const mant = Math.round(repassos * costMant * 100) / 100;
        const sort = sortidaComptada ? costSort : 0;
        const h = e.viatgers[0]?.huesped;
        return {
          id: e.id,
          titular: h ? `${h.nom} ${h.cognom1}` : '—',
          habitacio: e.habitacio?.nom ?? null,
          dataSortida: e.dataSortida?.toISOString() ?? null,
          repassos,
          sortidaComptada,
          manteniment: mant,
          sortida: sort,
          total: Math.round((mant + sort) * 100) / 100,
        };
      })
      .filter((r) => r.total > 0 || r.repassos > 0 || r.sortidaComptada)
      .sort((a, b) => (a.dataSortida ?? '9999').localeCompare(b.dataSortida ?? '9999'));

    const total = Math.round(detall.reduce((s, d) => s + d.total, 0) * 100) / 100;

    return ok({ mes, total, detall });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
