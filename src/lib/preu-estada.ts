/**
 * Desglossament del preu d'un tros d'estada amb els preus d'una temporada (pur i
 * testejat). Regles (acordades amb l'hostal):
 * - Estada de 30 nits o més: es cobra a preu de mes, PROPORCIONAL a les nits
 *   (mes ÷ 30 × nits). 31 nits = mes × 31/30; 45 nits = mes × 1,5. Si l'hoste
 *   canvia d'habitació o de temporada, cada tros va amb el seu preu de mes.
 *   També es pot forçar a mà; llavors el bloc és el més gran que hi cap:
 *   16 nits = 2 setmanes ÷ 14 × 16; 9 nits = setmana ÷ 7 × 9.
 * - «Per nits» (forçat a mà) en una estada de 30+ nits: mes (30 nits) sencer i
 *   la resta en setmanes i dies (32 nits = 1 mes + 2 dies).
 * - Menys de 30 nits: blocs grans primer, 2 setmanes (14) → setmana (7); els dies
 *   que sobren a `preuDia4` si en queden ≥4, si no `preuDia`. Sense límit: es
 *   paga el que diu la tarifa encara que passi del preu del mes.
 */

export const NITS_MES = 30;

export interface Preus {
  preuDia: number | null; preuDia4: number | null;
  preuSetmana: number | null; preuDosSetmanes: number | null; preuMes: number | null;
}

/** Bloc de la regla de 3 triat a mà (sense, el decideixen les nits de l'estada). */
export const BLOCS_REGLA_DE_3 = ['setmana', 'dues', 'mes'] as const;
export type BlocReglaDe3 = (typeof BLOCS_REGLA_DE_3)[number];
/** Paràmetre de la URL → bloc vàlid (o undefined = automàtic). */
export const blocDe = (s: string | null | undefined): BlocReglaDe3 | undefined =>
  (BLOCS_REGLA_DE_3 as readonly string[]).includes(s ?? '') ? (s as BlocReglaDe3) : undefined;

/** Preu i divisor d'una línia de regla de 3 (per poder-los corregir a mà). */
export interface BlocAplicat { preu: number; dies: number; nom: string }

export interface LiniaCalcul {
  concepte: string;
  quantitat: number;
  preuUnitat: number;
  subtotal: number;
  bloc?: BlocAplicat; // només a les línies de regla de 3
}

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/**
 * Fa un mes de calendari sencer o més? (dates ISO 'YYYY-MM-DD'). És l'excepció
 * del febrer: de l'1/2 a l'1/3 són 28 nits però és un mes, i va a preu de mes
 * (÷ 30 × les nits reals). La resta de mesos ja en tenen 30 o 31.
 */
export function mesSencer(entrada: string, sortida: string): boolean {
  const [y, m, d] = entrada.split('-').map(Number) as [number, number, number];
  // Mateix dia del mes següent; si no existeix (31/1 → 31/2), l'últim dia del mes.
  const ultimDia = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const unMes = new Date(Date.UTC(y, m, Math.min(d, ultimDia))).toISOString().slice(0, 10);
  return sortida >= unMes;
}

/**
 * Nits que compten per decidir la regla de 3: les reals o, si l'estada fa un mes
 * de calendari sencer (febrer), com a mínim les d'un mes.
 */
export function nitsPerBloc(entrada: string, sortida: string): number {
  const nits = Math.round((Date.parse(`${sortida}T00:00:00Z`) - Date.parse(`${entrada}T00:00:00Z`)) / 86_400_000);
  return mesSencer(entrada, sortida) ? Math.max(nits, NITS_MES) : nits;
}

/**
 * Bloc de la regla de 3 segons les nits de l'estada sencera: el més gran que hi
 * càpiga i tingui preu (mes ÷ 30, 2 setmanes ÷ 14, setmana ÷ 7). Menys d'una
 * setmana (p. ex. allargar uns dies una estada d'un mes): mes ÷ 30.
 * `forcat`: el bloc triat a mà (p. ex. qui ha estat un mes i allarga 2 setmanes
 * → «mes», encara que l'allargament en sigui de 14 nits); si la temporada no en
 * té preu, es torna a l'automàtic.
 */
export function blocReglaDe3(nitsEstada: number, p: Preus, forcat?: BlocReglaDe3): BlocAplicat | null {
  const blocs = [
    { id: 'mes', preu: p.preuMes, dies: NITS_MES, nom: 'mes' },
    { id: 'dues', preu: p.preuDosSetmanes, dies: 14, nom: '2 setmanes' },
    { id: 'setmana', preu: p.preuSetmana, dies: 7, nom: 'setmana' },
  ];
  const triat = forcat ? blocs.find((x) => x.id === forcat && x.preu) : undefined;
  const b = triat ?? blocs.find((x) => x.preu && nitsEstada >= x.dies) ?? (p.preuMes ? blocs[0] : null);
  return b?.preu ? { preu: b.preu, dies: b.dies, nom: b.nom } : null;
}

/** Concepte d'una línia de regla de 3: «650 €/mes ÷ 30». */
export function concepteBloc(b: BlocAplicat): string {
  return `${b.preu.toLocaleString('ca-ES')} €/${b.nom} ÷ ${b.dies}`;
}

/**
 * Desglossa `nits` nits d'un tros d'estada. `mensual` = regla de 3: totes les nits
 * al preu per nit del bloc que toca segons `nitsEstada` (les nits de l'estada
 * sencera; per defecte, les del tros) o del bloc `forcat`. S'activa sola a
 * partir de 30 nits (o d'un mes de calendari) o es força a mà.
 */
export function desglossa(nits: number, p: Preus, mensual = nits >= NITS_MES, nitsEstada = nits, forcat?: BlocReglaDe3): LiniaCalcul[] {
  if (nits <= 0) return [];

  // 1) Regla de 3: preu del bloc ÷ els seus dies × nits. El subtotal es calcula
  // sobre el total (no sobre el preu/nit arrodonit) perquè 30 nits sigui
  // exactament el mes i 14 exactament les 2 setmanes.
  const b = mensual ? blocReglaDe3(nitsEstada, p, forcat) : null;
  if (b) {
    return [{
      concepte: concepteBloc(b),
      quantitat: nits,
      preuUnitat: r2(b.preu / b.dies),
      subtotal: r2((b.preu * nits) / b.dies),
      bloc: b,
    }];
  }

  // 2) Per nits: blocs grans primer (mes de 30 nits → 2 setmanes → setmana) + dies.
  // El mes només hi entra si s'ha forçat «per nits» en una estada de 30+ nits.
  const linies: LiniaCalcul[] = [];
  let rem = nits;
  const bloc = (preu: number | null, dies: number, nom: string) => {
    if (!preu || rem < dies) return;
    const q = Math.floor(rem / dies);
    linies.push({ concepte: nom, quantitat: q, preuUnitat: preu, subtotal: r2(q * preu) });
    rem -= q * dies;
  };
  bloc(p.preuMes, NITS_MES, 'Mes');
  bloc(p.preuDosSetmanes, 14, '2 setmanes');
  bloc(p.preuSetmana, 7, 'Setmana');
  if (rem > 0) {
    const diaFb = p.preuDia ?? p.preuDia4 ?? (p.preuSetmana ? p.preuSetmana / 7 : p.preuMes ? p.preuMes / NITS_MES : 0);
    const dia4Fb = p.preuDia4 ?? p.preuDia ?? diaFb;
    const usaDia4 = rem >= 4 && (p.preuDia4 != null || p.preuDia == null);
    const preuUnitat = r2(usaDia4 ? dia4Fb : diaFb);
    linies.push({ concepte: rem >= 4 ? 'Dia (4+ dies)' : 'Dia', quantitat: rem, preuUnitat, subtotal: r2(rem * preuUnitat) });
  }
  return linies;
}
