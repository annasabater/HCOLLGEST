/**
 * Estades que NO acaben de veritat perquè continuen en una ampliació. Les ampliacions
 * (.1, .2…) pengen totes de l'estada ORIGINAL, no l'una de l'altra: per saber si una
 * estada continua, es mira si al seu grup (l'original + totes les ampliacions) n'hi
 * ha una que comença el dia que aquesta acaba (o just després).
 */
import 'server-only';
import { prisma } from '../db';

const DIA_MS = 86_400_000;

export async function idsAmbContinuacio(
  ests: { id: string; estanciaOrigenId: string | null; dataSortida: Date | null }[],
): Promise<Set<string>> {
  const out = new Set<string>();
  if (ests.length === 0) return out;
  const arrels = [...new Set(ests.map((e) => e.estanciaOrigenId ?? e.id))];
  const grup = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      estat: { not: 'CANCELLADA' },
      OR: [{ id: { in: arrels } }, { estanciaOrigenId: { in: [...arrels, ...ests.map((e) => e.id)] } }],
    },
    select: { id: true, estanciaOrigenId: true, dataEntrada: true },
  });
  for (const e of ests) {
    if (!e.dataSortida) continue;
    const arrel = e.estanciaOrigenId ?? e.id;
    const sortida = e.dataSortida.getTime();
    const continua = grup.some(
      (g) =>
        g.id !== e.id &&
        (g.estanciaOrigenId === arrel || g.estanciaOrigenId === e.id) &&
        g.dataEntrada != null &&
        g.dataEntrada.getTime() >= sortida - DIA_MS / 2 &&
        g.dataEntrada.getTime() <= sortida + DIA_MS,
    );
    if (continua) out.add(e.id);
  }
  return out;
}
