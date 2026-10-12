/**
 * Indicadors de l'hostal d'un període (pur i testejat).
 *
 * - Ocupació: nits ocupades ÷ nits disponibles (des del primer dia amb estades,
 *   si el període comença abans: l'hostal no estava obert). Cada habitació compta COM A
 *   MOLT un cop per nit (dos contractes a la mateixa habitació no la dupliquen)
 *   i es compta per dies: el dia de sortida no és una nit.
 * - Preu mitjà per nit: ingressos d'allotjament del període ÷ nits ocupades.
 * - Cost per nit ocupada: despeses (personal inclòs) ÷ nits ocupades.
 * - Benefici per nit ocupada: preu mitjà − cost per nit.
 * - Durada mitjana de l'estada: nits totals (d'entrada a sortida) de les
 *   estades que toquen el període, de mitjana.
 */

export interface EstadaIndicador {
  habitacioId: string;
  /** `YYYY-MM-DD` (dia d'entrada). */
  entrada: string;
  /** `YYYY-MM-DD` (dia de sortida, que ja no és nit). */
  sortida: string;
}

export interface IndicadorsHostal {
  ocupacio: number; // %
  nitsOcupades: number;
  nitsDisponibles: number;
  preuMitjaNit: number;
  costPerNit: number;
  beneficiPerNit: number;
  duradaMitjana: number; // nits
}

const DIA = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00.000Z`);
const dia = (t: number) => new Date(t).toISOString().slice(0, 10);
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function indicadorsHostal(p: {
  estades: EstadaIndicador[];
  habitacions: number;
  /** Primer i últim dia del període (inclosos), `YYYY-MM-DD`. */
  desde: string;
  fins: string;
  /** Primer dia amb estades de l'hostal: les nits d'abans no són «possibles». */
  primerDia?: string | null;
  ingressosAllotjament: number;
  despeses: number;
}): IndicadorsHostal {
  const ini = Math.max(ms(p.desde), p.primerDia ? ms(p.primerDia) : -Infinity);
  const fiExcl = ms(p.fins) + DIA;
  const dies = Math.max(0, Math.round((fiExcl - ini) / DIA));
  const nitsDisponibles = p.habitacions * dies;

  const ocupades = new Set<string>();
  let nitsTotals = 0;
  let nEstades = 0;
  for (const e of p.estades) {
    const a = ms(e.entrada);
    const b = ms(e.sortida);
    if (!(b > a)) continue;
    nitsTotals += Math.round((b - a) / DIA);
    nEstades++;
    for (let t = Math.max(a, ini); t < Math.min(b, fiExcl); t += DIA) ocupades.add(`${e.habitacioId}|${dia(t)}`);
  }
  const nitsOcupades = ocupades.size;
  const preuMitjaNit = nitsOcupades > 0 ? r2(p.ingressosAllotjament / nitsOcupades) : 0;
  const costPerNit = nitsOcupades > 0 ? r2(p.despeses / nitsOcupades) : 0;
  return {
    ocupacio: nitsDisponibles > 0 ? Math.round((nitsOcupades / nitsDisponibles) * 100) : 0,
    nitsOcupades,
    nitsDisponibles,
    preuMitjaNit,
    costPerNit,
    beneficiPerNit: r2(preuMitjaNit - costPerNit),
    duradaMitjana: nEstades > 0 ? Math.round(nitsTotals / nEstades) : 0,
  };
}
