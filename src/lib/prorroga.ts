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

// ── Estades en curs (tauler): totes les estades, amb la data que es proposa per
// preguntar i l'estat de cada una. Dates com a «YYYY-MM-DD» (dia de Madrid).

/** Estades curtes: es proposa preguntar uns dies abans de la sortida. */
export const DIES_AVIS_CURTA = 3;

const utcDia = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
export const diesEntreDies = (a: string, b: string) => Math.round((utcDia(b) - utcDia(a)) / DIA);
export const sumaDiesDia = (s: string, n: number) => new Date(utcDia(s) + n * DIA).toISOString().slice(0, 10);

/** Dia en què es proposa preguntar si vol allargar (mai abans de l'entrada). */
/**
 * `entrada` = primera entrada de la cadena (si ja ha allargat, compta tota
 * l'estada per saber si és llarga); `noAbansDe` = inici del tram actual (no es
 * proposa tornar a preguntar abans que comenci l'ampliació).
 */
export function dataProposadaProrroga(entrada: string, sortida: string, noAbansDe: string = entrada): string {
  const nits = diesEntreDies(entrada, sortida);
  const d = sumaDiesDia(sortida, -(nits >= MIN_NITS_PRORROGA ? DIES_AVIS_PRORROGA : DIES_AVIS_CURTA));
  const minim = noAbansDe > entrada ? noAbansDe : entrada;
  return d < minim ? minim : d;
}

export type SituacioEstada = 'ALLARGA' | 'MARXA' | 'APLACAT' | 'ESPERANT' | 'TOCA' | 'PER_PREGUNTAR';

export function situacioEstada(
  e: {
    entrada: string;
    sortida: string;
    estat: EstatProrroga;
    aplacatFins: string | null;
    teAmpliacio: boolean;
    entradaTram?: string;
    /** Dia triat a mà per preguntar (si no, el proposat). */
    preguntarEl?: string | null;
  },
  avui: string,
): SituacioEstada {
  if (e.teAmpliacio || e.estat === 'SI') return 'ALLARGA';
  if (e.estat === 'NO') return 'MARXA';
  if (e.aplacatFins && e.aplacatFins > avui) return 'APLACAT';
  if (e.estat === 'PREGUNTAT') return 'ESPERANT';
  const proposada = e.preguntarEl ?? dataProposadaProrroga(e.entrada, e.sortida, e.entradaTram);
  return avui >= proposada ? 'TOCA' : 'PER_PREGUNTAR';
}

/**
 * Recordatori de sortida: quin dia toca i si està pendent.
 * - Per defecte, el dia abans de la sortida (o el dia triat a mà).
 * - Si ja se n'ha enviat un, només n'hi ha un altre de pendent si s'ha triat un
 *   dia posterior a l'últim enviament (p. ex. un 3 dies abans i un altre el dia abans).
 */
export function recordatoriSortida(
  sortida: string,
  triat: string | null,
  ultimEnviat: string | null,
): { dia: string; pendent: boolean; triat: boolean } {
  const valid = triat && triat <= sortida ? triat : null;
  const dia = valid ?? sumaDiesDia(sortida, -1);
  const pendent = !ultimEnviat || (!!valid && valid > ultimEnviat);
  return { dia, pendent, triat: !!valid };
}
