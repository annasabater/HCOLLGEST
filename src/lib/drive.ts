/**
 * Client mínim de Google Drive (REST v3) via fetch, per a l'export mensual.
 * Auth: OAuth 2.0 amb refresh token (l'app actua en nom de l'usuari, els fitxers
 * queden al SEU Drive). Scope `drive.file`: l'app només veu/toca el que crea ella.
 *
 * Config: GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET (variables d'entorn). El refresh
 * token es desa xifrat a la BD després que l'usuari autoritzi una vegada.
 */
import 'server-only';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export function driveConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function creds() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Falta GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (Google Drive no configurat).');
  }
  return { clientId, clientSecret };
}

/** URL de consentiment per obtenir el refresh token (access_type=offline). */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = creds();
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

/** Bescanvia el codi d'autorització per tokens (inclou el refresh_token). */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<{ refreshToken: string | null; accessToken: string }> {
  const { clientId, clientSecret } = creds();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`Google OAuth ha fallat: ${data.error ?? res.status}`);
  }
  return { refreshToken: data.refresh_token ?? null, accessToken: data.access_token };
}

/** Obté un access token a partir del refresh token desat. */
export async function getAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = creds();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`No s'ha pogut renovar l'accés a Google Drive: ${data.error ?? res.status}`);
  }
  return data.access_token;
}

function q(s: string): string {
  return s.replace(/'/g, "\\'");
}

/** Cerca una carpeta pel nom dins d'un pare (o l'arrel). Retorna l'id o null. */
export async function findFolder(
  token: string,
  name: string,
  parentId?: string,
): Promise<string | null> {
  const parts = [
    `mimeType='${FOLDER_MIME}'`,
    `name='${q(name)}'`,
    'trashed=false',
    parentId ? `'${parentId}' in parents` : "'root' in parents",
  ];
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(parts.join(' and '))}&fields=files(id)&pageSize=1`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.json()) as { files?: { id: string }[]; error?: unknown };
  if (!res.ok) throw new Error(`Drive: error cercant carpeta «${name}»`);
  return data.files?.[0]?.id ?? null;
}

/** Cerca o crea una carpeta pel nom dins d'un pare. */
export async function ensureFolder(
  token: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const existing = await findFolder(token, name, parentId);
  if (existing) return existing;
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  const data = (await res.json()) as { id?: string; error?: unknown };
  if (!res.ok || !data.id) throw new Error(`Drive: no s'ha pogut crear la carpeta «${name}»`);
  return data.id;
}

/** Crea la cadena de carpetes (p. ex. ["2026","juny"]) i retorna l'id de la fulla. */
export async function ensureFolderPath(
  token: string,
  segments: string[],
  rootId?: string,
): Promise<string> {
  let parent = rootId;
  for (const seg of segments) {
    parent = await ensureFolder(token, seg, parent);
  }
  return parent as string;
}

/** Cerca un fitxer (no carpeta) pel nom dins d'un pare. Retorna l'id o null. */
async function findFile(token: string, name: string, parentId: string): Promise<string | null> {
  const parts = [
    `name='${q(name)}'`,
    `mimeType!='${FOLDER_MIME}'`,
    'trashed=false',
    `'${parentId}' in parents`,
  ];
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(parts.join(' and '))}&fields=files(id)&pageSize=1`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = (await res.json()) as { files?: { id: string }[] };
  if (!res.ok) throw new Error(`Drive: error cercant fitxer «${name}»`);
  return data.files?.[0]?.id ?? null;
}

/**
 * Puja un fitxer dins d'un pare; si ja existeix un amb el mateix nom, l'actualitza
 * (així el full acumulatiu «s'hi va actualitzant» en comptes de duplicar-se).
 */
export async function uploadOrUpdateFile(
  token: string,
  opts: { name: string; parentId: string; mimeType: string; data: Buffer },
): Promise<string> {
  const existing = await findFile(token, opts.name, opts.parentId);
  let fileId = existing;

  if (!fileId) {
    const meta = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: opts.name, parents: [opts.parentId] }),
    });
    const m = (await meta.json()) as { id?: string };
    if (!meta.ok || !m.id) throw new Error(`Drive: no s'ha pogut crear «${opts.name}»`);
    fileId = m.id;
  }

  const up = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': opts.mimeType },
      body: new Uint8Array(opts.data),
    },
  );
  if (!up.ok) throw new Error(`Drive: no s'ha pogut pujar el contingut de «${opts.name}»`);
  return fileId;
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const PDF_MIME = 'application/pdf';
