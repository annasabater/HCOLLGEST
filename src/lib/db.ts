/**
 * Cliente Prisma único (singleton) — evita agotar conexiones en dev con HMR.
 *
 * En producció (Vercel) cada instància serverless té el seu pool: amb
 * `connection_limit=30` a la DATABASE_URL, poques instàncies alhora esgotaven
 * les 200 connexions del pooler de Supabase (EMAXCONN, 11/11/2026: el Balanç i
 * el panell petaven). Per això aquí es limita el pool de cada instància
 * (DB_CONNECTION_LIMIT, per defecte 5) sense haver de tocar la URL secreta.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** DATABASE_URL amb el `connection_limit` rebaixat al màxim permès (si en tenia més o cap). */
function urlAmbLimit(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const max = Math.max(1, Number(process.env.DB_CONNECTION_LIMIT) || 5);
    const actual = Number(u.searchParams.get('connection_limit'));
    if (!actual || actual > max) u.searchParams.set('connection_limit', String(max));
    return u.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(process.env.NODE_ENV === 'production' ? { datasourceUrl: urlAmbLimit() } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
