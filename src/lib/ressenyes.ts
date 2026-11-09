/**
 * Ressenyes de Google publicades a hostalcoll.com — lògica pura (testejada).
 *
 * Ordre a la web: primer les DESTACADES, després per `ordre` (menor = abans)
 * i, en empat, la més recent.
 */

/** Idiomes de hostalcoll.com (els mateixos que el selector de la web). */
export const IDIOMES_WEB = ['es', 'ca', 'en', 'fr'] as const;
export type IdiomaWeb = (typeof IDIOMES_WEB)[number];
export type Traduccions = Record<IdiomaWeb, string>;

/** Llegeix el camp JSON `traduccions`; null si falta o està incomplet. */
export function parseTraduccions(v: unknown): Traduccions | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const out: Partial<Traduccions> = {};
  for (const l of IDIOMES_WEB) {
    const t = o[l];
    if (typeof t !== 'string' || !t.trim()) return null;
    out[l] = t;
  }
  return out as Traduccions;
}

export interface RessenyaOrdenable {
  id: string;
  destacada: boolean;
  ordre: number;
  dataRessenya: Date;
}

export function ordenaPublicades<T extends RessenyaOrdenable>(llista: T[]): T[] {
  return [...llista].sort(
    (a, b) =>
      Number(b.destacada) - Number(a.destacada) ||
      a.ordre - b.ordre ||
      b.dataRessenya.getTime() - a.dataRessenya.getTime(),
  );
}

export type Direccio = 'AMUNT' | 'AVALL';

/**
 * Mou una ressenya una posició amunt/avall DINS del seu grup (destacades o no:
 * una destacada sempre va davant, així que no té sentit creuar-les).
 * Retorna el nou `ordre` per a cada id (0..n-1 sobre la llista sencera) o
 * `null` si no es pot moure (ja és a l'extrem del grup o no hi és).
 */
export function mouOrdre<T extends RessenyaOrdenable>(
  llista: T[],
  id: string,
  dir: Direccio,
): Map<string, number> | null {
  const ord = ordenaPublicades(llista);
  const i = ord.findIndex((r) => r.id === id);
  if (i < 0) return null;
  const j = dir === 'AMUNT' ? i - 1 : i + 1;
  const a = ord[i];
  const b = ord[j];
  if (!a || !b || a.destacada !== b.destacada) return null;
  ord[i] = b;
  ord[j] = a;
  return new Map(ord.map((r, k) => [r.id, k]));
}

/** Escurça el text per a la vista prèvia, sense tallar paraules si es pot. */
export function textCurt(text: string | null | undefined, max = 140): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const tall = t.slice(0, max);
  const espai = tall.lastIndexOf(' ');
  return `${(espai > max * 0.6 ? tall.slice(0, espai) : tall).trimEnd()}…`;
}

/** Estrelles plenes + buides (p. ex. 4 → ★★★★☆). */
export function estrelles(n: number): string {
  const v = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(v) + '☆'.repeat(5 - v);
}
