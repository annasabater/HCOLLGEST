/**
 * Detecció de despeses repetides (la mateixa factura pujada dues vegades).
 * Pur i testejat; la consulta a la BD és a `services/gasto-duplicats.ts`.
 *
 * És repetida si:
 *  1. té el MATEIX número de factura i el mateix proveïdor (o, si algun dels dos
 *     no en té, el mateix import), o
 *  2. té el MATEIX import i la MATEIXA data, i el mateix proveïdor (o algun dels
 *     dos sense proveïdor): tiquets i albarans que no porten número.
 * Només és un avís: hi ha casos legítims (dos rebuts iguals el mateix dia).
 */

export interface DadesGasto {
  /** `YYYY-MM-DD`. */
  dia: string;
  import: number;
  numFactura?: string | null;
  proveidorId?: string | null;
}

/** Número de factura comparable: sense espais, guions, barres ni punts, en minúscules. */
export function normalitzaNumFactura(n: string | null | undefined): string {
  return (n ?? '').toLowerCase().replace(/[\s\-_/.]+/g, '');
}

const mateixImport = (a: number, b: number) => Math.abs(a - b) < 0.005;

export function esDuplicat(nou: DadesGasto, existent: DadesGasto): boolean {
  const provA = nou.proveidorId || null;
  const provB = existent.proveidorId || null;
  const mateixProv = provA !== null && provA === provB;
  const provCompatible = mateixProv || provA === null || provB === null;
  const nf = normalitzaNumFactura(nou.numFactura);

  if (nf && nf === normalitzaNumFactura(existent.numFactura)) {
    if (mateixProv) return true;
    if (provCompatible && mateixImport(nou.import, existent.import)) return true;
  }
  return provCompatible && nou.dia === existent.dia && mateixImport(nou.import, existent.import);
}
