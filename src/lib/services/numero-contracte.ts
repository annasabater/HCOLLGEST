import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Següent número de contracte de l'any: el més alt registrat (també dels
 * contractes separats de viatgers) + 1, ignorant les ampliacions amb punt.
 * Si no n'hi ha cap, {yy}001 (2026 → 26001).
 */
export async function seguentNumeroContracte(anyNum: number, db: Db = prisma): Promise<string> {
  const [estancies, separats] = await Promise.all([
    db.estancia.findMany({ where: { anyContracte: anyNum, deletedAt: null }, select: { numContracte: true } }),
    db.estanciaViatger.findMany({
      where: { numContracteSeparat: { not: null }, estancia: { anyContracte: anyNum, deletedAt: null } },
      select: { numContracteSeparat: true },
    }),
  ]);
  let max = 0;
  for (const numStr of [...estancies.map((e) => e.numContracte), ...separats.map((s) => s.numContracteSeparat ?? '')]) {
    // Només números "purs" (sense punt d'ampliació) i numèrics.
    if (!numStr || numStr.includes('.')) continue;
    const n = parseInt(numStr, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max > 0 ? String(max + 1) : `${String(anyNum).slice(-2)}001`;
}

/** Si un número de contracte ja el fa servir una altra estada (o un contracte separat) de l'any. */
export async function numeroContracteEnUs(anyNum: number, numero: string, exclou?: string | null, db: Db = prisma): Promise<boolean> {
  const n = numero.trim();
  if (!n) return false;
  const [found, foundSeparat] = await Promise.all([
    db.estancia.findFirst({
      where: { anyContracte: anyNum, numContracte: n, deletedAt: null, ...(exclou ? { id: { not: exclou } } : {}) },
      select: { id: true },
    }),
    db.estanciaViatger.findFirst({
      where: { numContracteSeparat: n, estancia: { anyContracte: anyNum, deletedAt: null, ...(exclou ? { id: { not: exclou } } : {}) } },
      select: { id: true },
    }),
  ]);
  return found != null || foundSeparat != null;
}

/**
 * Número de «continuació» per a una nova ampliació d'una estada arrel: el seu
 * número + el sufix lliure més baix (_1, _2…) entre les ampliacions vives. Sense
 * forats: si se n'ha esborrat alguna, el seu sufix torna a quedar lliure. S'usa
 * "_" (no ".") per distingir el CONTRACTE de les FACTURES. `null` si l'arrel no té número.
 */
export async function numeroContinuacio(rootId: string, rootNum: string, db: Db = prisma): Promise<string | null> {
  if (!rootNum.trim()) return null;
  const germanes = await db.estancia.findMany({
    where: { estanciaOrigenId: rootId, deletedAt: null },
    select: { numContracte: true },
  });
  const usats = new Set(
    germanes
      .map((g) => g.numContracte.match(/_(\d+)$/)?.[1])
      .filter((s): s is string => s != null)
      .map(Number),
  );
  let seq = 1;
  while (usats.has(seq)) seq += 1;
  return `${rootNum}_${seq}`;
}
