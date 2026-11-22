/**
 * Càrrega de les despeses d'un període per als informes agrupats (per proveïdor o per
 * categoria). L'agrupació i els totals són a `lib/informes-despeses.ts` (pura, testejada).
 */
import 'server-only';
import { prisma } from '../db';
import { agrupaDespeses, type AgruparPer } from '../informes-despeses';

/** Despeses reals (sense fiances) entre dos dies inclosos (`YYYY-MM-DD`). */
export async function informeDespeses(desde: string, fins: string, per: AgruparPer) {
  const gte = new Date(`${desde}T00:00:00.000Z`);
  const lt = new Date(`${fins}T00:00:00.000Z`);
  lt.setUTCDate(lt.getUTCDate() + 1);
  const gastos = await prisma.gasto.findMany({
    where: { deletedAt: null, esFianca: false, data: { gte, lt } },
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
  return agrupaDespeses(gastos, per);
}
