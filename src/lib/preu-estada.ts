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

export interface LiniaCalcul {
  concepte: string;
  quantitat: number;
  preuUnitat: number;
  subtotal: number;
}

const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/**
 * Bloc de la regla de 3 segons les nits de l'estada sencera: el més gran que hi
 * càpiga i tingui preu (mes ÷ 30, 2 setmanes ÷ 14, setmana ÷ 7). Menys d'una
 * setmana (p. ex. allargar uns dies una estada d'un mes): mes ÷ 30.
 */
export function blocReglaDe3(nitsEstada: number, p: Preus): { preu: number; dies: number; nom: string } | null {
  const blocs = [
    { preu: p.preuMes, dies: NITS_MES, nom: 'mes' },
    { preu: p.preuDosSetmanes, dies: 14, nom: '2 setmanes' },
    { preu: p.preuSetmana, dies: 7, nom: 'setmana' },
  ];
  const b = blocs.find((x) => x.preu && nitsEstada >= x.dies) ?? (p.preuMes ? blocs[0] : null);
  return b?.preu ? { preu: b.preu, dies: b.dies, nom: b.nom } : null;
}

/**
 * Desglossa `nits` nits d'un tros d'estada. `mensual` = regla de 3: totes les nits
 * al preu per nit del bloc que toca segons `nitsEstada` (les nits de l'estada
 * sencera; per defecte, les del tros). S'activa sola a partir de 30 nits o es
 * força a mà.
 */
export function desglossa(nits: number, p: Preus, mensual = nits >= NITS_MES, nitsEstada = nits): LiniaCalcul[] {
  if (nits <= 0) return [];

  // 1) Regla de 3: preu del bloc ÷ els seus dies × nits. El subtotal es calcula
  // sobre el total (no sobre el preu/nit arrodonit) perquè 30 nits sigui
  // exactament el mes i 14 exactament les 2 setmanes.
  const b = mensual ? blocReglaDe3(nitsEstada, p) : null;
  if (b) {
    return [{
      concepte: `${b.preu.toLocaleString('ca-ES')} €/${b.nom} ÷ ${b.dies}`,
      quantitat: nits,
      preuUnitat: r2(b.preu / b.dies),
      subtotal: r2((b.preu * nits) / b.dies),
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
