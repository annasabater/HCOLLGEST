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
  agrupaPerceptors, calc100, calc115, calc130, calc180, calc303, calc390, concepte100, pendentDespres303, round2, termini,
  type Anterior130, type Caselles, type Concepte100, type ModelFiscal, type Perceptor, type PerTipus, type Resultat100,
  type TotalsTrimestre,
} from '../impostos';
import { liniesIva } from '../gasto-iva';
import { esCategoriaSenseIva, getFiancesSoportades, getGastosSoportats, getLlibreIngressos, rangTrimestre } from './llibre-iva';

export type EstatModel = 'presentada' | 'pendent' | 'en_curs' | 'futur' | 'no_cal';

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
}

export interface ImpostosAny {
  any: number;
  titular: { nom: string; nif: string };
  referenciaCadastral: string;
  trimestres: TrimestreInfo[];
  anual: { '390': ModelInfo; '180': ModelInfo & { perceptors: Perceptor[] } };
  /** Renda (model 100): només la part de l'activitat de l'hostal. */
  renda: Resultat100 & {
    termini: string;
    iniciActivitat: boolean;
    /** Gastos d'immobilitzat (mobiliari, electrodomèstics) que potser s'han d'amortitzar. */
    immobilitzat: number;
  };
}

/** Clau de casella del resultat de cada model (per detectar canvis). */
const CASELLA_RESULTAT: Record<ModelFiscal, string> = { '303': '71', '130': '19', '115': '05', '390': '86', '180': '03' };

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
    prisma.declaracioFiscal.findMany({ where: { any } }),
  ]);
  const presentada = (model: ModelFiscal, periode: number) => {
    const d = declaracions.find((x) => x.model === model && x.periode === periode);
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
    trimestres.push({ trimestre: t, inici, fi, llibreDesat, totals, models: { '303': m303, '130': m130, '115': m115 } });
  }

  const fiAny = `${any}-12-31`;
  const perceptorsAny = agrupaPerceptors(lloguerAny);
  const m390 = info('390', 0, calc390(per390), fiAny, per390.every((x) => x.totals.ingressos.base === 0 && x.totals.gastos.baseAmbIva === 0));
  const m180 = info('180', 0, calc180(perceptorsAny), fiAny, perceptorsAny.length === 0);

  const pagaments130 = round2(
    trimestres.reduce((a, t) => a + Math.max(0, (t.models['130'].presentada?.caselles ?? t.models['130'].calculades)['19'] ?? 0), 0),
  );

  return {
    any,
    titular: { nom: establiment?.facturaTitular ?? establiment?.nom ?? '', nif: establiment?.facturaNif ?? '' },
    referenciaCadastral: establiment?.referenciaCadastral ?? '',
    trimestres,
    anual: { '390': m390, '180': { ...m180, perceptors: perceptorsAny } },
    renda: await renda(any, acumIngressos, pagaments130),
  };
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
