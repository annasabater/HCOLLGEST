import { prisma } from '@/lib/db';
import { construeixFull, type ContracteFull, type EstadaFull } from '@/lib/ocupacio-contractes';

const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Carrega les estades del període i les agrupa per contracte (vegeu lib/ocupacio-contractes.ts). */
export async function getOcupacio(desde: string, fins: string, restringit: boolean): Promise<ContracteFull[]> {
  const estades = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      estat: { not: 'CANCELLADA' },
      dataEntrada: { lte: new Date(`${fins}T23:59:59.999Z`) },
      dataSortida: { gte: new Date(`${desde}T00:00:00.000Z`) },
    },
    select: {
      id: true,
      estanciaOrigenId: true,
      numContracte: true,
      dataEntrada: true,
      dataSortida: true,
      observacions: true,
      habitacio: { select: { nom: true } },
      viatgers: { select: { esTitular: true, huesped: { select: { nom: true, cognom1: true, telefon: true } } } },
      cobraments: { select: { import: true, metode: true, data: true, factura: { select: { numero: true } } } },
      pagamentsPrevistos: { select: { import: true, pagat: true, dataPrevista: true } },
    },
  });

  const dades: EstadaFull[] = estades.map((e) => ({
    id: e.id,
    origenId: e.estanciaOrigenId,
    numContracte: e.numContracte || null,
    habitacio: e.habitacio?.nom ?? null,
    entrada: dia(e.dataEntrada),
    sortida: dia(e.dataSortida),
    observacions: e.observacions,
    viatgers: e.viatgers.map((v) => ({
      nom: `${v.huesped.nom} ${v.huesped.cognom1}`.trim(),
      telefon: v.huesped.telefon,
      esTitular: v.esTitular,
    })),
    cobraments: e.cobraments.map((c) => ({
      import: Number(c.import),
      data: dia(c.data) ?? '',
      metode: c.metode,
      factura: c.factura?.numero ?? null,
    })),
    previstos: e.pagamentsPrevistos.map((p) => ({ import: Number(p.import), dataPrevista: dia(p.dataPrevista) ?? '', pagat: p.pagat })),
  }));

  return construeixFull(dades, { desde, fins, avui: new Date().toISOString().slice(0, 10), restringit });
}
