/**
 * Càrrega de les despeses d'un període per als informes agrupats (per proveïdor o per
 * categoria). L'agrupació i els totals són a `lib/informes-despeses.ts` (pura, testejada).
 */
import 'server-only';
import { prisma } from '../db';

/**
 * Totes les despeses entre dos dies inclosos (`YYYY-MM-DD`), fiances incloses
 * (`esFianca`): l'agrupació decideix si les compta o no, segons el mode de l'informe.
 */
export async function despesesPeriode(desde: string, fins: string) {
  const gte = new Date(`${desde}T00:00:00.000Z`);
  const lt = new Date(`${fins}T00:00:00.000Z`);
  lt.setUTCDate(lt.getUTCDate() + 1);
  return prisma.gasto.findMany({
    where: { deletedAt: null, data: { gte, lt } },
    select: {
      import: true,
      esFianca: true,
      baseImposable: true,
      ivaPercent: true,
      desglossamentIva: true,
      proveidor: { select: { nom: true, cif: true } },
      categoria: { select: { nom: true } },
    },
  });
}
