/**
 * Resumen del tauler (§2.4 + Fase 7): alertas de lo legalmente urgente
 * (envíos/firmas pendientes, errores) + KPIs financieros (ingresos, gastos,
 * beneficio, ocupación) + alertas de facturas pendientes y activos.
 */
import 'server-only';
import { prisma } from '../db';
import { computeActiuInfo } from '../actiu-alerts';

export interface FinanceOpts {
  /**
   * Exclou el mètode de cobrament ALTRES de totes les xifres d'ingressos
   * (cobraments i dipòsits retinguts). Per a comptes amb vista restringida.
   */
  excloureMetodeAltres?: boolean;
}

/** Filtre Prisma de mètode segons les opcions (buit si no s'exclou res). */
function metodeFiltre(opts?: FinanceOpts): { metode?: { not: 'ALTRES' } } {
  return opts?.excloureMetodeAltres ? { metode: { not: 'ALTRES' } } : {};
}

export async function getResum(opts?: FinanceOpts) {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const [
    pendentsEnviament,
    pendentsFirmaCount,
    enviamentsError,
    properesEntrades,
    properesSortides,
    totalHostes,
    totalEstancies,
    ingressosMes,
    ingressosAny,
    despesesMes,
    despesesAny,
    facturesPendents,
    actius,
    habitacionsCount,
    enCursCount,
    personalMesAgg,
    dipositsCustodiaAgg,
    dipositsRetingutsMesAgg,
  ] = await Promise.all([
    prisma.estancia.findMany({
      where: {
        deletedAt: null,
        estat: { in: ['EN_CURS', 'RESERVA'] },
        enviaments: { none: { estat: { in: ['ENVIAT', 'ACCEPTAT'] } } },
      },
      orderBy: { dataEntrada: 'asc' },
      take: 20,
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true } } },
    }),
    prisma.estanciaViatger.count({
      where: { signatura: { is: null }, estancia: { estat: 'EN_CURS', deletedAt: null } },
    }),
    prisma.enviamentMossos.findMany({
      where: { estat: { in: ['ERROR', 'REBUTJAT'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { estancia: true },
    }),
    prisma.estancia.findMany({
      where: { deletedAt: null, dataEntrada: { gte: now, lte: in7 } },
      orderBy: { dataEntrada: 'asc' },
      take: 10,
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true } }, habitacio: true },
    }),
    prisma.estancia.findMany({
      where: { deletedAt: null, dataSortida: { gte: now, lte: in7 } },
      orderBy: { dataSortida: 'asc' },
      take: 10,
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true } }, habitacio: true },
    }),
    prisma.huesped.count({ where: { deletedAt: null } }),
    prisma.estancia.count({ where: { deletedAt: null } }),
    prisma.cobrament.aggregate({
      _sum: { import: true },
      where: { data: { gte: monthStart, lte: monthEnd }, factura: { deletedAt: null }, ...metodeFiltre(opts) },
    }),
    prisma.cobrament.aggregate({
      _sum: { import: true },
      where: { data: { gte: yearStart, lte: yearEnd }, factura: { deletedAt: null }, ...metodeFiltre(opts) },
    }),
    prisma.gasto.aggregate({ _sum: { import: true }, where: { deletedAt: null, data: { gte: monthStart, lte: monthEnd } } }),
    prisma.gasto.aggregate({ _sum: { import: true }, where: { deletedAt: null, data: { gte: yearStart, lte: yearEnd } } }),
    prisma.factura.findMany({ where: { deletedAt: null, estat: 'PENDENT' }, select: { total: true } }),
    prisma.actiu.findMany({
      where: { deletedAt: null },
      select: { dataCompra: true, garantiaFins: true, estat: true },
    }),
    prisma.habitacio.count({ where: { deletedAt: null } }),
    prisma.estancia.count({ where: { deletedAt: null, estat: 'EN_CURS' } }),
    prisma.jornada.aggregate({ _sum: { import: true }, where: { data: { gte: monthStart, lte: monthEnd } } }),
    prisma.diposit.aggregate({ _sum: { import: true }, where: { estat: 'EN_CUSTODIA' } }),
    prisma.diposit.aggregate({
      _sum: { import: true },
      where: { estat: 'RETINGUT', dataResolucio: { gte: monthStart, lte: monthEnd }, ...metodeFiltre(opts) },
    }),
  ]);

  const num = (d: { _sum: { import: unknown } }) => Number(d._sum.import ?? 0);
  // Ingressos del mes = cobraments + dipòsits retinguts aquest mes (passen a ingrés).
  const ingMes = num(ingressosMes) + num(dipositsRetingutsMesAgg);
  const despMes = num(despesesMes);
  const personalMes = num(personalMesAgg);
  const dipositsCustodia = num(dipositsCustodiaAgg);

  const facturesPendentsTotal = facturesPendents.reduce((a, f) => a + Number(f.total), 0);
  const actiusAlerta = actius.filter((a) => computeActiuInfo(a, now).alerta).length;
  const ocupacio = habitacionsCount > 0 ? Math.round((enCursCount / habitacionsCount) * 100) : 0;

  return {
    pendentsEnviament,
    pendentsFirmaCount,
    enviamentsError,
    properesEntrades,
    properesSortides,
    totals: { hostes: totalHostes, estancies: totalEstancies },
    finances: {
      ingressosMes: ingMes,
      ingressosAny: num(ingressosAny),
      despesesMes: despMes,
      despesesAny: num(despesesAny),
      beneficiMes: Math.round((ingMes - despMes) * 100) / 100,
      ocupacio,
      personalMes,
      dipositsCustodia,
    },
    alertes: {
      facturesPendents: facturesPendents.length,
      facturesPendentsTotal,
      actiusAlerta,
    },
  };
}

export type Resum = Awaited<ReturnType<typeof getResum>>;

/**
 * Balanç de caixa d'un mes: ingressos (cobraments + dipòsits retinguts),
 * retencions en custòdia, i el total amb retencions, més despeses i benefici.
 */
export async function getBalanc(monthStart: Date, monthEnd: Date, opts?: FinanceOpts) {
  const [cobramentsAgg, retingutsAgg, custodiaAgg, despesesAgg, personalAgg] = await Promise.all([
    prisma.cobrament.aggregate({
      _sum: { import: true },
      where: { data: { gte: monthStart, lte: monthEnd }, factura: { deletedAt: null }, ...metodeFiltre(opts) },
    }),
    prisma.diposit.aggregate({
      _sum: { import: true },
      where: { estat: 'RETINGUT', dataResolucio: { gte: monthStart, lte: monthEnd }, ...metodeFiltre(opts) },
    }),
    prisma.diposit.aggregate({
      _sum: { import: true },
      where: { estat: 'EN_CUSTODIA', data: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.gasto.aggregate({
      _sum: { import: true },
      where: { deletedAt: null, data: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.jornada.aggregate({ _sum: { import: true }, where: { data: { gte: monthStart, lte: monthEnd } } }),
  ]);

  const num = (d: { _sum: { import: unknown } }) => Number(d._sum.import ?? 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const cobraments = num(cobramentsAgg);
  const retinguts = num(retingutsAgg); // dipòsits retinguts → ja són ingrés
  const retencions = num(custodiaAgg); // dipòsits en custòdia (no són ingrés)
  const ingressos = r2(cobraments + retinguts);
  const despeses = num(despesesAgg);
  const personal = num(personalAgg);

  return {
    cobraments,
    retinguts,
    ingressos, // el que NO es reté (ingrés real)
    retencions, // el que es reté (en custòdia)
    ingressosAmbRetencions: r2(ingressos + retencions),
    despeses,
    personal,
    benefici: r2(ingressos - despeses - personal),
  };
}

export type Balanc = Awaited<ReturnType<typeof getBalanc>>;

/**
 * Balanç DETALLAT d'un període: a més dels totals, desglossa els ingressos per
 * mètode de cobrament i les despeses per categoria.
 */
export async function getBalancDetall(start: Date, end: Date, opts?: FinanceOpts) {
  const num = (v: unknown) => Number(v ?? 0);
  const endExcl = new Date(end.getTime() + 1);
  const [base, cobMetode, dipMetode, gastoCat, categories, habCount, estades, roomRevAgg] =
    await Promise.all([
      getBalanc(start, end, opts),
      prisma.cobrament.groupBy({
        by: ['metode'],
        _sum: { import: true },
        where: { data: { gte: start, lte: end }, factura: { deletedAt: null }, ...metodeFiltre(opts) },
      }),
      prisma.diposit.groupBy({
        by: ['metode'],
        _sum: { import: true },
        where: { estat: 'RETINGUT', dataResolucio: { gte: start, lte: end }, ...metodeFiltre(opts) },
      }),
      prisma.gasto.groupBy({
        by: ['categoriaId'],
        _sum: { import: true },
        where: { deletedAt: null, data: { gte: start, lte: end } },
      }),
      prisma.categoriaGasto.findMany({ select: { id: true, nom: true } }),
      prisma.habitacio.count({ where: { deletedAt: null } }),
      prisma.estancia.findMany({
        where: { deletedAt: null, habitacioId: { not: null }, dataEntrada: { lt: endExcl }, dataSortida: { gt: start } },
        select: { dataEntrada: true, dataSortida: true },
      }),
      prisma.liniaFactura.aggregate({
        _sum: { import: true },
        where: { concepte: 'ALLOTJAMENT', factura: { deletedAt: null, data: { gte: start, lte: end } } },
      }),
    ]);

  // KPIs hotelers: ocupació mitjana, ADR (preu mitjà per nit ocupada), RevPAR.
  const dies = Math.max(1, Math.round((endExcl.getTime() - start.getTime()) / 86_400_000));
  const nitsDisponibles = habCount * dies;
  let nitsOcupades = 0;
  for (const e of estades) {
    const s = e.dataEntrada > start ? e.dataEntrada : start;
    const f = e.dataSortida < endExcl ? e.dataSortida : endExcl;
    const n = Math.round((f.getTime() - s.getTime()) / 86_400_000);
    if (n > 0) nitsOcupades += n;
  }
  const roomRev = num(roomRevAgg._sum.import);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const ocupacio = nitsDisponibles > 0 ? Math.round((nitsOcupades / nitsDisponibles) * 100) : 0;
  const adr = nitsOcupades > 0 ? r2(roomRev / nitsOcupades) : 0;
  const revpar = nitsDisponibles > 0 ? r2(roomRev / nitsDisponibles) : 0;

  const metodesBase = ['EFECTIU', 'TARGETA', 'TRANSFERENCIA', 'BIZUM', 'ALTRES'] as const;
  // Vista restringida: el mètode ALTRES no apareix ni al desglossament.
  const metodes = opts?.excloureMetodeAltres ? metodesBase.filter((m) => m !== 'ALTRES') : metodesBase;
  const ingressosPerMetode: Record<string, number> = Object.fromEntries(metodes.map((m) => [m, 0]));
  for (const c of cobMetode) ingressosPerMetode[c.metode] = num(c._sum.import);
  for (const d of dipMetode)
    ingressosPerMetode[d.metode] = (ingressosPerMetode[d.metode] ?? 0) + num(d._sum.import);

  const catMap = new Map(categories.map((c) => [c.id, c.nom]));
  const despesesPerCategoria = gastoCat
    .map((g) => ({ categoria: catMap.get(g.categoriaId) ?? '—', import: num(g._sum.import) }))
    .filter((x) => x.import !== 0)
    .sort((a, b) => b.import - a.import);

  return { ...base, ingressosPerMetode, despesesPerCategoria, ocupacio, adr, revpar };
}

export type BalancDetall = Awaited<ReturnType<typeof getBalancDetall>>;

/** Balanç dels 12 mesos d'un any + totals. */
export async function getBalancAny(year: number, opts?: FinanceOpts) {
  const mesos: ({ mes: number } & Balanc)[] = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
    mesos.push({ mes: m + 1, ...(await getBalanc(start, end, opts)) });
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const sum = (k: keyof Balanc) => r2(mesos.reduce((a, x) => a + (x[k] as number), 0));
  const detall = await getBalancDetall(new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59, 999), opts);
  // Totals de l'any anterior (per a la comparativa de variació %).
  const prev = await getBalanc(new Date(year - 1, 0, 1), new Date(year - 1, 11, 31, 23, 59, 59, 999), opts);
  return {
    any: year,
    mesos,
    totals: {
      ingressos: sum('ingressos'),
      retencions: sum('retencions'),
      ingressosAmbRetencions: sum('ingressosAmbRetencions'),
      despeses: sum('despeses'),
      personal: sum('personal'),
      benefici: sum('benefici'),
    },
    ingressosPerMetode: detall.ingressosPerMetode,
    despesesPerCategoria: detall.despesesPerCategoria,
    ocupacio: detall.ocupacio,
    adr: detall.adr,
    revpar: detall.revpar,
    anterior: {
      ingressos: prev.ingressos,
      despeses: prev.despeses,
      personal: prev.personal,
      benefici: prev.benefici,
    },
  };
}

export type BalancAny = Awaited<ReturnType<typeof getBalancAny>>;
