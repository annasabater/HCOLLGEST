/**
 * Impostos de l'any (/impostos): llegeix el Llibre d'IVA de cada trimestre (el
 * DESAT si s'ha editat; si no, el que es genera de factures i gastos) i encadena
 * els trimestres amb les autoliquidacions JA PRESENTADES (DeclaracioFiscal):
 *   - 303: quotes a compensar d'un trimestre al següent (72 → 110).
 *   - 130: dades acumulades; la casella 05 resta els 07 presentats.
 *   - 115: retencions del lloguer del trimestre; 390 i 180, resum anual.
 * Les fiances no compten mai: ni els gastos marcats com a fiança ni la fiança
 * inclosa dins d'una factura (vegeu llibre-iva.ts).
 */
import 'server-only';
import { prisma } from '../db';
import {
  agrupaPerceptors, calc100, calc115, calc130, calc180, calc303, calc347, calc390, concepte100, pendentDespres303, round2, termini,
  type Anterior130, type Caselles, type Concepte100, type ModelFiscal, type Operacio347, type Perceptor, type PerTipus,
  type Resultat100, type Resultat347, type TotalsTrimestre,
} from '../impostos';
import { liniesIva } from '../gasto-iva';
import { esCategoriaSenseIva, getFiancesSoportades, getGastosSoportats, getLlibreIngressos, rangTrimestre } from './llibre-iva';
import { getIeetPeriode } from './ieet';
import { avisosBoePendents, type AvisBoe } from './boe-formularis';
import { infoPeriode } from '../ieet';

export type EstatModel = 'presentada' | 'pendent' | 'en_curs' | 'futur' | 'no_cal';

/**
 * Model 950 (ATC): taxa turística, SEMESTRAL. Surt a la pestanya del trimestre en
 * què es paga: abril–setembre al 3T (1–20 d'octubre) i octubre–març al 1T (1–20 d'abril).
 */
export interface Ieet950 {
  clau: string; // "2026-1"
  etiqueta: string;
  inici: string;
  fi: string;
  termini: string;
  estat: EstatModel;
  persones: number;
  personesPaguen: number;
  nits: number;
  import: number;
  tarifa: number;
  /** Estades amb dades del viatger incompletes (cal omplir-les a Taxa turística). */
  incompletes: number;
  presentada: { caselles: Caselles; justificant: string | null; presentadaEl: string } | null;
}

export interface ModelInfo {
  model: ModelFiscal;
  periode: number;
  termini: string;
  estat: EstatModel;
  calculades: Caselles;
  presentada: { caselles: Caselles; justificant: string | null; presentadaEl: string } | null;
  /** Les dades d'avui donen un resultat diferent del que es va presentar. */
  difereix: boolean;
}

export interface TrimestreInfo {
  trimestre: number;
  inici: string;
  fi: string;
  /** Hi ha un llibre d'IVA desat (editat) que mana sobre el calculat. */
  llibreDesat: boolean;
  totals: TotalsTrimestre;
  models: { '303': ModelInfo; '130': ModelInfo; '115': ModelInfo };
  /** Taxa turística que es paga en aquest trimestre (només 1T i 3T). */
  ieet: Ieet950 | null;
}

export interface ImpostosAny {
  any: number;
  /** Titular tal com consta a l'AEAT (nom i cognoms per separat, com al 130). */
  titular: { nom: string; cognoms: string; nif: string };
  referenciaCadastral: string;
  /** Ordres noves del BOE sobre aquests models, encara per revisar. */
  avisosBoe: AvisBoe[];
  trimestres: TrimestreInfo[];
  anual: {
    '390': ModelInfo;
    '180': ModelInfo & { perceptors: Perceptor[] };
    /** 347: si cal presentar-lo marca també la casella «D» del 390. */
    '347': ModelInfo & Resultat347 & { efectiu: { nom: string; total: number }[] };
  };
  /** Renda (model 100): només la part de l'activitat de l'hostal. */
  renda: Resultat100 & {
    termini: string;
    iniciActivitat: boolean;
    /** Gastos d'immobilitzat (mobiliari, electrodomèstics) que potser s'han d'amortitzar. */
    immobilitzat: number;
  };
}

/**
 * Titular de les autoliquidacions TAL COM CONSTA A L'AEAT (impresos del 2T:
 * NIF 38835174L · ELISABETH · NUALART COLL). El nom no surt del titular de
 * facturació (/config), que a les factures s'escriu «Elisabet»: a Hisenda ha de
 * coincidir amb el cens. El NIF de /config, si s'hi ha escrit, mana.
 */
const TITULAR_AEAT = { nom: 'ELISABETH', cognoms: 'NUALART COLL', nif: '38835174L' };

function titularFiscal(facturaNif?: string | null): ImpostosAny['titular'] {
  return { ...TITULAR_AEAT, nif: facturaNif?.trim().toUpperCase() || TITULAR_AEAT.nif };
}

/** Clau de casella del resultat de cada model (per detectar canvis). */
const CASELLA_RESULTAT: Record<ModelFiscal, string> = { '303': '71', '130': '19', '115': '05', '390': '86', '180': '03', '347': '02' };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function sumaPerTipus(files: { base: number; iva: number; ivaPercent: number }[]): PerTipus {
  const out: PerTipus = {};
  for (const f of files) {
    const pct = Math.round(f.ivaPercent);
    const o = (out[pct] ??= { base: 0, iva: 0 });
    o.base = round2(o.base + f.base);
    o.iva = round2(o.iva + f.iva);
  }
  return out;
}

interface FilaGastoLlibre { nif: string; proveidor: string; numFactura: string; base: number; ivaPercent: number; iva: number; irpfPercent: number; irpf: number; total: number }

/** Totals del trimestre a partir del llibre d'IVA (desat o generat). */
async function totalsTrimestre(any: number, t: number): Promise<{ totals: TotalsTrimestre; llibreDesat: boolean }> {
  const desat = await prisma.llibreIvaTrimestre.findUnique({ where: { periode: `${any}-${t}` } });

  const ingressos = desat
    ? (desat.files as unknown as { base?: number; iva?: number; ivaPercent?: number }[]).map((f) => ({
        base: Number(f.base ?? 0), iva: Number(f.iva ?? 0), ivaPercent: Number(f.ivaPercent ?? 0),
      }))
    : (await getLlibreIngressos(any, t)).files;

  let gastos: FilaGastoLlibre[];
  const gDesat = (desat?.gastos ?? null) as unknown as FilaGastoLlibre[] | null;
  if (gDesat) {
    // Com a la impressió del llibre: una fila desada que ara és fiança no compta.
    const fiances = await getFiancesSoportades(any, t);
    gastos = gDesat
      .map((g) => ({
        nif: String(g.nif ?? ''), proveidor: String(g.proveidor ?? ''), numFactura: String(g.numFactura ?? ''),
        base: Number(g.base ?? 0), ivaPercent: Number(g.ivaPercent ?? 0), iva: Number(g.iva ?? 0),
        irpfPercent: Number(g.irpfPercent ?? 0), irpf: Number(g.irpf ?? 0), total: Number(g.total ?? 0),
      }))
      .filter((g) => !fiances.some((f) =>
        Math.abs(f.total - g.total) < 0.005 &&
        ((g.numFactura && f.numFactura === g.numFactura.trim()) ||
          (g.nif && f.nif === g.nif.trim()) ||
          (g.proveidor && f.proveidor.trim().toLowerCase() === g.proveidor.trim().toLowerCase()))));
  } else {
    gastos = await getGastosSoportats(any, t);
  }

  const mesos = [1, 2, 3].map((m) => `${any}-${String((t - 1) * 3 + m).padStart(2, '0')}`);
  const nomines = await prisma.nomina.findMany({ where: { periode: { in: mesos } }, select: { total: true } });

  const ambIva = gastos.filter((g) => g.ivaPercent > 0);
  const totals: TotalsTrimestre = {
    ingressos: {
      base: round2(ingressos.reduce((a, f) => a + f.base, 0)),
      iva: round2(ingressos.reduce((a, f) => a + f.iva, 0)),
      perTipus: sumaPerTipus(ingressos),
    },
    gastos: {
      baseAmbIva: round2(ambIva.reduce((a, g) => a + g.base, 0)),
      iva: round2(ambIva.reduce((a, g) => a + g.iva, 0)),
      perTipus: sumaPerTipus(ambIva),
      senseIva: round2(gastos.filter((g) => g.ivaPercent <= 0).reduce((a, g) => a + g.base, 0)),
      nomines: round2(nomines.reduce((a, n) => a + Number(n.total), 0)),
    },
    lloguer: gastos
      .filter((g) => g.irpf !== 0)
      .map((g) => ({ nif: g.nif, nom: g.proveidor, base: g.base, retencio: g.irpf, percent: g.irpfPercent })),
  };
  return { totals, llibreDesat: !!desat };
}

const totalGastos130 = (t: TotalsTrimestre) => round2(t.gastos.baseAmbIva + t.gastos.senseIva + t.gastos.nomines);

export async function getImpostosAny(any: number, avui = new Date()): Promise<ImpostosAny> {
  const [establiment, declaracions] = await Promise.all([
    prisma.establiment.findFirst({ select: { facturaTitular: true, facturaNif: true, nom: true, referenciaCadastral: true } }),
    // L'any anterior també: el 950 d'octubre–març es paga l'abril de l'any següent.
    prisma.declaracioFiscal.findMany({ where: { any: { in: [any - 1, any] } } }),
  ]);
  const presentada = (model: ModelFiscal | '950', periode: number, anyDecl = any) => {
    const d = declaracions.find((x) => x.model === model && x.periode === periode && x.any === anyDecl);
    return d
      ? { caselles: d.caselles as unknown as Caselles, justificant: d.justificant, presentadaEl: d.presentadaEl.toISOString() }
      : null;
  };
  const avuiIso = iso(avui);

  const info = (
    model: ModelFiscal, periode: number, calculades: Caselles, fi: string, buit: boolean,
  ): ModelInfo => {
    const p = presentada(model, periode);
    const clau = CASELLA_RESULTAT[model];
    let estat: EstatModel;
    if (p) estat = 'presentada';
    else if (buit) estat = 'no_cal';
    else if (avuiIso <= fi) estat = 'en_curs';
    else estat = 'pendent';
    return {
      model, periode, termini: termini(model, any, periode), estat, calculades, presentada: p,
      difereix: !!p && Math.abs((p.caselles[clau] ?? 0) - (calculades[clau] ?? 0)) >= 0.01,
    };
  };

  async function ieet950(clau: string): Promise<Ieet950> {
    const p = infoPeriode(clau);
    const [anyClau, sem] = clau.split('-').map(Number) as [number, number];
    const decl = presentada('950', sem, anyClau);
    const futur = avuiIso < p.inici;
    const d = futur ? null : await getIeetPeriode(clau, avui);
    const r = d?.resum;
    let estat: EstatModel;
    if (decl) estat = 'presentada';
    else if (futur) estat = 'futur';
    else if (avuiIso <= p.fi) estat = 'en_curs';
    else if (!r || r.personesPaguen === 0) estat = 'no_cal';
    else estat = 'pendent';
    return {
      clau, etiqueta: p.etiqueta, inici: p.inici, fi: p.fi, termini: p.pagamentFins, estat,
      persones: r?.persones ?? 0, personesPaguen: r?.personesPaguen ?? 0, nits: r?.nitsPaguen ?? 0,
      import: round2(r?.import ?? 0), tarifa: d?.config.tarifa ?? 0,
      incompletes: d?.files.filter((f) => f.falten.length > 0).length ?? 0,
      presentada: decl,
    };
  }

  const trimestres: TrimestreInfo[] = [];
  let pendent303 = 0;
  let acumIngressos = 0;
  let acumGastos = 0;
  const anteriors130: Anterior130[] = [];
  const per390: { totals: TotalsTrimestre; c303: Caselles }[] = [];
  const lloguerAny: Perceptor[] = [];

  for (const t of [1, 2, 3, 4]) {
    const { start, end } = rangTrimestre(any, t);
    const inici = iso(start);
    const fi = iso(end);
    const futur = avuiIso < inici;
    const { totals, llibreDesat } = futur
      ? { totals: buits(), llibreDesat: false }
      : await totalsTrimestre(any, t);
    const senseMoviments =
      totals.ingressos.base === 0 && totals.gastos.baseAmbIva === 0 && totals.gastos.senseIva === 0 && totals.gastos.nomines === 0;

    // 303 — només el trimestre; arrossega el que quedi a compensar.
    const c303 = calc303(totals, { pendentAnterior: pendent303, ultimTrimestre: t === 4 });
    const m303 = info('303', t, c303, fi, senseMoviments && pendent303 === 0);
    const efectiu303 = m303.presentada?.caselles ?? c303;
    pendent303 = pendentDespres303(efectiu303);

    // 130 — acumulat: el que es va PRESENTAR fins al trimestre anterior + aquest.
    acumIngressos = round2(acumIngressos + totals.ingressos.base);
    acumGastos = round2(acumGastos + totalGastos130(totals));
    const c130 = calc130({ ingressos: acumIngressos, gastos: acumGastos }, anteriors130);
    const m130 = info('130', t, c130, fi, senseMoviments && anteriors130.length === 0);
    const efectiu130 = m130.presentada?.caselles ?? c130;
    if (m130.estat !== 'no_cal') {
      acumIngressos = efectiu130['01'] ?? acumIngressos;
      acumGastos = efectiu130['02'] ?? acumGastos;
      anteriors130.push({
        c07: efectiu130['07'] ?? 0, c16: efectiu130['16'] ?? 0, c19: efectiu130['19'] ?? 0, c15: efectiu130['15'] ?? 0,
      });
    }

    // 115 — retencions del lloguer del trimestre.
    const perceptors = agrupaPerceptors(totals.lloguer);
    lloguerAny.push(...totals.lloguer);
    const m115 = info('115', t, calc115(perceptors), fi, perceptors.length === 0);

    if (futur) {
      m303.estat = m303.presentada ? 'presentada' : 'futur';
      m130.estat = m130.presentada ? 'presentada' : 'futur';
      m115.estat = m115.presentada ? 'presentada' : 'futur';
    }

    per390.push({ totals, c303: efectiu303 });
    const ieet = t === 3 ? await ieet950(`${any}-1`) : t === 1 ? await ieet950(`${any - 1}-2`) : null;
    trimestres.push({ trimestre: t, inici, fi, llibreDesat, totals, models: { '303': m303, '130': m130, '115': m115 }, ieet });
  }

  const fiAny = `${any}-12-31`;
  const perceptorsAny = agrupaPerceptors(lloguerAny);
  const m390 = info('390', 0, calc390(per390), fiAny, per390.every((x) => x.totals.ingressos.base === 0 && x.totals.gastos.baseAmbIva === 0));
  const m180 = info('180', 0, calc180(perceptorsAny), fiAny, perceptorsAny.length === 0);
  const { r347, efectiu } = await model347(any);
  const m347 = info(
    '347', 0,
    { '01': r347.declarats.length, '02': round2(r347.declarats.reduce((a, t) => a + t.total, 0)) },
    fiAny, !r347.obligat,
  );

  const pagaments130 = round2(
    trimestres.reduce((a, t) => a + Math.max(0, (t.models['130'].presentada?.caselles ?? t.models['130'].calculades)['19'] ?? 0), 0),
  );

  return {
    any,
    titular: titularFiscal(establiment?.facturaNif),
    referenciaCadastral: establiment?.referenciaCadastral ?? '',
    avisosBoe: await avisosBoePendents(),
    trimestres,
    anual: { '390': m390, '180': { ...m180, perceptors: perceptorsAny }, '347': { ...m347, ...r347, efectiu } },
    renda: await renda(any, acumIngressos, pagaments130),
  };
}

/**
 * 347: operacions de l'any amb cada tercer, IVA inclòs (art. 33 RGAT). Queden fora:
 * el lloguer amb retenció (ja va al 180), tributs i cotitzacions, i les vendes amb
 * factura simplificada (no és obligatori identificar-hi el client). També
 * s'avisa dels cobraments en efectiu de més de 6.000 € d'un mateix client.
 */
async function model347(any: number): Promise<{ r347: Resultat347; efectiu: { nom: string; total: number }[] }> {
  const data = { gte: new Date(any, 0, 1), lte: new Date(any, 11, 31, 23, 59, 59, 999) };
  const trim = (d: Date) => Math.floor(d.getMonth() / 3) + 1;
  const [gastos, factures, cobraments] = await Promise.all([
    prisma.gasto.findMany({
      where: { deletedAt: null, esFianca: false, data },
      include: { proveidor: { select: { nom: true, cif: true } }, categoria: { select: { nom: true } } },
    }),
    prisma.factura.findMany({
      where: { deletedAt: null, data, esDiposit: false, tipusDocument: { in: ['FACTURA', 'FACTURA_SIMPLIFICADA'] } },
      include: {
        diposits: { select: { import: true } },
        estancia: { select: { viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true, cognom2: true, numDocument: true } } } } } },
      },
    }),
    prisma.cobrament.findMany({
      where: { data, metode: 'EFECTIU' },
      select: { import: true, estancia: { select: { viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { id: true, nom: true, cognom1: true } } } } } } },
    }),
  ]);

  const ops: Operacio347[] = [];
  for (const g of gastos) {
    const cat = (g.categoria?.nom ?? '').trim().toLowerCase();
    const irpf = g.irpfPercent && g.baseImposable != null ? round2((Number(g.baseImposable) * Number(g.irpfPercent)) / 100) : 0;
    const exclosa = g.irpfPercent
      ? 'Lloguer amb retenció (ja es declara al 180)'
      : ['impostos', 'impostos i taxes'].includes(cat)
        ? 'Tributs (no és una operació comercial)'
        : ['autònoms', 'autonoms', 'seguretat social'].includes(cat)
          ? 'Cotitzacions socials'
          : undefined;
    ops.push({
      nif: g.proveidor?.cif ?? '', nom: g.proveidor?.nom ?? g.descripcio, clau: 'A',
      import: round2(Number(g.import) + irpf), trimestre: trim(g.data), exclosa,
    });
  }
  for (const f of factures) {
    // Una simplificada coberta per una factura fiscal ja hi compta a través de la fiscal.
    if (f.tipusDocument === 'FACTURA_SIMPLIFICADA' && f.facturaFiscalId) continue;
    const h = f.estancia?.viatgers[0]?.huesped;
    const nom = (f.clientNom?.trim() || (h ? [h.nom, h.cognom1, h.cognom2].filter(Boolean).join(' ') : '—')).toUpperCase();
    const fianca = f.fiancaInclosa ? f.diposits.reduce((a, d) => a + Number(d.import), 0) : 0;
    // Només la factura COMPLETA obliga a identificar el client: les simplificades
    // queden fora encara que hi consti el document (art. 33.2.a RGAT).
    const esFiscal = f.tipusDocument === 'FACTURA';
    const nif = f.clientNif?.trim() || h?.numDocument || '';
    ops.push({
      nif, nom, clau: 'B', import: round2(Number(f.total) - fianca), trimestre: trim(f.data),
      exclosa: esFiscal ? undefined : 'Factures simplificades (no era obligatori identificar el client)',
    });
  }
  const perHoste = new Map<string, { nom: string; total: number }>();
  for (const c of cobraments) {
    const h = c.estancia?.viatgers[0]?.huesped;
    if (!h) continue;
    const o = perHoste.get(h.id) ?? { nom: `${h.nom} ${h.cognom1}`.trim().toUpperCase(), total: 0 };
    o.total = round2(o.total + Number(c.import));
    perHoste.set(h.id, o);
  }
  return { r347: calc347(ops), efectiu: [...perHoste.values()].filter((o) => o.total > 6000) };
}

/** Part de l'activitat de la renda: gastos de l'any per concepte (sense fiances). */
async function renda(any: number, ingressos: number, pagamentsFraccionats: number): Promise<ImpostosAny['renda']> {
  const inici = new Date(any, 0, 1);
  const fi = new Date(any, 11, 31, 23, 59, 59, 999);
  const [gastos, nomines, anteriors] = await Promise.all([
    prisma.gasto.findMany({
      where: { deletedAt: null, esFianca: false, data: { gte: inici, lte: fi } },
      include: { categoria: { select: { nom: true } } },
    }),
    prisma.nomina.findMany({ where: { periode: { startsWith: `${any}-` } }, select: { total: true } }),
    // Reducció per inici: cal no haver tingut activitat l'any anterior.
    Promise.all([
      prisma.factura.count({ where: { deletedAt: null, data: { gte: new Date(any - 1, 0, 1), lt: inici } } }),
      prisma.gasto.count({ where: { deletedAt: null, data: { gte: new Date(any - 1, 0, 1), lt: inici } } }),
    ]),
  ]);
  const perConcepte: Partial<Record<Concepte100, number>> = {};
  let immobilitzat = 0;
  for (const g of gastos) {
    const cat = g.categoria?.nom ?? '';
    const base = esCategoriaSenseIva(cat) && g.baseImposable == null && g.desglossamentIva == null
      ? Number(g.import)
      : liniesIva(g).reduce((a, l) => a + l.base, 0);
    const k = concepte100(cat);
    perConcepte[k] = round2((perConcepte[k] ?? 0) + base);
    if (['mobiliari', 'electrodomèstics'].includes(cat.trim().toLowerCase())) immobilitzat = round2(immobilitzat + base);
  }
  perConcepte.sous = round2((perConcepte.sous ?? 0) + nomines.reduce((a, n) => a + Number(n.total), 0));
  const iniciActivitat = anteriors[0] === 0 && anteriors[1] === 0;
  return {
    ...calc100({ ingressos, gastos: perConcepte, pagamentsFraccionats, iniciActivitat }),
    termini: `${any + 1}-06-30`,
    iniciActivitat,
    immobilitzat,
  };
}

function buits(): TotalsTrimestre {
  return {
    ingressos: { base: 0, iva: 0, perTipus: {} },
    gastos: { baseAmbIva: 0, iva: 0, perTipus: {}, senseIva: 0, nomines: 0 },
    lloguer: [],
  };
}
