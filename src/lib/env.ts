/**
 * Acceso validado a variables de entorno (servidor).
 * Validación perezosa: cada secreto se comprueba la primera vez que se usa,
 * con un mensaje claro si falta. Así `next build` no peta por env ausentes.
 *
 * ⚠ NUNCA loguear estos valores (JWT secret, clave de cifrado, credenciales Mossos).
 */
import 'server-only';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(
      `Falta la variable de entorno obligatoria "${name}". Copia .env.example a .env y rellénala.`,
    );
  }
  return v;
}

export function getDatabaseUrl(): string {
  return required('DATABASE_URL');
}

export function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(required('JWT_SECRET'));
}

export function getJwtTtlSeconds(): number {
  const raw = process.env.JWT_TTL_SECONDS;
  const n = raw ? Number(raw) : 28800; // 8 h por defecto
  return Number.isFinite(n) && n > 0 ? n : 28800;
}

/** Clave de 32 bytes (base64) para AES-256-GCM. */
export function getEncryptionKey(): Buffer {
  const key = Buffer.from(required('DOCUMENT_ENCRYPTION_KEY'), 'base64');
  if (key.length !== 32) {
    throw new Error(
      'DOCUMENT_ENCRYPTION_KEY debe ser exactamente 32 bytes en base64. ' +
        'Genera una con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  return key;
}

export function getStorageDir(): string {
  return process.env.STORAGE_DIR || './storage';
}

/**
 * Almacenamiento de ficheros. Si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY están
 * configurados (producción/Vercel), se usa Supabase Storage; si no, disco local
 * bajo STORAGE_DIR (desarrollo sin Supabase). ⚠ NUNCA loguear la service key.
 */
export function getSupabaseStorageConfig(): {
  url: string;
  serviceKey: string;
  bucket: string;
} | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || url.trim() === '' || !serviceKey || serviceKey.trim() === '') {
    return null;
  }
  return {
    url,
    serviceKey,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'adjunts',
  };
}

export const mossosEnv = {
  get fileIdentifier(): string | undefined {
    return process.env.MOSSOS_FILE_IDENTIFIER || undefined;
  },
  get encoding(): 'latin1' | 'utf-8' {
    return (process.env.MOSSOS_ENCODING as 'latin1' | 'utf-8') || 'latin1';
  },
};

/**
 * Certificat per a l'enviament a l'AEAT (Veri*Factu) — TLS client (.pfx/.p12).
 * Retorna null si no està configurat (llavors el flux d'enviament queda inactiu).
 * ⚠ NUNCA loguear la contraseña ni el contenido del certificado.
 */
export function getAeatCertConfig(): { pfxPath: string; passphrase: string } | null {
  const pfxPath = process.env.AEAT_CERT_PFX_PATH;
  if (!pfxPath || pfxPath.trim() === '') return null;
  return { pfxPath, passphrase: process.env.AEAT_CERT_PASS ?? '' };
}

/**
 * Browserbase (navegador remot per pujar a Mossos des de la web, ja que Vercel
 * no pot executar un navegador). Retorna null si no està configurat.
 */
export function getBrowserbaseConfig(): { apiKey: string; projectId: string } | null {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || apiKey.trim() === '' || !projectId || projectId.trim() === '') return null;
  return { apiKey, projectId };
}

export const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Hostal Coll';
