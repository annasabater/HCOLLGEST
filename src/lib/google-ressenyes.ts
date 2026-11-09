/**
 * Ressenyes de la Google Business Profile API — lògica pura (testejada).
 * Format de l'API v4 (accounts.locations.reviews): starRating ONE..FIVE,
 * comment (pot portar la traducció automàtica de Google), createTime ISO,
 * reviewReply.comment.
 */

export interface GoogleReview {
  name?: string;
  reviewId: string;
  reviewer?: { displayName?: string; isAnonymous?: boolean };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
}

const ESTRELLES: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

/** "FIVE" → 5; null si no hi ha puntuació vàlida. */
export function puntuacioGoogle(star: string | undefined): number | null {
  return (star && ESTRELLES[star]) || null;
}

/**
 * Google afegeix la seva traducció automàtica al comentari:
 *   "(Translated by Google) Great place…\n\n(Original)\nLloc fantàstic…"
 * (o a l'inrevés, amb el text original primer). Retornem NOMÉS l'original:
 * la ressenya tal com la va escriure l'hoste.
 */
export function textOriginal(comment: string | undefined | null): string | null {
  const c = (comment ?? '').trim();
  if (!c) return null;
  const orig = c.match(/\(Original\)\s*\n?([\s\S]*)$/);
  if (orig?.[1]?.trim()) return orig[1].trim();
  // Original primer i després "(Translated by Google) …": ens quedem amb el de davant.
  const tradDespres = c.split(/\n*\(Translated by Google\)/)[0];
  if (tradDespres?.trim()) return tradDespres.trim();
  return c;
}

/** Normalitza un nom per comparar (minúscules, sense accents ni signes). */
export function normalitzaNom(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface CandidataWeb {
  id: string;
  autor: string;
  puntuacio: number;
}

/**
 * Busca, entre les ressenyes importades de la web (sense id de Google), la que és
 * la mateixa que una ressenya de Google: mateix autor (normalitzat) i mateixes
 * estrelles. Així no surt duplicada en sincronitzar.
 */
export function aparellaAmbWeb(
  autor: string,
  puntuacio: number,
  candidates: CandidataWeb[],
): CandidataWeb | null {
  const n = normalitzaNom(autor);
  if (!n) return null;
  return candidates.find((c) => c.puntuacio === puntuacio && normalitzaNom(c.autor) === n) ?? null;
}
