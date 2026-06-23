/**
 * Tarifes: tria la tarifa aplicable a una estada (per habitació i/o temporada)
 * per suggerir el preu de l'allotjament en crear la factura.
 */
import 'server-only';
import { prisma } from '../db';
import { nights } from '../dates';

/**
 * Tarifa aplicable per a una habitació en una data. Prioritat:
 * habitació concreta > tipus d'habitació > genèrica; i, dins de cada nivell,
 * la que té temporada definida abans que la de tot l'any.
 */
export async function getTarifaAplicable(habitacioId: string | null, data: Date) {
  const hab = habitacioId
    ? await prisma.habitacio.findUnique({ where: { id: habitacioId }, select: { tipus: true } })
    : null;
  const tipus = hab?.tipus ?? null;

  const tarifes = await prisma.tarifa.findMany({ where: { actiu: true } });
  const matches = tarifes.filter((t) => {
    if (t.dataInici && data < t.dataInici) return false;
    if (t.dataFi && data > t.dataFi) return false;
    if (t.habitacioId && t.habitacioId !== habitacioId) return false;
    if (t.tipusHabitacio && t.tipusHabitacio !== tipus) return false;
    return true;
  });
  const score = (t: (typeof matches)[number]) => {
    let s = 0;
    if (t.habitacioId) s += 4;
    else if (t.tipusHabitacio) s += 2;
    if (t.dataInici || t.dataFi) s += 1; // temporada concreta
    return s;
  };
  matches.sort((a, b) => score(b) - score(a));
  return matches[0] ?? null;
}

/** Preu suggerit d'allotjament = nits × tarifa aplicable (o null si no n'hi ha). */
export async function preuSuggeritAllotjament(
  habitacioId: string | null,
  dataEntrada: Date,
  dataSortida: Date,
): Promise<{ preu: number; nits: number; tarifa: string } | null> {
  const t = await getTarifaAplicable(habitacioId, dataEntrada);
  if (!t) return null;
  const nits = nights(dataEntrada, dataSortida);
  return { preu: Math.round(Number(t.preuNit) * nits * 100) / 100, nits, tarifa: t.nom };
}
