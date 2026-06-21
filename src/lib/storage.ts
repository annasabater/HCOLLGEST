/**
 * Almacenamiento de ficheros (adjuntos de gastos/activos: facturas, tickets…).
 * Para documentos de identidad usa además el cifrado (crypto.ts).
 *
 * Dos backends, elegidos automáticamente según el entorno:
 *   - Supabase Storage  → si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Vercel/prod).
 *   - Disco local        → bajo STORAGE_DIR (desarrollo sin Supabase).
 * El formato de la ruta relativa guardada en BD ("uploads/uuid-nombre.pdf") es el
 * mismo en ambos backends, así que las filas existentes siguen siendo válidas.
 *
 * ⚠ El disco de Vercel es efímero y de solo lectura: en producción SIEMPRE debe
 *   estar configurado Supabase Storage o los ficheros se perderían.
 */
import 'server-only';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getStorageDir, getSupabaseStorageConfig } from './env';

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Sanea un nombre de fichero (sin rutas ni caracteres raros). */
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

/** Tipo MIME a partir de la extensión (para servir el adjunto correctamente). */
export function mimeForPath(rel: string): string {
  const ext = rel.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

/**
 * Valida que la ruta relativa no intente salir del almacenamiento (path traversal)
 * ni contenga caracteres peligrosos. Devuelve la ruta normalizada con "/".
 */
function assertSafeRel(rel: string): string {
  const norm = rel.replace(/\\/g, '/');
  if (norm.startsWith('/') || norm.includes('..') || norm.includes('\0')) {
    throw new Error('Ruta de fitxer no permesa');
  }
  return norm;
}

// --- Backend Supabase Storage ------------------------------------------------

let supabaseClient: SupabaseClient | null = null;
const ensuredBuckets = new Set<string>();

function getSupabase(url: string, serviceKey: string): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

/** Crea el bucket (privado) si aún no existe. Idempotente por arranque. */
async function ensureBucket(sb: SupabaseClient, bucket: string): Promise<void> {
  if (ensuredBuckets.has(bucket)) return;
  const { data } = await sb.storage.getBucket(bucket);
  if (!data) {
    const { error } = await sb.storage.createBucket(bucket, { public: false });
    // 409 = ya existe (carrera entre lambdas): no es un error real.
    if (error && !/exists/i.test(error.message)) throw error;
  }
  ensuredBuckets.add(bucket);
}

// --- API pública -------------------------------------------------------------

/**
 * Guarda un buffer bajo <subdir>/ y devuelve la ruta RELATIVA
 * (p.ej. "uploads/uuid-ticket.pdf") para almacenar en BD.
 */
export async function saveUpload(
  buffer: Buffer,
  originalName: string,
  subdir = 'uploads',
): Promise<string> {
  const rel = `${subdir}/${randomUUID()}-${safeName(originalName)}`;
  const cfg = getSupabaseStorageConfig();

  if (cfg) {
    const sb = getSupabase(cfg.url, cfg.serviceKey);
    await ensureBucket(sb, cfg.bucket);
    const { error } = await sb.storage
      .from(cfg.bucket)
      .upload(rel, buffer, { contentType: mimeForPath(rel), upsert: false });
    if (error) throw new Error(`No s'ha pogut desar el fitxer: ${error.message}`);
    return rel;
  }

  // Fallback: disco local (desarrollo).
  const dir = path.join(getStorageDir(), subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(getStorageDir(), rel), buffer);
  return rel;
}

/**
 * Lee un fichero previamente guardado por saveUpload, a partir de su ruta
 * relativa. Valida contra path traversal. Lanza si no existe.
 */
export async function readUpload(rel: string): Promise<Buffer> {
  const safe = assertSafeRel(rel);
  const cfg = getSupabaseStorageConfig();

  if (cfg) {
    const sb = getSupabase(cfg.url, cfg.serviceKey);
    const { data, error } = await sb.storage.from(cfg.bucket).download(safe);
    if (error || !data) {
      throw new Error(`Fitxer no trobat: ${error?.message ?? safe}`);
    }
    return Buffer.from(await data.arrayBuffer());
  }

  // Fallback: disco local (desarrollo).
  const base = path.resolve(getStorageDir());
  const abs = path.resolve(base, safe);
  if (abs !== base && !abs.startsWith(base + path.sep)) {
    throw new Error('Ruta de fitxer no permesa');
  }
  return readFile(abs);
}
