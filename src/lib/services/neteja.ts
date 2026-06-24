/**
 * Servei de neteja (Fase 1.5). Gestiona el "full de neteja diari" per persona:
 * en comptes de crear tasques d'una en una, es desa d'un cop el conjunt
 * d'habitacions que una persona neteja un dia concret.
 */
import 'server-only';
import { prisma } from '../db';
import { audit } from '../audit';
import { TascaNetejaDiaSchema } from '../validation/neteja';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inici del dia (UTC) de la data donada, per emmagatzemar/comparar per dia. */
function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Desa el full de neteja d'un dia per a una persona. Reconcilia les tasques:
 * - habitació marcada → crea/actualitza la tasca (tipus + nota) assignada a la
 *   persona; si hi havia una tasca de sortida sense assignar, l'adopta.
 * - habitació desmarcada que tenia assignada → si prové d'una sortida (auto),
 *   la deixa sense assignar (segueix pendent de netejar); si era manual,
 *   l'elimina.
 */
export async function desarFullDia(
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = TascaNetejaDiaSchema.parse(raw);
  const personId = input.assignadaA;
  const day = startOfDay(input.data);
  const next = new Date(day.getTime() + DAY_MS);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.tascaNeteja.findMany({
      where: { data: { gte: day, lt: next } },
    });

    const marcades = new Set(input.items.map((i) => i.habitacioId));

    // 1) Habitacions marcades: crea o actualitza la tasca d'aquesta persona.
    for (const item of input.items) {
      const meva = existing.find(
        (t) => t.habitacioId === item.habitacioId && t.assignadaA === personId,
      );
      // Si no en té cap, adopta una tasca sense assignar (p. ex. sortida auto).
      const lliure = existing.find(
        (t) => t.habitacioId === item.habitacioId && t.assignadaA === null,
      );
      const target = meva ?? lliure;

      if (target) {
        await tx.tascaNeteja.update({
          where: { id: target.id },
          data: { tipus: item.tipus, notes: item.notes ?? null, assignadaA: personId },
        });
      } else {
        await tx.tascaNeteja.create({
          data: {
            data: day,
            habitacioId: item.habitacioId,
            tipus: item.tipus,
            notes: item.notes ?? null,
            assignadaA: personId,
            estat: 'PENDENT',
          },
        });
      }
    }

    // 2) Tasques que tenia assignades i ja no estan marcades.
    for (const t of existing) {
      if (t.assignadaA === personId && t.habitacioId && !marcades.has(t.habitacioId)) {
        if (t.vinculadaSortidaId) {
          // Prové d'una sortida: segueix pendent, però sense assignar.
          await tx.tascaNeteja.update({ where: { id: t.id }, data: { assignadaA: null } });
        } else {
          await tx.tascaNeteja.delete({ where: { id: t.id } });
        }
      }
    }

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'MODIFICACIO',
        entitat: 'tasca_neteja',
        detall: { fullDia: true, data: day.toISOString(), assignadaA: personId, habitacions: input.items.length },
        ip,
      },
      tx,
    );

    const tasques = await tx.tascaNeteja.findMany({
      where: { data: { gte: day, lt: next } },
      include: { habitacio: true, treballador: true },
      orderBy: [{ data: 'asc' }],
    });
    return { tasques };
  });
}
