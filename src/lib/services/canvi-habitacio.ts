/**
 * Canvi d'habitació a mitja estada (mateix contracte, sense ampliació).
 *
 * Desa un `CanviHabitacio` (a partir de `data` l'hoste dorm a la nova) i posa la
 * nova com a habitació actual de l'estada. L'ocupació de cada habitació es
 * calcula per trams (src/lib/habitacio-trams.ts): l'antiga queda lliure des del
 * dia del canvi i la nova no compta abans, així no xoca amb qui hi era abans.
 */
import 'server-only';
import { z } from 'zod';
import { prisma } from '../db';
import { audit } from '../audit';
import { toISODate } from '../dates';

export const CanviHabitacioSchema = z.object({
  habitacioId: z.string().min(1),
  data: z.coerce.date(),
});

const fallo = (msg: string) => new Error(`Validación fallida: ${msg}`);

export async function canviarHabitacio(
  estanciaId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = CanviHabitacioSchema.parse(raw);
  const est = await prisma.estancia.findFirst({
    where: { id: estanciaId, deletedAt: null },
    select: {
      id: true,
      habitacioId: true,
      dataEntrada: true,
      dataSortida: true,
      canvisHabitacio: { orderBy: { data: 'desc' }, take: 1, select: { data: true } },
    },
  });
  if (!est) throw fallo('estada no trobada');
  if (!est.dataEntrada || !est.dataSortida) throw fallo("l'estada ha de tenir data d'entrada i de sortida");
  if (input.habitacioId === est.habitacioId) throw fallo("l'hoste ja és en aquesta habitació");
  if (input.data <= est.dataEntrada) {
    throw fallo(
      "el canvi ha de ser després del dia d'entrada. Si l'habitació era una altra des del principi, edita l'estada.",
    );
  }
  if (input.data >= est.dataSortida) throw fallo('el canvi ha de ser abans del dia de sortida');
  const ultim = est.canvisHabitacio[0];
  if (ultim && input.data <= ultim.data) {
    throw fallo(`ja hi ha un canvi d'habitació el ${toISODate(ultim.data)}; el nou ha de ser posterior`);
  }
  const nova = await prisma.habitacio.findFirst({
    where: { id: input.habitacioId, deletedAt: null },
    select: { id: true, nom: true },
  });
  if (!nova) throw fallo('habitació no trobada');

  return prisma.$transaction(async (tx) => {
    const canvi = await tx.canviHabitacio.create({
      data: {
        estanciaId,
        data: input.data,
        habitacioAnteriorId: est.habitacioId,
        habitacioNovaId: nova.id,
        usuariId: actor?.id ?? null,
      },
    });
    await tx.estancia.update({ where: { id: estanciaId }, data: { habitacioId: nova.id } });
    // La neteja de la sortida es fa a l'habitació on surt (la nova).
    await tx.tascaNeteja.updateMany({
      where: { vinculadaSortidaId: estanciaId, estat: 'PENDENT' },
      data: { habitacioId: nova.id },
    });
    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'MODIFICACIO',
        entitat: 'estancia',
        entitatId: estanciaId,
        detall: {
          canviHabitacio: { de: est.habitacioId, a: nova.id, data: toISODate(input.data) },
        },
        ip,
      },
      tx,
    );
    return { id: canvi.id };
  });
}

/** Desfà l'ÚLTIM canvi d'habitació: l'estada torna a l'habitació d'abans. */
export async function desferCanviHabitacio(
  estanciaId: string,
  canviId: string,
  actor: { id: string } | null,
  ip: string | null,
) {
  const ultim = await prisma.canviHabitacio.findFirst({
    where: { estanciaId },
    orderBy: { data: 'desc' },
  });
  if (!ultim || ultim.id !== canviId) throw fallo("només es pot desfer l'últim canvi d'habitació");

  await prisma.$transaction(async (tx) => {
    await tx.estancia.update({ where: { id: estanciaId }, data: { habitacioId: ultim.habitacioAnteriorId } });
    await tx.tascaNeteja.updateMany({
      where: { vinculadaSortidaId: estanciaId, estat: 'PENDENT' },
      data: { habitacioId: ultim.habitacioAnteriorId },
    });
    await tx.canviHabitacio.delete({ where: { id: ultim.id } });
    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'MODIFICACIO',
        entitat: 'estancia',
        entitatId: estanciaId,
        detall: {
          desferCanviHabitacio: {
            de: ultim.habitacioNovaId,
            a: ultim.habitacioAnteriorId,
            data: toISODate(ultim.data),
          },
        },
        ip,
      },
      tx,
    );
  });
}
