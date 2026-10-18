/**
 * Impostos (/impostos) — càlcul PUR de les caselles de les autoliquidacions:
 *   303 IVA trimestral (només el trimestre) · 130 IRPF a compte (ACUMULAT de l'any
 *   menys el ja pagat) · 115 retencions del lloguer del local · 390 resum anual
 *   d'IVA · 180 resum anual de retencions del lloguer.
 * Les dades d'entrada surten del Llibre d'IVA trimestral (services/impostos.ts).
 * Numeració de caselles segons els formularis i instruccions de l'AEAT.
 */

export type Caselles = Record<string, number>;
export type ModelFiscal = '303' | '130' | '115' | '390' | '180';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Base i quota per tipus d'IVA (clau = percentatge). */
export type PerTipus = Record<number, { base: number; iva: number }>;

export interface Perceptor {
  nif: string;
  nom: string;
  base: number;
  retencio: number;
  percent: number;
}

/** Totals d'un trimestre, ja nets de fiances (vegeu services/impostos.ts). */
export interface TotalsTrimestre {
  ingressos: { base: number; iva: number; perTipus: PerTipus };
  gastos: {
    /** Base dels gastos amb IVA deduïble (casella 28 del 303). */
    baseAmbIva: number;
    /** Quota d'IVA suportat deduïble (casella 29 del 303). */
    iva: number;
    perTipus: PerTipus;
    /** Gastos sense IVA (assegurances, tributs, cànons, repercussions…): només 130. */
    senseIva: number;
    /** Nòmines del trimestre: només 130. */
    nomines: number;
  };
  /** Retencions d'IRPF practicades al lloguer del local (model 115). */
  lloguer: Perceptor[];
}

// ─── 303 ────────────────────────────────────────────────────────────────────

/** Caselles base/tipus/quota de l'IVA meritat del 303 per tipus. */
const MERITAT_303: Record<number, [string, string, string]> = {
  4: ['01', '02', '03'],
  10: ['04', '05', '06'],
  21: ['07', '08', '09'],
};

export interface Opcions303 {
  /** Quotes a compensar pendents de períodes anteriors (casella 110). */
  pendentAnterior: number;
  /** Últim trimestre de l'any: el negatiu es pot demanar a retornar (73). */
  ultimTrimestre: boolean;
}

export function calc303(t: TotalsTrimestre, o: Opcions303): Caselles {
  const c: Caselles = {};
  for (const [pct, v] of Object.entries(t.ingressos.perTipus)) {
    const k = MERITAT_303[Number(pct)];
    if (!k || (v.base === 0 && v.iva === 0)) continue;
    c[k[0]] = round2(v.base);
    c[k[1]] = Number(pct);
    c[k[2]] = round2(v.iva);
  }
  c['27'] = round2(t.ingressos.iva);
  c['28'] = round2(t.gastos.baseAmbIva);
  c['29'] = round2(t.gastos.iva);
  c['45'] = c['29'];
  c['46'] = round2(c['27'] - c['45']);
  c['64'] = c['46'];
  c['65'] = 100;
  c['66'] = c['64'];
  // Compensació: només s'aplica fins a deixar el resultat a 0.
  const pendent = round2(Math.max(0, o.pendentAnterior));
  const aplicat = c['66'] > 0 ? round2(Math.min(pendent, c['66'])) : 0;
  c['110'] = pendent;
  c['78'] = aplicat;
  c['87'] = round2(pendent - aplicat);
  c['69'] = round2(c['66'] - aplicat);
  c['71'] = c['69'];
  if (c['71'] < 0) {
    // Negatiu: a compensar (72) als trimestres següents; al 4T, a retornar (73).
    c[o.ultimTrimestre ? '73' : '72'] = round2(-c['71']);
  }
  return c;
}

/** Import que queda a compensar després d'aquest 303 (per al trimestre següent). */
export function pendentDespres303(c: Caselles): number {
  return round2((c['87'] ?? 0) + (c['72'] ?? 0));
}

// ─── 130 ────────────────────────────────────────────────────────────────────

export interface Anterior130 {
  /** Casella 07 de cada 130 anterior del mateix any. */
  c07: number;
  /** Casella 16 (habitatge) de cada 130 anterior. */
  c16: number;
  /** Casella 19 (resultat) de cada 130 anterior. */
  c19: number;
  /** Casella 15 (negatius aplicats) de cada 130 anterior. */
  c15: number;
}

/**
 * 130: TOTES les dades del apartat I són ACUMULADES de l'1 de gener a l'últim dia
 * del trimestre (instruccions AEAT). La casella 05 resta el que ja s'ha pagat.
 */
export function calc130(acumulat: { ingressos: number; gastos: number }, anteriors: Anterior130[]): Caselles {
  const c: Caselles = {};
  c['01'] = round2(acumulat.ingressos);
  c['02'] = round2(acumulat.gastos);
  c['03'] = round2(c['01'] - c['02']);
  c['04'] = c['03'] > 0 ? round2(c['03'] * 0.2) : 0;
  // 05: suma dels 07 POSITIUS anteriors menys la suma de les 16 anteriors.
  c['05'] = round2(
    anteriors.reduce((a, x) => a + Math.max(0, x.c07), 0) - anteriors.reduce((a, x) => a + x.c16, 0),
  );
  c['06'] = 0;
  c['07'] = round2(c['04'] - c['05'] - c['06']);
  c['12'] = Math.max(0, c['07']); // 07 + 11 (sense activitat agrària); si és negatiu, 0
  c['13'] = 0;
  c['14'] = round2(c['12'] - c['13']);
  // 15: resultats negatius (19) de trimestres anteriors encara no aplicats.
  const negatius = round2(anteriors.reduce((a, x) => a + Math.max(0, -x.c19), 0) - anteriors.reduce((a, x) => a + x.c15, 0));
  c['15'] = c['14'] > 0 ? round2(Math.min(Math.max(0, negatius), c['14'])) : 0;
  c['16'] = 0;
  c['17'] = round2(c['14'] - c['15'] - c['16']);
  c['18'] = 0;
  c['19'] = round2(c['17'] - c['18']);
  return c;
}

// ─── 115 ────────────────────────────────────────────────────────────────────

export function calc115(perceptors: Perceptor[]): Caselles {
  const amb = perceptors.filter((p) => p.base !== 0 || p.retencio !== 0);
  const c: Caselles = {};
  c['01'] = amb.length;
  c['02'] = round2(amb.reduce((a, p) => a + p.base, 0));
  c['03'] = round2(amb.reduce((a, p) => a + p.retencio, 0));
  c['04'] = 0;
  c['05'] = round2(c['03'] - c['04']);
  return c;
}

/** Agrupa les retencions per perceptor (NIF o, si no n'hi ha, nom). */
export function agrupaPerceptors(files: Perceptor[]): Perceptor[] {
  const m = new Map<string, Perceptor>();
  for (const f of files) {
    const k = (f.nif || f.nom).trim().toUpperCase();
    const p = m.get(k) ?? { nif: f.nif, nom: f.nom, base: 0, retencio: 0, percent: f.percent };
    p.base = round2(p.base + f.base);
    p.retencio = round2(p.retencio + f.retencio);
    m.set(k, p);
  }
  return [...m.values()];
}

// ─── 390 ────────────────────────────────────────────────────────────────────

const MERITAT_390: Record<number, [string, string]> = { 4: ['01', '02'], 10: ['03', '04'], 21: ['05', '06'] };
const DEDUIBLE_390: Record<number, [string, string]> = { 4: ['190', '191'], 10: ['603', '604'], 21: ['605', '606'] };

export interface Trimestre390 {
  totals: TotalsTrimestre;
  c303: Caselles;
}

/** 390: resum anual dels quatre 303 (instruccions AEAT modelo 390). */
export function calc390(trims: Trimestre390[]): Caselles {
  const c: Caselles = {};
  const suma = (pick: (t: TotalsTrimestre) => PerTipus) => {
    const out: PerTipus = {};
    for (const t of trims) {
      for (const [pct, v] of Object.entries(pick(t.totals))) {
        const o = (out[Number(pct)] ??= { base: 0, iva: 0 });
        o.base = round2(o.base + v.base);
        o.iva = round2(o.iva + v.iva);
      }
    }
    return out;
  };
  const meritat = suma((t) => t.ingressos.perTipus);
  for (const [pct, v] of Object.entries(meritat)) {
    const k = MERITAT_390[Number(pct)];
    if (!k || (v.base === 0 && v.iva === 0)) continue;
    c[k[0]] = v.base;
    c[k[1]] = v.iva;
  }
  c['33'] = round2(trims.reduce((a, t) => a + t.totals.ingressos.base, 0));
  c['34'] = round2(trims.reduce((a, t) => a + t.totals.ingressos.iva, 0));
  c['47'] = c['34'];
  const deduible = suma((t) => t.gastos.perTipus);
  for (const [pct, v] of Object.entries(deduible)) {
    const k = DEDUIBLE_390[Number(pct)];
    if (!k || (v.base === 0 && v.iva === 0)) continue;
    c[k[0]] = v.base;
    c[k[1]] = v.iva;
  }
  c['48'] = round2(trims.reduce((a, t) => a + t.totals.gastos.baseAmbIva, 0));
  c['49'] = round2(trims.reduce((a, t) => a + t.totals.gastos.iva, 0));
  c['64'] = c['49'];
  c['65'] = round2(c['47'] - c['64']);
  c['84'] = c['65'];
  c['85'] = 0; // quotes d'exercicis anteriors aplicades (2026 és el primer any)
  c['86'] = round2(c['84'] - c['85']);
  // 95: suma dels resultats A INGRESSAR dels 303 de l'any.
  c['95'] = round2(trims.reduce((a, t) => a + Math.max(0, t.c303['71'] ?? 0), 0));
  const ultim = trims[trims.length - 1]?.c303;
  if (ultim?.['72']) c['97'] = ultim['72'];
  if (ultim?.['73']) c['98'] = ultim['73'];
  c['99'] = c['33'];
  c['108'] = c['99'];
  return c;
}

// ─── 180 ────────────────────────────────────────────────────────────────────

/** 180: resum anual del 115 (un registre per perceptor i immoble). */
export function calc180(perceptorsAny: Perceptor[]): Caselles {
  const c115 = calc115(perceptorsAny);
  return { '01': c115['01'] ?? 0, '02': c115['02'] ?? 0, '03': c115['03'] ?? 0 };
}

// ─── Terminis ───────────────────────────────────────────────────────────────

/** Si el termini cau en dissabte o diumenge, passa al dilluns (dia hàbil). */
function diaHabil(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  if (dow === 6) dt.setUTCDate(dt.getUTCDate() + 2);
  if (dow === 0) dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/** Últim dia per presentar (ISO). Trimestres 1–3: dia 20 del mes següent; 4T: gener. */
export function termini(model: ModelFiscal, any: number, periode: number): string {
  if (model === '390') return diaHabil(any + 1, 1, 30);
  if (model === '180') return diaHabil(any + 1, 1, 31);
  if (periode === 4) return diaHabil(any + 1, 1, model === '115' ? 20 : 30);
  return diaHabil(any, periode * 3 + 1, 20);
}
