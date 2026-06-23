import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/health — diagnòstic de desplegament (sense login).
// Informa de connexió a BD, taules/seed i variables d'entorn (booleans, sense valors).
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

  const ready = db === 'ok' && tablesReady && establiment && env.JWT_SECRET && env.DOCUMENT_ENCRYPTION_KEY;

  return NextResponse.json(
    {
      ready,
      db,
      tablesReady,
      seed: { establiment, usuaris },
      env,
      ...(detail ? { detail } : {}),
      hint: ready
        ? 'Tot a punt.'
        : !env.JWT_SECRET || !env.DOCUMENT_ENCRYPTION_KEY
          ? 'Falten variables d’entorn a Vercel (JWT_SECRET / DOCUMENT_ENCRYPTION_KEY).'
          : db !== 'ok'
            ? 'No es connecta a la BD o falten taules: executa `prisma migrate deploy`.'
            : !establiment
              ? 'Falta el seed: executa `pnpm db:seed`.'
              : 'Revisa la configuració.',
    },
    { status: ready ? 200 : 503 },
  );
}

export const dynamic = 'force-dynamic';
