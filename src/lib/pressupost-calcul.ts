/**
 * De la calculadora de preus al pressupost (pur i testejat).
 *
 * - `planificaHabitacions`: quan cap habitació del tipus està lliure TOTA
 *   l'estada, busca com cobrir-la canviant d'habitació el mínim de vegades
 *   (a cada pas, l'habitació lliure més nits seguides).
 * - `liniesPressupost`: converteix el resultat de la calculadora (preus amb IVA
 *   inclòs) en línies de pressupost (bases) amb IVA de l'allotjament, mostrant o
 *   no el canvi d'habitació.
 */

export const IVA_ALLOTJAMENT = 10;

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export interface TramPla {
  habitacio: string; // nom ("5")
  desde: string; // ISO, primera nit
  fins: string; // ISO, dia que en surt (o canvia)
  nits: number;
}

/** Suma `dies` a una data ISO 'YYYY-MM-DD' (en UTC: sense salts d'horari d'estiu). */
export function isoMesDies(iso: string, dies: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dies);
  return d.toISOString().slice(0, 10);
}

/**
 * Pla de canvis d'habitació. `ocupades` = per a cada habitació, les nits (índex
 * 0..nits-1) que NO està lliure. Retorna els trams (2 o més), o null si alguna
 * nit no té cap habitació lliure o si n'hi ha una de lliure tota l'estada.
 */
export function planificaHabitacions(
  entrada: string,
  nits: number,
  habitacions: { nom: string; ocupades: Set<number> }[],
): TramPla[] | null {
  if (nits <= 0 || habitacions.length === 0) return null;
  if (habitacions.some((h) => h.ocupades.size === 0)) return null;

  const trams: TramPla[] = [];
  let i = 0;
  while (i < nits) {
    let millor: { nom: string; fins: number } | null = null;
    for (const h of habitacions) {
      let j = i;
      while (j < nits && !h.ocupades.has(j)) j++;
      if (j > i && (!millor || j > millor.fins)) millor = { nom: h.nom, fins: j };
    }
    if (!millor) return null;
    trams.push({ habitacio: millor.nom, desde: isoMesDies(entrada, i), fins: isoMesDies(entrada, millor.fins), nits: millor.fins - i });
    i = millor.fins;
  }
  return trams;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. */
export function dataCurta(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const nitsTxt = (n: number) => `${n} ${n === 1 ? 'nit' : 'nits'}`;

/**
 * Reparteix `import` entre trams segons el preu/nit de cada nit (el dels segments
 * de temporada de la calculadora). L'últim tram absorbeix el residu d'arrodoniment.
 */
function reparteix(importe: number, trams: TramPla[], segments: { desde: string; fins: string; nits: number; subtotal: number }[]): number[] {
  const preuNit = (iso: string) => {
    const s = segments.find((x) => iso >= x.desde && iso < x.fins);
    return s && s.nits > 0 ? s.subtotal / s.nits : 1;
  };
  const pesos = trams.map((t) => {
    let p = 0;
    for (let k = 0; k < t.nits; k++) p += preuNit(isoMesDies(t.desde, k));
    return p;
  });
  const pesTotal = pesos.reduce((a, p) => a + p, 0) || 1;
  let acumulat = 0;
  return pesos.map((p, idx) => {
    const v = idx === pesos.length - 1 ? r2(importe - acumulat) : r2((importe * p) / pesTotal);
    acumulat = r2(acumulat + v);
    return v;
  });
}

/**
 * Base imposable tal que base + IVA (arrodonit com el pressupost) = total amb IVA.
 * Si per arrodoniment no quadra al cèntim, ajusta la base ±1 cèntim.
 */
export function baseDeTotal(total: number, ivaPercent = IVA_ALLOTJAMENT): number {
  const amb = (b: number) => r2(b + r2((b * ivaPercent) / 100));
  const base = r2(total / (1 + ivaPercent / 100));
  for (const c of [base, r2(base - 0.01), r2(base + 0.01)]) if (amb(c) === r2(total)) return c;
  return base;
}

export interface PressupostDeCalcul {
  ivaPercent: number;
  linies: { descripcio: string; import: number }[];
  notes: string;
}

export function liniesPressupost(opts: {
  tipus: string; // "Habitació Individual"
  entrada: string;
  sortida: string;
  nits: number;
  total: number; // amb IVA inclòs
  segments: { desde: string; fins: string; nits: number; subtotal: number }[];
  pla: TramPla[] | null;
  mostrarCanvi: boolean;
}): PressupostDeCalcul {
  const base = baseDeTotal(opts.total);
  if (!opts.pla || opts.pla.length < 2 || !opts.mostrarCanvi) {
    return {
      ivaPercent: IVA_ALLOTJAMENT,
      linies: [{ descripcio: `${opts.tipus} · del ${dataCurta(opts.entrada)} al ${dataCurta(opts.sortida)} · ${nitsTxt(opts.nits)}`, import: base }],
      notes: '',
    };
  }
  const imports = reparteix(base, opts.pla, opts.segments);
  const canvis = opts.pla.slice(1).map((t, k) => `el ${dataCurta(t.desde)} (de la ${opts.pla![k]!.habitacio} a la ${t.habitacio})`);
  return {
    ivaPercent: IVA_ALLOTJAMENT,
    linies: opts.pla.map((t, k) => ({
      descripcio: `${opts.tipus} (Hab. ${t.habitacio}) · del ${dataCurta(t.desde)} al ${dataCurta(t.fins)} · ${nitsTxt(t.nits)}`,
      import: imports[k]!,
    })),
    notes: `L'estada inclou ${canvis.length === 1 ? 'un canvi' : `${canvis.length} canvis`} d'habitació ${canvis.join(' i ')}, de la mateixa categoria i al mateix preu.`,
  };
}
