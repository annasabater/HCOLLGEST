/**
 * Ressenyes de Google publicades a hostalcoll.com — lògica pura (testejada).
 *
 * Ordre a la web: primer les DESTACADES i després de la MÉS NOVA a la més antiga
 * (decisió de l'Anna: sense ordre manual).
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
  dataRessenya: Date;
}

/** Destacades primer; després de la més nova a la més antiga. */
export function ordenaPublicades<T extends RessenyaOrdenable>(llista: T[]): T[] {
  return [...llista].sort(
    (a, b) =>
      Number(b.destacada) - Number(a.destacada) || b.dataRessenya.getTime() - a.dataRessenya.getTime(),
  );
}

/** Escurça el text per a la vista prèvia, sense tallar paraules si es pot. */
export function textCurt(text: string | null | undefined, max = 140): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const tall = t.slice(0, max);
  const espai = tall.lastIndexOf(' ');
  return `${(espai > max * 0.6 ? tall.slice(0, espai) : tall).trimEnd()}…`;
}

export type PrecisioData = 'DIA' | 'MES' | 'ANY';

/** Data de la ressenya segons el que se'n sap: «12/05/2026», «maig de 2026» o «2025». */
export function dataRessenyaText(iso: string | Date, precisio: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  if (precisio === 'ANY') return String(d.getUTCFullYear());
  if (precisio === 'MES') {
    return new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  }
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** Estrelles plenes + buides (p. ex. 4 → ★★★★☆). */
export function estrelles(n: number): string {
  const v = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(v) + '☆'.repeat(5 - v);
}
