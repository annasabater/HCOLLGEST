/**
 * Resumen del tauler (§2.4 + Fase 7): alertas de lo legalmente urgente
 * (envíos/firmas pendientes, errores) + KPIs financieros (ingresos, gastos,
 * beneficio, ocupación) + alertas de facturas pendientes y activos.
 */
import 'server-only';
import { prisma } from '../db';
import { computeActiuInfo } from '../actiu-alerts';
import { generarDespesesVencudes } from './serveis-recurrents';

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

interface EfectiuRow {
  import: number;
  metode: string;
  data: Date; // data del cobrament/dipòsit (quan van pagar)
  estancia: {
    id: string;
    dataEntrada: Date | null;
    dataSortida: Date | null;
    habitacio: { nom: string } | null;
    viatgers: { huesped: { nom: string; cognom1: string } | null }[];
  } | null;
}

const titularSelDash = {
  select: {
    id: true,
    dataEntrada: true,
    dataSortida: true,
    habitacio: { select: { nom: true } },
    viatgers: {
      where: { esTitular: true },
      take: 1,
      select: { huesped: { select: { nom: true, cognom1: true } } },
    },
  },
} as const;

/**
 * Cobraments "efectius" d'un rang de dates: si un cobrament té desglossament
 * manual per període (CobramentPeriode — p. ex. un pagament del 5/7 que cobreix
 * juliol i agost), només compta la part dels períodes que se superposen amb
 * el rang consultat; si no en té, compta tot l'import quan `data` hi cau (com
 * sempre). Així la comptabilitat mensual reflecteix el mes de l'estada, no el
 * dia en què es va cobrar.
 */
async function cobramentsEfectius(start: Date, end: Date, opts?: FinanceOpts): Promise<EfectiuRow[]> {
  const rows = await prisma.cobrament.findMany({
    where: {
      estancia: { deletedAt: null },
      OR: [{ facturaId: null }, { factura: { deletedAt: null } }],
      ...metodeFiltre(opts),
      AND: [
        {
          OR: [
            { periodes: { none: {} }, data: { gte: start, lte: end } },
            { periodes: { some: { dataInici: { lte: end }, dataFi: { gte: start } } } },
          ],
        },
      ],
    },
    select: { import: true, metode: true, data: true, periodes: { select: { dataInici: true, dataFi: true, import: true } }, estancia: titularSelDash },
  });
  return rows
    .map((c) => ({
      import:
        c.periodes.length > 0
          ? c.periodes.filter((p) => p.dataInici <= end && p.dataFi >= start).reduce((a, p) => a + Number(p.import), 0)
          : Number(c.import),
      metode: c.metode,
      data: c.data,
      estancia: c.estancia,
    }))
    .filter((c) => c.import !== 0);
}

/** Igual que `cobramentsEfectius`, però per als dipòsits RETINGUTS (que compten com a ingrés). */
async function dipositsRetingutsEfectius(start: Date, end: Date, opts?: FinanceOpts): Promise<EfectiuRow[]> {
  const rows = await prisma.diposit.findMany({
    where: {
      estat: 'RETINGUT',
      estancia: { deletedAt: null },
      ...metodeFiltre(opts),
      AND: [
        {
          OR: [
            { periodes: { none: {} }, dataResolucio: { gte: start, lte: end } },
            { periodes: { some: { dataInici: { lte: end }, dataFi: { gte: start } } } },
          ],
        },
      ],
    },
    select: { import: true, metode: true, data: true, periodes: { select: { dataInici: true, dataFi: true, import: true } }, estancia: titularSelDash },
  });
  return rows
    .map((d) => ({
      import:
        d.periodes.length > 0
          ? d.periodes.filter((p) => p.dataInici <= end && p.dataFi >= start).reduce((a, p) => a + Number(p.import), 0)
          : Number(d.import),
      metode: d.metode,
      data: d.data,
      estancia: d.estancia,
    }))
    .filter((d) => d.import !== 0);
}

export async function getResum(opts?: FinanceOpts) {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const in30 = new Date(now.getTime() + 30 * 86_400_000);
  const in90 = new Date(now.getTime() + 90 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Posa al dia les despeses de serveis vençuts (no bloqueja el tauler si falla).
  try {
    await generarDespesesVencudes(now);
  } catch (err) {
    console.error('[tauler] generació de serveis:', err);
  }

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
    habitacionsOcupadesAra,
    personalMesAgg,
    dipositsCustodiaAgg,
    dipositsRetingutsMesAgg,
    serveisProxims,
    vigenciesProximes,
    benvingudesPendentsRaw,
    establimentBenv,
    sortidesTodayRaw,
  ] = await Promise.all([
    prisma.estancia.findMany({
      where: {
        deletedAt: null,
        estat: { in: ['EN_CURS', 'RESERVA'] },
        enviaments: { none: { estat: { in: ['ENVIAT', 'ACCEPTAT'] } } },
        avisMossosParat: false,
        // Les ampliacions NO compten com a pendents: els hostes ja es van
        // comunicar a Mossos en l'estada original (§4: no reenviar ja informats).
        estanciaOrigenId: null,
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
      where: { data: { gte: monthStart, lte: monthEnd }, estancia: { deletedAt: null }, OR: [{ facturaId: null }, { factura: { deletedAt: null } }], ...metodeFiltre(opts) },
    }),
    prisma.cobrament.aggregate({
      _sum: { import: true },
      where: { data: { gte: yearStart, lte: yearEnd }, estancia: { deletedAt: null }, OR: [{ facturaId: null }, { factura: { deletedAt: null } }], ...metodeFiltre(opts) },
    }),
    prisma.gasto.aggregate({ _sum: { import: true }, where: { deletedAt: null, esFianca: false, data: { gte: monthStart, lte: monthEnd } } }),
    prisma.gasto.aggregate({ _sum: { import: true }, where: { deletedAt: null, esFianca: false, data: { gte: yearStart, lte: yearEnd } } }),
    prisma.factura.findMany({ where: { deletedAt: null, estat: 'PENDENT' }, select: { total: true } }),
    prisma.actiu.findMany({
      where: { deletedAt: null },
      select: { dataCompra: true, garantiaFins: true, estat: true },
    }),
    prisma.habitacio.count({ where: { deletedAt: null } }),
    // Ocupació ACTUAL = habitacions amb una estada EN CURS que cobreix avui
    // (entrada ≤ ara < sortida) i amb habitació assignada. No n'hi ha prou amb
    // l'estat EN_CURS: cal que les dates incloguin avui (una estada EN_CURS amb
    // dates passades/futures, sense habitació, o cancel·lada/reserva, no compta).
    prisma.estancia.count({
      where: {
        deletedAt: null,
        estat: 'EN_CURS',
        habitacioId: { not: null },
        dataEntrada: { lte: now },
        dataSortida: { gt: now },
      },
    }),
    prisma.jornada.aggregate({ _sum: { import: true }, where: { data: { gte: monthStart, lte: monthEnd } } }),
    prisma.diposit.aggregate({
      _sum: { import: true },
      where: { estat: 'EN_CUSTODIA', estancia: { deletedAt: null } },
    }),
    prisma.diposit.aggregate({
      _sum: { import: true },
      where: {
        estat: 'RETINGUT',
        dataResolucio: { gte: monthStart, lte: monthEnd },
        estancia: { deletedAt: null },
        ...metodeFiltre(opts),
      },
    }),
    // Serveis/manteniments amb propera visita o renovació dins els pròxims 30 dies.
    prisma.serveiRecurrent.findMany({
      where: { deletedAt: null, actiu: true, properaData: { lte: in30 } },
      orderBy: { properaData: 'asc' },
      take: 20,
      include: { proveidor: { select: { nom: true } } },
    }),
    // Serveis amb vigència (assegurances, contractes…) a punt de caducar (≤ 90 dies) o ja caducada.
    prisma.serveiRecurrent.findMany({
      where: { deletedAt: null, actiu: true, vigenciaFi: { not: null, lte: in90 } },
      orderBy: { vigenciaFi: 'asc' },
      take: 20,
      include: { proveidor: { select: { nom: true } } },
    }),
    // Benvingudes pendents: estades que JA han passat la primera nit (entrada <
    // avui) però fa com a màxim 2 nits (si en porta més, ja no té sentit donar la
    // benvinguda), encara hi són (sortida ≥ avui), NO són ampliació i no s'han enviat.
    prisma.estancia.findMany({
      where: {
        deletedAt: null,
        benvingudaEnviada: false,
        estanciaOrigenId: null,
        dataEntrada: {
          gte: new Date(todayStart.getTime() - 2 * 24 * 60 * 60 * 1000),
          lt: todayStart,
        },
        dataSortida: { gte: todayStart },
      },
      orderBy: { dataEntrada: 'asc' },
      take: 20,
      include: {
        habitacio: { select: { nom: true } },
        viatgers: {
          orderBy: { esTitular: 'desc' },
          include: { huesped: { select: { id: true, nom: true, cognom1: true, telefon: true } } },
        },
      },
    }),
    prisma.establiment.findFirst({
      select: { benvingudaAutomatica: true, benvingudaTothom: true },
    }),
    prisma.estancia.findMany({
      where: {
        deletedAt: null,
        dataSortida: {
          gte: todayStart,
          lt: new Date(todayStart.getTime() + 86_400_000),
        },
      },
      orderBy: { dataSortida: 'asc' },
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true } }, habitacio: true },
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
  const ocupacio =
    habitacionsCount > 0 ? Math.round((Math.min(habitacionsOcupadesAra, habitacionsCount) / habitacionsCount) * 100) : 0;

  const serveisProximsList = serveisProxims.map((s) => ({
    id: s.id,
    activitat: s.activitat,
    proveidor: s.proveidor?.nom ?? null,
    properaData: s.properaData,
    import: s.importPrevist != null ? Number(s.importPrevist) : null,
    vencut: s.properaData < now,
  }));

  const vigenciesProximesList = vigenciesProximes.map((s) => ({
    id: s.id,
    activitat: s.activitat,
    proveidor: s.proveidor?.nom ?? null,
    vigenciaFi: s.vigenciaFi as Date,
    observacions: s.observacions,
    caducada: (s.vigenciaFi as Date) < now,
  }));

  const benvingudesPendents = benvingudesPendentsRaw.map((e) => ({
    id: e.id,
    habitacio: e.habitacio?.nom ?? null,
    dataEntrada: e.dataEntrada?.toISOString() ?? null,
    dataSortida: e.dataSortida?.toISOString() ?? null,
    viatgers: e.viatgers.map((v) => ({
      nom: v.huesped.nom,
      cognom1: v.huesped.cognom1,
      telefon: v.huesped.telefon,
      esTitular: v.esTitular,
      esMenor: v.esMenor,
    })),
  }));

  const sortidesToday = sortidesTodayRaw.map((e) => ({
    id: e.id,
    habitacio: e.habitacio?.nom ?? null,
    titular: e.viatgers[0]?.huesped
      ? `${e.viatgers[0].huesped.nom} ${e.viatgers[0].huesped.cognom1}`
      : '—',
  }));

  return {
    pendentsEnviament,
    pendentsFirmaCount,
    enviamentsError,
    properesEntrades,
    properesSortides,
    sortidesToday,
    serveisProxims: serveisProximsList,
    vigenciesProximes: vigenciesProximesList,
    benvingudes: {
      automatica: establimentBenv?.benvingudaAutomatica ?? false,
      tothom: establimentBenv?.benvingudaTothom ?? false,
      pendents: benvingudesPendents,
    },
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
      serveisProxims: serveisProximsList.length,
      vigenciesProximes: vigenciesProximesList.length,
    },
  };
}

export type Resum = Awaited<ReturnType<typeof getResum>>;

/**
 * Balanç de caixa d'un mes: ingressos (cobraments + dipòsits retinguts),
 * retencions en custòdia, i el total amb retencions, més despeses i benefici.
 */
export async function getBalanc(monthStart: Date, monthEnd: Date, opts?: FinanceOpts) {
  const [cobramentsRows, retingutsRows, custodiaAgg, despesesAgg, despesesFiancaAgg, personalAgg] = await Promise.all([
    cobramentsEfectius(monthStart, monthEnd, opts),
    dipositsRetingutsEfectius(monthStart, monthEnd, opts),
    prisma.diposit.aggregate({
      _sum: { import: true },
      where: { estat: 'EN_CUSTODIA', data: { gte: monthStart, lte: monthEnd }, estancia: { deletedAt: null } },
    }),
    prisma.gasto.aggregate({
      _sum: { import: true },
      where: { deletedAt: null, esFianca: false, data: { gte: monthStart, lte: monthEnd } },
    }),
    // Fiances/dipòsits PAGATS (esFianca): despeses recuperables, fora del benefici real.
    prisma.gasto.aggregate({
      _sum: { import: true },
      where: { deletedAt: null, esFianca: true, data: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.jornada.aggregate({ _sum: { import: true }, where: { data: { gte: monthStart, lte: monthEnd } } }),
  ]);

  const num = (d: { _sum: { import: unknown } }) => Number(d._sum.import ?? 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const cobraments = r2(cobramentsRows.reduce((a, c) => a + c.import, 0));
  const retinguts = r2(retingutsRows.reduce((a, d) => a + d.import, 0)); // dipòsits retinguts → ja són ingrés
  const retencions = num(custodiaAgg); // dipòsits en custòdia (no són ingrés)
  const ingressos = r2(cobraments + retinguts);
  const despeses = num(despesesAgg);
  const despesesFianca = num(despesesFiancaAgg); // fiances pagades (recuperables)
  const personal = num(personalAgg);

  // Detall dels dipòsits en custòdia del mes: de qui són i de quina estada.
  const custodiaRows = await prisma.diposit.findMany({
    where: { estat: 'EN_CUSTODIA', data: { gte: monthStart, lte: monthEnd }, estancia: { deletedAt: null } },
    orderBy: { data: 'desc' },
    include: {
      estancia: {
        select: {
          id: true,
          viatgers: {
            where: { esTitular: true },
            include: { huesped: { select: { nom: true, cognom1: true } } },
          },
        },
      },
    },
  });
  const custodiaDetall = custodiaRows.map((d) => {
    const h = d.estancia?.viatgers[0]?.huesped;
    return {
      id: d.id,
      import: Number(d.import),
      data: d.data.toISOString(),
      estanciaId: d.estancia?.id ?? null,
      titular: h ? `${h.nom} ${h.cognom1}` : 'Sense titular',
      motiu: d.motiu ?? null,
    };
  });

  const ingressosAmbRetencions = r2(ingressos + retencions);
  return {
    cobraments,
    retinguts,
    ingressos, // el que NO es reté (ingrés real)
    retencions, // el que es reté (en custòdia)
    ingressosAmbRetencions,
    despeses,
    despesesFianca, // fiances/dipòsits pagats (recuperables, fora del benefici real)
    personal,
    // Benefici real = Ingressos − Despeses (personal inclòs). La versió "+ fiança"
    // es mostra a part (benefici + retencions) perquè la fiança és retornable.
    benefici: r2(ingressos - despeses - personal),
    custodiaDetall, // de qui són els dipòsits en custòdia
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
  const [base, cobramentsRows, retingutsRows, gastoCat, categories, habCount, estades, roomRevAgg] =
    await Promise.all([
      getBalanc(start, end, opts),
      cobramentsEfectius(start, end, opts),
      dipositsRetingutsEfectius(start, end, opts),
      prisma.gasto.groupBy({
        by: ['categoriaId'],
        _sum: { import: true },
        where: { deletedAt: null, esFianca: false, data: { gte: start, lte: end } },
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
    if (!e.dataEntrada || !e.dataSortida) continue;
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
  for (const c of cobramentsRows) ingressosPerMetode[c.metode] = (ingressosPerMetode[c.metode] ?? 0) + c.import;
  for (const d of retingutsRows) ingressosPerMetode[d.metode] = (ingressosPerMetode[d.metode] ?? 0) + d.import;

  const catMap = new Map(categories.map((c) => [c.id, c.nom]));
  const despesesPerCategoria = gastoCat
    .map((g) => ({ categoria: catMap.get(g.categoriaId) ?? '—', import: num(g._sum.import) }))
    .filter((x) => x.import !== 0)
    .sort((a, b) => b.import - a.import);

  // Agrupa els moviments per estada/titular: ingressos (+) i devolucions (−),
  // amb l'habitació, el període d'estada i les dates en què van pagar.
  interface MovPersona {
    estanciaId: string | null;
    titular: string;
    ingressos: number;
    devolucions: number;
    fianca: number; // part de l'ingrés que ve d'una fiança retinguda
    habitacio: string | null;
    dataEntrada: string | null;
    dataSortida: string | null;
    datesPagament: string[]; // ISO, dates dels ingressos (sense devolucions)
  }
  const perPersona = new Map<string, MovPersona>();
  const afegeixMov = (row: EfectiuRow, esFianca = false) => {
    const est = row.estancia;
    const key = est?.id ?? '—';
    const h = est?.viatgers[0]?.huesped;
    const cur =
      perPersona.get(key) ??
      ({
        estanciaId: est?.id ?? null,
        titular: h ? `${h.nom} ${h.cognom1}` : 'Sense titular',
        ingressos: 0,
        devolucions: 0,
        fianca: 0,
        habitacio: est?.habitacio?.nom ?? null,
        dataEntrada: est?.dataEntrada ? est.dataEntrada.toISOString() : null,
        dataSortida: est?.dataSortida ? est.dataSortida.toISOString() : null,
        datesPagament: [],
      } satisfies MovPersona);
    if (row.import >= 0) {
      cur.ingressos = r2(cur.ingressos + row.import);
      if (esFianca) cur.fianca = r2(cur.fianca + row.import);
      const dia = row.data.toISOString().slice(0, 10);
      if (!cur.datesPagament.some((d) => d.slice(0, 10) === dia)) cur.datesPagament.push(row.data.toISOString());
    } else {
      cur.devolucions = r2(cur.devolucions + Math.abs(row.import));
    }
    perPersona.set(key, cur);
  };
  for (const c of cobramentsRows) afegeixMov(c);
  for (const d of retingutsRows) afegeixMov(d, true); // dipòsits retinguts = fiança
  for (const m of perPersona.values()) m.datesPagament.sort();
  const movimentsPerPersona = [...perPersona.values()].sort(
    (a, b) => b.ingressos - b.devolucions - (a.ingressos - a.devolucions),
  );

  return { ...base, ingressosPerMetode, despesesPerCategoria, ocupacio, adr, revpar, movimentsPerPersona };
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
      despesesFianca: sum('despesesFianca'),
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

/**
 * BALANÇ DE SITUACIÓ (estat patrimonial) a una data de tall.
 *
 * ⚠️ Limitació important: és un balanç APROXIMAT construït amb les dades que el
 * PMS coneix de veritat; NO és un balanç fiscal de doble partida. El patrimoni
 * net es calcula com a figura de quadre (Actiu − Passiu), de manera que SEMPRE
 * quadra per construcció. El que NO es pot derivar de les dades actuals queda
 * llistat a `mancances` (amortitzacions, tresoreria bancària, creditors, IVA,
 * saldos d'obertura…). Per defecte la data de tall és avui.
 *
 * Partides amb dada real:
 *  - Immobilitzat material (actiu no corrent) = valor brut d'adquisició dels
 *    actius donats d'alta fins a la data (`Actiu.cost`, sense amortitzar).
 *  - Deutors comercials (actiu corrent) = factures amb estat PENDENT emeses
 *    fins a la data.
 *  - Tresoreria — efectiu de fiances (actiu corrent) = dipòsits en custòdia a la
 *    data; la seva contrapartida és el passiu "Fiances a retornar".
 *  - Fiances rebudes a retornar (passiu corrent) = mateixos dipòsits en custòdia.
 */
export async function getBalancSituacio(start: Date, end: Date, opts?: { incloureCustodia?: boolean }) {
  const num = (d: { _sum: Record<string, unknown> }, k: string) => Number(d._sum[k] ?? 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const incloureCustodia = opts?.incloureCustodia ?? true;
  const periode = { gte: start, lte: end };

  const [
    establiment,
    immobAgg, immobCount,
    deutorsAgg, deutorsCount,
    fiancesAgg, fiancesCount,
    cobraAgg, gastoAgg, jornadaAgg, retingutsAgg,
  ] = await Promise.all([
    prisma.establiment.findFirst({ select: { saldoInicialTresoreria: true } }),
    prisma.actiu.aggregate({
      _sum: { cost: true },
      where: { deletedAt: null, dataCompra: periode },
    }),
    prisma.actiu.count({ where: { deletedAt: null, dataCompra: periode } }),
    prisma.factura.aggregate({
      _sum: { total: true },
      where: { deletedAt: null, estat: 'PENDENT', data: periode },
    }),
    prisma.factura.count({ where: { deletedAt: null, estat: 'PENDENT', data: periode } }),
    // Fiances rebudes DINS del període i encara no resoltes a final del període.
    prisma.diposit.aggregate({
      _sum: { import: true },
      where: {
        data: periode,
        OR: [{ dataResolucio: null }, { dataResolucio: { gt: end } }],
        estancia: { deletedAt: null },
      },
    }),
    prisma.diposit.count({
      where: {
        data: periode,
        OR: [{ dataResolucio: null }, { dataResolucio: { gt: end } }],
        estancia: { deletedAt: null },
      },
    }),
    // Tresoreria: ingressos cobrats DINS del període.
    prisma.cobrament.aggregate({
      _sum: { import: true },
      where: { data: periode, estancia: { deletedAt: null } },
    }),
    // Despeses pagades dins del període.
    prisma.gasto.aggregate({
      _sum: { import: true },
      where: { esFianca: false, data: periode },
    }),
    // Cost de personal del període.
    prisma.jornada.aggregate({
      _sum: { import: true },
      where: { data: periode },
    }),
    // Dipòsits RETINGUTS dins del període: són ingrés (com al P&L).
    prisma.diposit.aggregate({
      _sum: { import: true },
      where: { estat: 'RETINGUT', dataResolucio: periode, estancia: { deletedAt: null } },
    }),
  ]);

  const immobilitzatBrut = r2(num(immobAgg, 'cost'));
  const deutors = r2(num(deutorsAgg, 'total'));
  // Fiances EN CUSTÒDIA a la data de tall: el seu efectiu és un actiu a part i,
  // alhora, un deute (passiu) perquè s'han de retornar. Es mostren només "amb fiança"
  // (sense fiança s'amaguen totes dues línies i el patrimoni no canvia).
  const fiancaCustodia = r2(num(fiancesAgg, 'import'));
  const fiances = incloureCustodia ? fiancaCustodia : 0;
  const tresoreriaFiances = fiances;

  const saldoInicial = r2(Number(establiment?.saldoInicialTresoreria ?? 0));
  const totalCobraments = r2(num(cobraAgg, 'import'));
  const totalGastos = r2(num(gastoAgg, 'import'));
  const totalJornades = r2(num(jornadaAgg, 'import'));
  const totalRetinguts = r2(num(retingutsAgg, 'import'));
  // Tresoreria general DEL PERÍODE = cobraments + dipòsits retinguts (ingrés, com
  // al P&L) − despeses − personal. Només moviments del període: el saldo inicial
  // NO s'hi suma (no és un moviment). L'efectiu de les fiances va a la seva línia.
  const tresoreriaOperativa = r2(totalCobraments + totalRetinguts - totalGastos - totalJornades);

  const totalActiu = r2(immobilitzatBrut + deutors + tresoreriaOperativa + tresoreriaFiances);
  const passiuNoCorrent = 0;
  const passiuCorrent = fiances;
  const totalPassiu = r2(passiuNoCorrent + passiuCorrent);
  const patrimoniNet = r2(totalActiu - totalPassiu);

  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    desde: iso(start),
    data: iso(end),
    inclouCustodia: incloureCustodia,
    actiu: {
      noCorrent: { immobilitzatBrut },
      corrent: { deutors, tresoreriaOperativa, tresoreriaFiances },
      total: totalActiu,
    },
    patrimoniIPassiu: {
      patrimoniNet,
      passiuNoCorrent,
      passiuCorrent: { fiances },
      total: r2(patrimoniNet + totalPassiu),
    },
    detall: {
      nActius: immobCount,
      nFacturesPendents: deutorsCount,
      nDiposits: incloureCustodia ? fiancesCount : 0,
      saldoInicial,
      totalCobraments,
      totalGastos,
      totalJornades,
    },
    quadra: true,
    mancances: [
      "Amortització acumulada de l'immobilitzat (es mostra el valor brut d'adquisició)",
      'Existències',
      'Creditors comercials: despeses pendents de pagar (el model de despeses no registra l\'estat de pagament)',
      'IVA pendent de liquidar amb Hisenda',
      "Capital, reserves i resultats d'exercicis anteriors (saldos d'obertura)",
    ],
  };
}

export type BalancSituacio = Awaited<ReturnType<typeof getBalancSituacio>>;
