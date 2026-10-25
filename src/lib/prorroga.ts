/**
 * Pròrroga d'estada (pur i testejat): quan una estada llarga s'acaba, el tauler
 * avisa per preguntar a l'hoste si vol allargar. Regles (acordades):
 * - Només estades d'almenys `MIN_NITS_PRORROGA` nits.
 * - L'avís surt `DIES_AVIS_PRORROGA` dies abans de la sortida.
 * - Es pot aplaçar uns dies; torna a sortir aquell dia.
 * - L'estat val per a una data de sortida concreta: si la sortida canvia, es
 *   torna a preguntar.
 */

export const DIES_AVIS_PRORROGA = 18;
export const MIN_NITS_PRORROGA = 20;

export type EstatProrroga = 'PER_PREGUNTAR' | 'PREGUNTAT' | 'SI' | 'NO';

const DIA = 86_400_000;

/** Mitjanit local del dia de `d`. */
export function inicDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Dies sencers de `desde` a `fins` (per dia de calendari, sense hores). */
export function diesEntre(desde: Date, fins: Date): number {
  return Math.round((inicDia(fins).getTime() - inicDia(desde).getTime()) / DIA);
}

const mateixDia = (a: Date | null, b: Date | null) => !!a && !!b && diesEntre(a, b) === 0;

export interface EstadaProrroga {
  dataEntrada: Date | null;
  dataSortida: Date | null;
  prorrogaEstat: string | null;
  prorrogaSortida: Date | null;
  prorrogaAplacatFins: Date | null;
}

/** Estat vigent (si la sortida ha canviat des de la decisió, torna a «per preguntar»). */
export function estatProrroga(e: EstadaProrroga): EstatProrroga {
  if (!e.prorrogaEstat || !mateixDia(e.prorrogaSortida, e.dataSortida)) return 'PER_PREGUNTAR';
  return e.prorrogaEstat as EstatProrroga;
}

/**
 * On va l'estada al tauler avui: 'avis' (targeta), 'aplacada' (en gris, torna a
 * sortir més endavant) o null (no surt: curta, lluny, ja decidida o passada).
 */
export function situacioProrroga(e: EstadaProrroga, avui: Date): 'avis' | 'aplacada' | null {
  if (!e.dataEntrada || !e.dataSortida) return null;
  if (diesEntre(e.dataEntrada, e.dataSortida) < MIN_NITS_PRORROGA) return null;
  const falten = diesEntre(avui, e.dataSortida);
  if (falten < 0 || falten > DIES_AVIS_PRORROGA) return null;
  const estat = estatProrroga(e);
  if (estat === 'SI' || estat === 'NO') return null;
  const aplacat = mateixDia(e.prorrogaSortida, e.dataSortida) ? e.prorrogaAplacatFins : null;
  if (aplacat && diesEntre(avui, aplacat) > 0) return 'aplacada';
  return 'avis';
}
