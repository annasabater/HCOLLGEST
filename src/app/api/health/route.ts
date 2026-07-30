import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSupabaseStorageConfig } from '@/lib/env';
import { saveUpload, deleteUpload } from '@/lib/storage';

// GET /api/health — diagnòstic de desplegament (sense login).
// Informa de connexió a BD, taules/seed, variables d'entorn (booleans, sense
// valors) i si l'emmagatzematge de fitxers (documents del DNI) és escrivible.
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
    JWT_SECRET: Boolean(process.env.JWT_SECRET),
    DOCUMENT_ENCRYPTION_KEY: Boolean(process.env.DOCUMENT_ENCRYPTION_KEY),
  };

  let db: 'ok' | 'error' = 'error';
  let tablesReady = false;
  let usuaris = 0;
  let establiment = false;
  let detail: string | undefined;

  try {
    usuaris = await prisma.usuari.count(); // falla si no hi ha taules / connexió
    db = 'ok';
    tablesReady = true;
    establiment = (await prisma.establiment.count()) > 0;
  } catch (e) {
    detail = e instanceof Error ? `${e.name}` : 'unknown';
  }

  // Prova real d'escriptura a l'emmagatzematge (on es desen les fotos del DNI,
  // xifrades). Escriu un fitxer de prova i l'esborra. Si falla, desar documents
  // fallarà (p.ex. Supabase no configurat i el disc local no és escrivible a Vercel).
  const supabase = Boolean(getSupabaseStorageConfig());
  let storage: { supabase: boolean; writable: boolean; backend: string; error?: string };
  try {
    const rel = await saveUpload(Buffer.from('health-probe'), 'health-probe.txt');
    await deleteUpload(rel);
    storage = { supabase, writable: true, backend: supabase ? 'supabase' : 'disc-local' };
  } catch (e) {
    storage = {
      supabase,
      writable: false,
      backend: supabase ? 'supabase' : 'disc-local',
      error: e instanceof Error ? e.message : 'unknown',
    };
  }

  const ready =
    db === 'ok' && tablesReady && establiment && env.JWT_SECRET && env.DOCUMENT_ENCRYPTION_KEY && storage.writable;

  return NextResponse.json(
    {
      ready,
      db,
      tablesReady,
      seed: { establiment, usuaris },
      env,
      storage,
      ...(detail ? { detail } : {}),
      hint: ready
        ? 'Tot a punt.'
        : !env.JWT_SECRET || !env.DOCUMENT_ENCRYPTION_KEY
          ? 'Falten variables d’entorn a Vercel (JWT_SECRET / DOCUMENT_ENCRYPTION_KEY).'
          : db !== 'ok'
            ? 'No es connecta a la BD o falten taules: executa `prisma migrate deploy`.'
            : !establiment
              ? 'Falta el seed: executa `pnpm db:seed`.'
              : !storage.writable
                ? 'L’emmagatzematge de fitxers no és escrivible: configura Supabase Storage (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + bucket). Per això no es desen les fotos del DNI.'
                : 'Revisa la configuració.',
    },
    { status: ready ? 200 : 503 },
  );
}

export const dynamic = 'force-dynamic';
