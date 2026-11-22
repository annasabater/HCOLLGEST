/**
 * Estil visual de l'app, triat a /config i desat en una galeta (per navegador).
 * - 'original': l'estil de sempre (arrodonit, barra granat).
 * - 'nou': quadrat i net, inspirat en Tezel, amb els grisos de hostalcoll.com i barra lateral granat fosc.
 * El CSS del nou estil viu a globals.css sota `html[data-estil="nou"]`.
 */
export const ESTIL_COOKIE = 'estil';
export const ESTILS = ['original', 'nou'] as const;
export type Estil = (typeof ESTILS)[number];
export const ESTIL_PER_DEFECTE: Estil = 'original';

export function estilValid(v: string | undefined | null): Estil {
  return v === 'nou' || v === 'original' ? v : ESTIL_PER_DEFECTE;
}

/**
 * Barra lateral de l'estil «nou» (només hi compta quan l'estil és 'nou'):
 * - 'clara': blanca amb vora, l'actiu en rosat.
 * - 'granat': tota granat fosc, l'actiu en crema amb lletra granat (proposta E).
 * CSS a globals.css sota `html[data-estil="nou"][data-barra="granat"]`.
 */
export const BARRA_COOKIE = 'barra';
export const BARRES = ['clara', 'granat'] as const;
export type Barra = (typeof BARRES)[number];

export function barraValida(v: string | undefined | null): Barra {
  return v === 'granat' ? 'granat' : 'clara';
}
