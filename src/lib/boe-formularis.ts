/**
 * Vigilància del BOE: detecta ordres noves que aproven o modifiquen els models
 * d'impostos de l'hostal. Els formularis oficials que omple /impostos són còpies
 * fixes dels annexos del BOE: si n'hi ha una de nova, cal actualitzar el PDF i la
 * posició de les caselles (src/lib/formularis-aeat).
 */

export const MODELS_VIGILATS = ['303', '130', '115', '390', '180', '100'] as const;

/** Ordres que ja estan aplicades als formularis actuals (no avisen). */
export const ORDRES_APLICADES: Record<string, string> = {
  'BOE-A-2026-1761': 'Orden HAC/27/2026 (303 i 390)',
  'BOE-A-2015-1656': 'Orden HAP/258/2015 (130)',
};

/** Models vigilats que esmenta el títol d'una disposició del BOE ("modelo(s) ... 303 ..."). */
export function modelsDelTitol(titol: string): string[] {
  if (!/\bmodelos?\b/i.test(titol)) return [];
  return MODELS_VIGILATS.filter((m) => new RegExp(`(?<![\\d.,])${m}(?![\\d.,])`).test(titol));
}

export interface ItemBoe { id: string; titol: string; url: string }

/** Recorre el JSON del sumari diari del BOE (API de dades obertes) i en treu les disposicions. */
export function itemsDelSumari(json: unknown): ItemBoe[] {
  const out: ItemBoe[] = [];
  const walk = (o: unknown) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    const r = o as Record<string, unknown>;
    if (typeof r.identificador === 'string' && typeof r.titulo === 'string') {
      const pdf = r.url_pdf as { texto?: string } | string | undefined;
      const url = (typeof r.url_html === 'string' && r.url_html) || (typeof pdf === 'string' ? pdf : pdf?.texto) || '';
      out.push({ id: r.identificador, titol: r.titulo, url });
    }
    Object.values(r).forEach(walk);
  };
  walk(json);
  return out;
}
