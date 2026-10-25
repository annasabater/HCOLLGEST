/**
 * Desglossament del preu d'un tros d'estada amb els preus d'una temporada (pur i
 * testejat). Regles (acordades amb l'hostal):
 * - Estada de 30 nits o més: es cobra a preu de mes, PROPORCIONAL a les nits
 *   (mes ÷ 30 × nits). 31 nits = mes × 31/30; 45 nits = mes × 1,5. Si l'hoste
 *   canvia d'habitació o de temporada, cada tros va amb el seu preu de mes.
 *   També es pot forçar a mà (p. ex. qui ja ha estat un mes i allarga).
 * - Menys de 30 nits: blocs grans primer, 2 setmanes (14) → setmana (7); els dies
 *   que sobren a `preuDia4` si en queden ≥4, si no `preuDia`. Sense límit: es
 *   paga el que diu la tarifa encara que passi del preu del mes.
 */

export const NITS_MES = 30;

export interface Preus {
  preuDia: number | null; preuDia4: number | null;
  preuSetmana: number | null; preuDosSetmanes: number | null; preuMes: number | null;
}

export interface LiniaCalcul {
  concepte: string;
  quantitat: number;
  preuUnitat: number;
  subtotal: number;
}

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/**
 * Desglossa `nits` nits d'un tros d'estada. `mensual` = cobrar a preu de mes ÷ 30
 * (per defecte, si el tros ja fa un mes; qui crida hi posa l'estada sencera, o
 * el força a mà, p. ex. per allargar una estada d'un mes).
 */
export function desglossa(nits: number, p: Preus, mensual = nits >= NITS_MES): LiniaCalcul[] {
  if (nits <= 0) return [];

  // 1) Estada llarga: mes ÷ 30 per nit. El subtotal es calcula sobre el total
  // (no sobre el preu/nit arrodonit) perquè 30 nits sigui exactament el mes.
  if (p.preuMes && mensual) {
    return [{
      concepte: `${p.preuMes.toLocaleString('ca-ES')} €/mes ÷ 30`,
      quantitat: nits,
      preuUnitat: r2(p.preuMes / NITS_MES),
      subtotal: r2((p.preuMes * nits) / NITS_MES),
    }];
  }

  // 2) Estada curta: blocs + dies.
  const linies: LiniaCalcul[] = [];
  let rem = nits;
  const bloc = (preu: number | null, dies: number, nom: string) => {
    if (!preu || rem < dies) return;
    const q = Math.floor(rem / dies);
    linies.push({ concepte: nom, quantitat: q, preuUnitat: preu, subtotal: r2(q * preu) });
    rem -= q * dies;
  };
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
