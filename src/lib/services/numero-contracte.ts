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

/** «26012_1» → «26012»; «26012» → «26012»; buit → buit. */
function numeroBase(num: string): string {
  return num.trim().replace(/_\d+$/, '');
}

/**
 * Número de «continuació» per a una nova ampliació de l'estada `estanciaId`:
 * el número BASE (sense sufix) + el sufix lliure més baix (_1, _2…). La base és
 * la de l'estada que s'amplia; si no en té, la de l'estada més recent de la
 * cadena que en tingui (la primera pot ser sense número —p. ex. una fiança— i
 * la segona ja tenir-ne: 26012 → 26012_1). Sense forats: si se n'ha esborrat
 * alguna, el seu sufix torna a quedar lliure. S'usa "_" (no ".") per distingir
 * el CONTRACTE de les FACTURES. `null` si cap estada de la cadena té número.
 */
export async function numeroContinuacio(estanciaId: string, db: Db = prisma): Promise<string | null> {
  const est = await db.estancia.findUniqueOrThrow({
    where: { id: estanciaId },
    select: { id: true, estanciaOrigenId: true, numContracte: true, anyContracte: true },
  });
  const rootId = est.estanciaOrigenId ?? est.id;
  const cadena = await db.estancia.findMany({
    where: { OR: [{ id: rootId }, { estanciaOrigenId: rootId }], deletedAt: null },
    select: { numContracte: true },
    orderBy: { dataEntrada: 'desc' },
  });
  const base = numeroBase(est.numContracte) || (cadena.map((c) => numeroBase(c.numContracte)).find((n) => n) ?? '');
  if (!base) return null;

  const prefix = `${base}_`;
  const usats = new Set(
    cadena
      .map((c) => c.numContracte.trim())
      .filter((n) => n.startsWith(prefix) && /^\d+$/.test(n.slice(prefix.length)))
      .map((n) => Number(n.slice(prefix.length))),
  );
  let seq = 1;
  while (usats.has(seq) || (await numeroContracteEnUs(est.anyContracte, `${prefix}${seq}`, null, db))) seq += 1;
  return `${prefix}${seq}`;
}
