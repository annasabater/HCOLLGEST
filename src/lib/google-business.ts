/**
 * Client mínim de la Google Business Profile API (via fetch) per llegir les
 * ressenyes de la fitxa de l'hostal. Mateix client OAuth que Google Drive
 * (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) però amb el scope `business.manage`
 * i un refresh token propi, desat XIFRAT a la BD.
 *
 * ⚠ Google ha d'aprovar l'accés a la Business Profile API del projecte de Google
 * Cloud: fins aleshores les crides tornen 403 (o quota 0) i la sincronització
 * desa l'error a `establiment.ressenyesSyncError` sense trencar res.
 */
import 'server-only';
import type { GoogleReview } from './google-ressenyes';

export const BUSINESS_SCOPE = 'https://www.googleapis.com/auth/business.manage';

export function businessConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** URL de consentiment (access_type=offline per tenir refresh token). */
export function buildBusinessAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Falta GOOGLE_CLIENT_ID.');
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: BUSINESS_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

async function gget<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string; status?: string } } | null;
    const msg = body?.error?.message ?? res.statusText;
    throw new Error(`Google ${res.status}${body?.error?.status ? ` ${body.error.status}` : ''}: ${msg}`);
  }
  return (await res.json()) as T;
}

/**
 * Troba la fitxa de l'hostal: primer compte i primera ubicació que hi tingui
 * accés l'usuari que ha connectat. Retorna "accounts/X/locations/Y" i el títol.
 */
export async function trobaUbicacio(token: string): Promise<{ location: string; titol: string }> {
  const comptes = await gget<{ accounts?: { name: string; accountName?: string }[] }>(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    token,
  );
  for (const compte of comptes.accounts ?? []) {
    const ubic = await gget<{ locations?: { name: string; title?: string }[] }>(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${compte.name}/locations?readMask=name,title&pageSize=100`,
      token,
    );
    const primera = ubic.locations?.[0];
    if (primera) return { location: `${compte.name}/${primera.name}`, titol: primera.title ?? '' };
  }
  throw new Error('Aquest compte de Google no gestiona cap fitxa d’empresa.');
}

export interface PaginaRessenyes {
  reviews: GoogleReview[];
  averageRating: number | null;
  totalReviewCount: number | null;
}

/** Totes les ressenyes de la fitxa (pàgines de 50), de la més recent a la més antiga. */
export async function llistaRessenyes(token: string, location: string): Promise<PaginaRessenyes> {
  const out: GoogleReview[] = [];
  let averageRating: number | null = null;
  let totalReviewCount: number | null = null;
  let pageToken: string | undefined;
  for (let i = 0; i < 40; i++) {
    const p = new URLSearchParams({ pageSize: '50', orderBy: 'updateTime desc' });
    if (pageToken) p.set('pageToken', pageToken);
    const r = await gget<{
      reviews?: GoogleReview[];
      averageRating?: number;
      totalReviewCount?: number;
      nextPageToken?: string;
    }>(`https://mybusiness.googleapis.com/v4/${location}/reviews?${p.toString()}`, token);
    out.push(...(r.reviews ?? []));
    averageRating = r.averageRating ?? averageRating;
    totalReviewCount = r.totalReviewCount ?? totalReviewCount;
    pageToken = r.nextPageToken;
    if (!pageToken) break;
  }
  return { reviews: out, averageRating, totalReviewCount };
}
