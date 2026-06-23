import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { badRequest } from '@/lib/http';
import { getBalancDetall, getBalancAny, getBalancSituacio } from '@/lib/services/dashboard';
import { buildReportPdf, type ReportSection } from '@/lib/pdf/report';
import { METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';
import { teVistaRestringida } from '@/lib/auth/restriccions';

const MESOS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
const marge = (b: number, i: number) => (i > 0 ? `${Math.round((b / i) * 100)}%` : '—');
const metodeKv = (perMetode: Record<string, number>): [string, string][] =>
  Object.entries(perMetode)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => [METODE_COBRAMENT_LABELS[k as keyof typeof METODE_COBRAMENT_LABELS] ?? k, eur(v)]);
const variacio = (cur: number, prev: number) =>
  prev > 0 ? `${cur - prev >= 0 ? '+' : ''}${Math.round(((cur - prev) / prev) * 100)}%` : '—';

// GET /api/balanc/pdf?mes=YYYY-MM | ?any=YYYY — informe PDF del balanç (ADMIN)
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;
  const opts = { excloureMetodeAltres: teVistaRestringida(auth) };

  const sp = new URL(req.url).searchParams;
  const mesParam = sp.get('mes');
  const anyParam = sp.get('any');
  const situacioParam = sp.get('situacio');

  let title: string;
  let sections: ReportSection[];

  if (situacioParam !== null) {
    let dataTall = new Date();
    if (situacioParam) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(situacioParam);
      if (!m) return badRequest('Data no vàlida (YYYY-MM-DD)');
      dataTall = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
    }
    const b = await getBalancSituacio(dataTall);
    title = `Balanç de situació ${b.data}`;
    sections = [
      {
        heading: 'Actiu',
        kv: [
          ['ACTIU NO CORRENT', eur(b.actiu.noCorrent.immobilitzatBrut)],
          [`   Immobilitzat material (valor brut, ${b.detall.nActius} actius)`, eur(b.actiu.noCorrent.immobilitzatBrut)],
          ['ACTIU CORRENT', eur(b.actiu.corrent.deutors + b.actiu.corrent.tresoreriaFiances)],
          [`   Deutors comercials (${b.detall.nFacturesPendents} factures pendents)`, eur(b.actiu.corrent.deutors)],
          ['   Tresoreria - efectiu de fiances en dipòsit', eur(b.actiu.corrent.tresoreriaFiances)],
          ['TOTAL ACTIU', eur(b.actiu.total)],
        ],
      },
      {
        heading: 'Patrimoni net i passiu',
        kv: [
          ['PATRIMONI NET', eur(b.patrimoniIPassiu.patrimoniNet)],
          ['   Patrimoni net (figura de quadre)', eur(b.patrimoniIPassiu.patrimoniNet)],
          ['PASSIU NO CORRENT', eur(b.patrimoniIPassiu.passiuNoCorrent)],
          ['PASSIU CORRENT', eur(b.patrimoniIPassiu.passiuCorrent.fiances)],
          [`   Fiances rebudes a retornar (${b.detall.nDiposits} dipòsits)`, eur(b.patrimoniIPassiu.passiuCorrent.fiances)],
          ['TOTAL PATRIMONI NET I PASSIU', eur(b.patrimoniIPassiu.total)],
        ],
      },
      {
        heading: 'Advertiment: balanç aproximat (no fiscal)',
        kv: b.mancances.map((m) => ['No inclòs', m] as [string, string]),
      },
    ];
  } else if (anyParam) {
    if (!/^\d{4}$/.test(anyParam)) return badRequest('Any no vàlid');
    const b = await getBalancAny(Number(anyParam), opts);
    title = `Balanç ${b.any}`;
    sections = [
      {
        heading: 'Resum anual',
        kv: [
          ['Ingressos', `${eur(b.totals.ingressos)}   (${variacio(b.totals.ingressos, b.anterior.ingressos)} vs ${b.any - 1})`],
          ['Despeses', `${eur(b.totals.despeses)}   (${variacio(b.totals.despeses, b.anterior.despeses)} vs ${b.any - 1})`],
          ['Personal', eur(b.totals.personal)],
          ['Benefici', `${eur(b.totals.benefici)}   (${variacio(b.totals.benefici, b.anterior.benefici)} vs ${b.any - 1})`],
          ['Marge', marge(b.totals.benefici, b.totals.ingressos)],
          ['Dipòsits en custòdia', eur(b.totals.retencions)],
        ],
      },
      {
        heading: 'Detall mensual',
        table: {
          headers: ['Mes', 'Ingressos', 'Retencions', 'Ing.+ret.', 'Despeses', 'Personal', 'Benefici'],
          rows: b.mesos.map((m) => [
            MESOS[m.mes - 1]!,
            eur(m.ingressos),
            eur(m.retencions),
            eur(m.ingressosAmbRetencions),
            eur(m.despeses),
            eur(m.personal),
            eur(m.benefici),
          ]),
          total: ['TOTAL', eur(b.totals.ingressos), eur(b.totals.retencions), eur(b.totals.ingressosAmbRetencions), eur(b.totals.despeses), eur(b.totals.personal), eur(b.totals.benefici)],
        },
      },
      { heading: 'Ingressos per mètode', kv: metodeKv(b.ingressosPerMetode) },
      { heading: 'Despeses per categoria', kv: b.despesesPerCategoria.map((d) => [d.categoria, eur(d.import)] as [string, string]) },
    ];
  } else {
    const m = mesParam ? /^(\d{4})-(\d{2})$/.exec(mesParam) : null;
    const now = new Date();
    const year = m ? Number(m[1]) : now.getFullYear();
    const month = m ? Number(m[2]) - 1 : now.getMonth();
    if (mesParam && !m) return badRequest('Mes no vàlid (YYYY-MM)');
    const b = await getBalancDetall(new Date(year, month, 1), new Date(year, month + 1, 0, 23, 59, 59, 999), opts);
    title = `Balanç ${year}-${String(month + 1).padStart(2, '0')}`;
    sections = [
      {
        heading: 'Resum del mes',
        kv: [
          ['Ingressos (sense retencions)', eur(b.ingressos)],
          ['Ingressos + retencions', eur(b.ingressosAmbRetencions)],
          ['Despeses', eur(b.despeses)],
          ['Personal', eur(b.personal)],
          ['Benefici', eur(b.benefici)],
          ['Marge', marge(b.benefici, b.ingressos)],
          ['Dipòsits en custòdia', eur(b.retencions)],
        ],
      },
      { heading: 'Ingressos per mètode', kv: metodeKv(b.ingressosPerMetode) },
      { heading: 'Despeses per categoria', kv: b.despesesPerCategoria.map((d) => [d.categoria, eur(d.import)] as [string, string]) },
    ];
  }

  const pdf = await buildReportPdf(title, 'Hostal Coll · informe comptable', sections);
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${title.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
    },
  });
}

export const dynamic = 'force-dynamic';
