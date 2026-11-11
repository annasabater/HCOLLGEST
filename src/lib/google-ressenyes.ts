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
  const mateixes = candidates.filter((c) => c.puntuacio === puntuacio);
  return (
    mateixes.find((c) => normalitzaNom(c.autor) === n) ??
    mateixes.find((c) => nomsEquivalents(normalitzaNom(c.autor), n)) ??
    null
  );
}

/**
 * Noms que són la mateixa persona encara que Google els escrigui diferent:
 *  - un conté l'altre sencer, si té almenys dues paraules
 *    ("GuitarOnTop / Cristo Fontecilla" ↔ "Cristo Fontecilla");
 *  - una errata de 1–2 lletres en noms llargs ("Santa Crruz" ↔ "Santa Cruz").
 */
export function nomsEquivalents(a: string, b: string): boolean {
  if (!a || !b) return false;
  const [curt, llarg] = a.length <= b.length ? [a, b] : [b, a];
  if (curt.split(' ').length >= 2 && ` ${llarg} `.includes(` ${curt} `)) return true;
  return curt.length >= 10 && distancia(a, b) <= 2;
}

/** Distància de Levenshtein (nombre mínim de lletres a canviar). */
function distancia(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}
