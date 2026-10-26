/**
 * Propostes d'habitació per a una estada (pur i testejat). Regles (acordades):
 * - Com a molt UN canvi d'habitació per proposta.
 * - Una habitació lliure tota l'estada, o dues: la primera fins que se'n va
 *   (o fins que l'altra queda lliure) i la segona fins al final.
 * - De més barata a més cara; com a molt 3, i sempre hi és la millor sense canvis
 *   si n'hi ha cap.
 * Quines habitacions entren (dobles i/o individuals) i el preu de cada tros ho
 * decideix qui crida.
 */
import { isoMesDies } from './pressupost-calcul';

export interface HabitacioProposta {
  nom: string;
  grup: string; // grup de tarifa amb què es cobra aquesta habitació
  ocupades: Set<number>; // nits (0..nits-1) que NO està lliure
}

export interface TramProposta {
  habitacio: string;
  grup: string;
  desde: string; // ISO
  fins: string; // ISO
  nits: number;
  total: number;
}

export interface Proposta {
  trams: TramProposta[];
  total: number;
}

type Preu = (grup: string, desde: number, fins: number) => Promise<number>;

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export async function proposaHabitacions(
  entrada: string,
  nits: number,
  habs: HabitacioProposta[],
  preu: Preu,
  max = 3,
): Promise<Proposta[]> {
  if (nits <= 0) return [];
  const primeraOcupada = (h: HabitacioProposta) => (h.ocupades.size ? Math.min(...h.ocupades) : nits);
  const lliureDesDe = (h: HabitacioProposta) => (h.ocupades.size ? Math.max(...h.ocupades) + 1 : 0);
  const tram = async (h: HabitacioProposta, i: number, j: number): Promise<TramProposta> => ({
    habitacio: h.nom, grup: h.grup, desde: isoMesDies(entrada, i), fins: isoMesDies(entrada, j), nits: j - i, total: await preu(h.grup, i, j),
  });
  const proposta = (trams: TramProposta[]): Proposta => ({ trams, total: r2(trams.reduce((a, t) => a + t.total, 0)) });

  const senseCanvis: Proposta[] = [];
  for (const h of habs) if (h.ocupades.size === 0) senseCanvis.push(proposta([await tram(h, 0, nits)]));

  const ambCanvi: Proposta[] = [];
  for (const a of habs) {
    for (const b of habs) {
      if (a === b) continue;
      // Canviar entre dues lliures tota l'estada del mateix tipus no aporta res.
      if (a.grup === b.grup && (a.ocupades.size === 0 || b.ocupades.size === 0)) continue;
      const kMin = Math.max(1, lliureDesDe(b));
      const kMax = Math.min(nits - 1, primeraOcupada(a));
      if (kMin > kMax) continue;
      // El dia del canvi: tan aviat com es pugui o tan tard com es pugui (la més barata).
      let millor: Proposta | null = null;
      for (const k of new Set([kMin, kMax])) {
        const p = proposta([await tram(a, 0, k), await tram(b, k, nits)]);
        if (!millor || p.total < millor.total) millor = p;
      }
      ambCanvi.push(millor!);
    }
  }

  const ordena = (ps: Proposta[]) => [...ps].sort((x, y) => x.total - y.total || x.trams.length - y.trams.length);
  const triades = ordena([...senseCanvis, ...ambCanvi]).slice(0, max);
  const millorSense = ordena(senseCanvis)[0];
  if (millorSense && !triades.some((p) => p.trams.length === 1)) triades[triades.length - 1] = millorSense;
  return ordena(triades);
}
