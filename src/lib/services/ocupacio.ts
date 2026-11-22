import { prisma } from '@/lib/db';
import { construeixOcupacio, type EstanciaOcupacio, type HabitacioOcupacio } from '@/lib/ocupacio';

const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Carrega les estades del període i les agrupa per habitació (vegeu lib/ocupacio.ts). */
export async function getOcupacio(desde: string, fins: string, restringit: boolean): Promise<HabitacioOcupacio[]> {
  const [habitacions, estades] = await Promise.all([
    prisma.habitacio.findMany({ select: { nom: true } }),
    prisma.estancia.findMany({
      where: {
        deletedAt: null,
        estat: { not: 'CANCELLADA' },
        dataEntrada: { lte: new Date(`${fins}T23:59:59.999Z`) },
        dataSortida: { gte: new Date(`${desde}T00:00:00.000Z`) },
      },
      select: {
        id: true,
        dataEntrada: true,
        dataSortida: true,
        observacions: true,
        habitacio: { select: { nom: true } },
        viatgers: { select: { esTitular: true, huesped: { select: { nom: true, cognom1: true, telefon: true } } } },
        cobraments: { select: { import: true, metode: true } },
        pagamentsPrevistos: { select: { import: true, pagat: true } },
      },
    }),
  ]);

  const dades: EstanciaOcupacio[] = estades.map((e) => ({
    id: e.id,
    habitacio: e.habitacio?.nom ?? null,
    entrada: dia(e.dataEntrada),
    sortida: dia(e.dataSortida),
    observacions: e.observacions,
    viatgers: e.viatgers.map((v) => ({
      nom: `${v.huesped.nom} ${v.huesped.cognom1}`.trim(),
      telefon: v.huesped.telefon,
      esTitular: v.esTitular,
    })),
    cobraments: e.cobraments.map((c) => ({ import: Number(c.import), metode: c.metode })),
    previstos: e.pagamentsPrevistos.map((p) => ({ import: Number(p.import), pagat: p.pagat })),
  }));

  return construeixOcupacio(dades, habitacions.map((h) => h.nom), {
    desde,
    fins,
    avui: new Date().toISOString().slice(0, 10),
    restringit,
  });
}
