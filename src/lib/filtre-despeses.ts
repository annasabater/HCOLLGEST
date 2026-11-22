/**
 * Filtre i comparació de la llista de despeses (/gastos): què es mira (proveïdors,
 * categories o paraules), amb quin període es compara i com s'agrupa per al gràfic.
 * Lògica pura: no toca la BD ni el navegador.
 */
import { mesEnrere, periodeAnterior, periodeComparacio, type EstatPeriode } from './periode';

export type FiltreDespesa =
  | { tipus: 'PROVEIDOR'; id: string; nom: string }
  | { tipus: 'CATEGORIA'; nom: string }
  | { tipus: 'TEXT'; text: string };

export type ModeComparacio = 'CAP' | 'ANTERIOR' | 'ANY_PASSAT' | 'RANG';

/** El mínim d'una despesa que cal per filtrar-la i sumar-la. */
export interface DespesaFiltrable {
  data: string; // ISO (YYYY-MM-DD…)
  import: number | string;
  descripcio: string;
  esFianca: boolean;
  proveidorId: string | null;
  categoria: { nom: string };
  proveidor: { nom: string } | null;
}

/** Minúscules i sense accents, per cercar «aigua» i trobar «AIGÜA». */
export function normalitza(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function etiquetaFiltre(f: FiltreDespesa): string {
  return f.tipus === 'TEXT' ? `«${f.text}»` : f.nom;
}

export function mateixFiltre(a: FiltreDespesa, b: FiltreDespesa): boolean {
  if (a.tipus !== b.tipus) return false;
  if (a.tipus === 'PROVEIDOR' && b.tipus === 'PROVEIDOR') return a.id === b.id;
  if (a.tipus === 'CATEGORIA' && b.tipus === 'CATEGORIA') return normalitza(a.nom) === normalitza(b.nom);
  if (a.tipus === 'TEXT' && b.tipus === 'TEXT') return normalitza(a.text) === normalitza(b.text);
  return false;
}

/**
 * Una despesa surt si compleix ALGUN dels filtres (aigua + llum + internet =
 * «Subministraments»). Sense filtres, surten totes.
 */
export function coincideix(g: DespesaFiltrable, filtres: FiltreDespesa[]): boolean {
  if (filtres.length === 0) return true;
  return filtres.some((f) => {
    if (f.tipus === 'PROVEIDOR') return g.proveidorId === f.id;
    if (f.tipus === 'CATEGORIA') return normalitza(g.categoria.nom) === normalitza(f.nom);
    const t = normalitza(f.text);
    if (!t) return true;
    return [g.descripcio, g.proveidor?.nom ?? '', g.categoria.nom].some((camp) => normalitza(camp).includes(t));
  });
}

/** Total de despesa real (les fiances no compten) i quantes n'hi ha. */
export function totalDespeses(gs: DespesaFiltrable[]): { total: number; n: number } {
  const reals = gs.filter((g) => !g.esFianca);
  const total = reals.reduce((s, g) => s + Number(g.import), 0);
  return { total: Math.round(total * 100) / 100, n: reals.length };
}

/** Diferència entre el període triat (`ara`) i el de comparar (`abans`). `pct` null si abans és 0. */
export function variacio(ara: number, abans: number): { diff: number; pct: number | null } {
  const diff = Math.round((ara - abans) * 100) / 100;
  return { diff, pct: abans === 0 ? null : Math.round((diff / abans) * 1000) / 10 };
}

/**
 * Rang amb què comparar. «Anterior» fa servir el període anterior del navegador
 * (mes → mes anterior, mateixos dies si el mes no s'ha acabat); per a un rang a mà,
 * el mateix nombre de dies just abans. «Any passat»: els mateixos dies, un any abans.
 */
export function rangComparacio(
  mode: ModeComparacio,
  estat: EstatPeriode,
  desde: string,
  fins: string,
  avui: string,
  rangAMa?: { desde: string; fins: string } | null,
): { desde: string; fins: string } | null {
  if (mode === 'CAP') return null;
  if (mode === 'RANG') return rangAMa && rangAMa.desde && rangAMa.fins && rangAMa.desde <= rangAMa.fins ? rangAMa : null;
  if (mode === 'ANY_PASSAT') return { desde: mesEnrere(desde, 12), fins: mesEnrere(fins, 12) };
  const c = periodeComparacio(estat, avui);
  return c ? { desde: c.desde, fins: c.fins } : periodeAnterior(desde, fins);
}

const MESOS_CURTS = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];

/** «oct. 2026» o «ag. – set. 2026». */
function etiquetaMesos(primer: string, ultim: string): string {
  const [y1, m1] = primer.split('-').map(Number) as [number, number];
  const [y2, m2] = ultim.split('-').map(Number) as [number, number];
  if (primer === ultim) return `${MESOS_CURTS[m1 - 1]} ${y1}`;
  if (y1 === y2) return `${MESOS_CURTS[m1 - 1]} – ${MESOS_CURTS[m2 - 1]} ${y2}`;
  return `${MESOS_CURTS[m1 - 1]} ${y1} – ${MESOS_CURTS[m2 - 1]} ${y2}`;
}

/** Mesos (`YYYY-MM`) que toca un rang, en ordre. */
export function mesosDelRang(desde: string, fins: string): string[] {
  const out: string[] = [];
  let [y, m] = desde.split('-').map(Number) as [number, number];
  const fi = fins.slice(0, 7);
  for (let i = 0; i < 240; i++) {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    out.push(k);
    if (k >= fi) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

export interface GrupGrafic {
  etiqueta: string;
  import: number;
  n: number;
}

/**
 * Suma per grups de `mesos` mesos (1 = per mes, 2 = per bimestre…), comptats des
 * del primer mes del rang: així la factura bimestral de l'aigua cau sempre en un
 * grup i no surten mesos buits a mig grup.
 */
export function agrupaPerMesos(gs: DespesaFiltrable[], desde: string, fins: string, mesos: number): GrupGrafic[] {
  const llista = mesosDelRang(desde, fins);
  const mida = Math.max(1, Math.floor(mesos));
  const grups: { mesos: string[]; import: number; n: number }[] = [];
  for (let i = 0; i < llista.length; i += mida) grups.push({ mesos: llista.slice(i, i + mida), import: 0, n: 0 });
  for (const g of gs) {
    if (g.esFianca) continue;
    const dia = g.data.slice(0, 10);
    if (dia < desde || dia > fins) continue;
    const grup = grups.find((x) => x.mesos.includes(dia.slice(0, 7)));
    if (!grup) continue;
    grup.import += Number(g.import);
    grup.n += 1;
  }
  return grups.map((g) => ({
    etiqueta: etiquetaMesos(g.mesos[0]!, g.mesos[g.mesos.length - 1]!),
    import: Math.round(g.import * 100) / 100,
    n: g.n,
  }));
}

/**
 * Les FIANCES (recuperables, no compten com a despesa) agrupades igual que
 * `agrupaPerMesos`: el mateix nombre de grups, en el mateix ordre. Serveix perquè
 * el gràfic les pugui dibuixar (rallades) al costat de la despesa real.
 */
export function agrupaFiancesPerMesos(gs: DespesaFiltrable[], desde: string, fins: string, mesos: number): number[] {
  const llista = mesosDelRang(desde, fins);
  const mida = Math.max(1, Math.floor(mesos));
  const grups: { mesos: string[]; import: number }[] = [];
  for (let i = 0; i < llista.length; i += mida) grups.push({ mesos: llista.slice(i, i + mida), import: 0 });
  for (const g of gs) {
    if (!g.esFianca) continue;
    const dia = g.data.slice(0, 10);
    if (dia < desde || dia > fins) continue;
    const grup = grups.find((x) => x.mesos.includes(dia.slice(0, 7)));
    if (grup) grup.import += Number(g.import);
  }
  return grups.map((g) => Math.round(g.import * 100) / 100);
}

/** Suggeriments del cercador: categories i proveïdors amb el que sumen al període. */
export interface Suggeriment {
  filtre: FiltreDespesa;
  import: number;
  n: number;
}

export function suggeriments(
  text: string,
  gs: DespesaFiltrable[],
  totsProveidors: { id: string; nom: string }[],
  totesCategories: { nom: string }[],
  jaTriats: FiltreDespesa[],
): { categories: Suggeriment[]; proveidors: Suggeriment[] } {
  const t = normalitza(text);
  const reals = gs.filter((g) => !g.esFianca);
  const perCat = new Map<string, { import: number; n: number }>();
  const perProv = new Map<string, { import: number; n: number }>();
  for (const g of reals) {
    const c = perCat.get(g.categoria.nom) ?? { import: 0, n: 0 };
    c.import += Number(g.import); c.n += 1; perCat.set(g.categoria.nom, c);
    if (g.proveidorId) {
      const p = perProv.get(g.proveidorId) ?? { import: 0, n: 0 };
      p.import += Number(g.import); p.n += 1; perProv.set(g.proveidorId, p);
    }
  }
  const lliure = (f: FiltreDespesa) => !jaTriats.some((j) => mateixFiltre(j, f));
  const ordena = (a: Suggeriment, b: Suggeriment) => b.import - a.import || etiquetaFiltre(a.filtre).localeCompare(etiquetaFiltre(b.filtre), 'ca');
  const arrodoneix = (x: { import: number; n: number } | undefined) => ({ import: Math.round((x?.import ?? 0) * 100) / 100, n: x?.n ?? 0 });

  const categories: Suggeriment[] = totesCategories
    .filter((c) => (t ? normalitza(c.nom).includes(t) : perCat.has(c.nom)))
    .map((c) => ({ filtre: { tipus: 'CATEGORIA' as const, nom: c.nom }, ...arrodoneix(perCat.get(c.nom)) }))
    .filter((s) => lliure(s.filtre))
    .sort(ordena);
  const proveidors: Suggeriment[] = totsProveidors
    .filter((p) => (t ? normalitza(p.nom).includes(t) : perProv.has(p.id)))
    .map((p) => ({ filtre: { tipus: 'PROVEIDOR' as const, id: p.id, nom: p.nom }, ...arrodoneix(perProv.get(p.id)) }))
    .filter((s) => lliure(s.filtre))
    .sort(ordena);
  return { categories: categories.slice(0, 8), proveidors: proveidors.slice(0, t ? 8 : 6) };
}
