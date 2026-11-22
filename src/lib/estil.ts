/**
 * Estil visual de l'app, triat a /config i desat en una galeta (per navegador).
 * - 'original': l'estil de sempre (arrodonit, barra granat).
 * - 'nou': quadrat i net, inspirat en Tezel, amb els grisos de hostalcoll.com.
 * El CSS del nou estil viu a globals.css sota `html[data-estil="nou"]`.
 */
export const ESTIL_COOKIE = 'estil';
export const ESTILS = ['original', 'nou'] as const;
export type Estil = (typeof ESTILS)[number];
export const ESTIL_PER_DEFECTE: Estil = 'original';

export function estilValid(v: string | undefined | null): Estil {
  return v === 'nou' || v === 'original' ? v : ESTIL_PER_DEFECTE;
}
