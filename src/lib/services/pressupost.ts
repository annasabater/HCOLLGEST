import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Següent número de pressupost proposat: el més alt que hi ha + 1, en 5 dígits
 * (00001, 00002…). Compta tots els pressupostos (el número és únic). Com que el
 * número és editable, l'usuari el pot ajustar (p. ex. deixar-lo a 00001 si esborra
 * els esborranys que no vol).
 */
export async function proximNumeroPressupost(db: Db): Promise<string> {
  const rows = await db.pressupost.findMany({ select: { numero: true } });
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.numero, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1).padStart(5, '0');
}

/** Totals a partir de les línies i el % d'IVA. */
export function calculaTotalsPressupost(
  linies: { import: number }[],
  ivaPercent: number,
): { base: number; iva: number; total: number } {
  const base = round2(linies.reduce((a, l) => a + (Number(l.import) || 0), 0));
  const iva = round2(base * (ivaPercent / 100));
  return { base, iva, total: round2(base + iva) };
}
