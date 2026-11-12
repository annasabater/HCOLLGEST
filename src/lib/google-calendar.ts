/**
 * Client mínim de Google Calendar (REST v3) per als recordatoris. Mateix client
 * OAuth que Drive i Ressenyes, amb el scope `calendar.app.created`: l'app només
 * pot veure i tocar el calendari que crea ella («Hostal Coll · Recordatoris»),
 * mai els calendaris personals. Refresh token propi, desat XIFRAT.
 */
import 'server-only';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
export const NOM_CALENDARI = 'Hostal Coll · Recordatoris';
/** `state` de l'OAuth del calendari (torna pel callback de les ressenyes). */
export const ESTAT_CALENDARI = 'hcoll-calendari';
const API = 'https://www.googleapis.com/calendar/v3';
/** Màxim que Google admet per a un avís: 4 setmanes. */
const MAX_MINUTS_AVIS = 40_320;

export function buildCalendarAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Falta GOOGLE_CLIENT_ID.');
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

async function gcal<T>(token: string, method: string, path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    const e = new Error(`Google Calendar ${res.status}: ${err?.error?.message ?? res.statusText}`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  return (await res.json()) as T;
}

/** Crea el calendari de l'app i en retorna l'id. */
export async function creaCalendari(token: string): Promise<string> {
  const c = await gcal<{ id: string }>(token, 'POST', '/calendars', {
    summary: NOM_CALENDARI,
    description: 'Recordatoris de gestio.hostalcoll.com (assegurances, revisions, contractes…). Es gestionen des de gestio.',
    timeZone: 'Europe/Madrid',
  });
  if (!c?.id) throw new Error('Google no ha creat el calendari.');
  return c.id;
}

/** El calendari encara existeix (no l'han esborrat des de Google)? */
export async function calendariExisteix(token: string, calId: string): Promise<boolean> {
  try {
    await gcal(token, 'GET', `/calendars/${encodeURIComponent(calId)}`);
    return true;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return false;
    throw e;
  }
}

export interface EventRecordatori {
  titol: string;
  descripcio: string;
  dia: string; // YYYY-MM-DD
  diesAbans: number[];
}

/**
 * Esdeveniment de 9:00 a 9:15 (hora de Madrid) el dia del recordatori, amb un
 * avís per a cada «dies abans» a la mateixa hora (0 = el mateix dia a les 9).
 * Google en permet 5 com a molt i fins a 4 setmanes abans.
 */
export function cosEvent(e: EventRecordatori) {
  const minuts = [...new Set(e.diesAbans.map((d) => Math.min(d * 1440, MAX_MINUTS_AVIS)))].sort((a, b) => b - a).slice(0, 5);
  return {
    summary: e.titol,
    description: e.descripcio,
    start: { dateTime: `${e.dia}T09:00:00`, timeZone: 'Europe/Madrid' },
    end: { dateTime: `${e.dia}T09:15:00`, timeZone: 'Europe/Madrid' },
    reminders: { useDefault: false, overrides: minuts.map((m) => ({ method: 'popup', minutes: m })) },
    transparency: 'transparent', // no marca l'hora com a ocupada
  };
}

/** Crea o actualitza l'esdeveniment; retorna el seu id. */
export async function desaEvent(token: string, calId: string, eventId: string | null, e: EventRecordatori): Promise<string> {
  const cal = encodeURIComponent(calId);
  if (eventId) {
    try {
      const r = await gcal<{ id: string }>(token, 'PUT', `/calendars/${cal}/events/${encodeURIComponent(eventId)}`, cosEvent(e));
      if (r?.id) return r.id;
    } catch (err) {
      const st = (err as { status?: number }).status;
      if (st !== 404 && st !== 410) throw err; // esborrat a Google: se'n crea un de nou
    }
  }
  const r = await gcal<{ id: string }>(token, 'POST', `/calendars/${cal}/events`, cosEvent(e));
  if (!r?.id) throw new Error('Google no ha creat l’esdeveniment.');
  return r.id;
}

export async function esborraEvent(token: string, calId: string, eventId: string): Promise<void> {
  try {
    await gcal(token, 'DELETE', `/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`);
  } catch (err) {
    const st = (err as { status?: number }).status;
    if (st !== 404 && st !== 410) throw err;
  }
}
