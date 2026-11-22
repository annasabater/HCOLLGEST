import { prisma } from '@/lib/db';
import { construeixFull, type ContracteFull, type EstadaFull } from '@/lib/ocupacio-contractes';
import { ocultaDelLlibre } from '@/lib/auth/restriccions';

const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export interface PersonaPeriode {
  id: string;
  nom: string;
  habitacio: string | null;
  entrada: string | null;
  sortida: string | null;
}

const filtrePeriode = (desde: string, fins: string) => ({
  deletedAt: null,
  estat: { not: 'CANCELLADA' as const },
  dataEntrada: { lte: new Date(`${fins}T23:59:59.999Z`) },
  dataSortida: { gte: new Date(`${desde}T00:00:00.000Z`) },
});

/** Persones que han estat en alguna estada del període (per triar-les al full). */
export async function getPersonesPeriode(desde: string, fins: string, restringit: boolean): Promise<PersonaPeriode[]> {
  const estades = await prisma.estancia.findMany({
    where: filtrePeriode(desde, fins),
    orderBy: { dataEntrada: 'asc' },
    select: {
      observacions: true,
      dataEntrada: true,
      dataSortida: true,
      habitacio: { select: { nom: true } },
      viatgers: { select: { huesped: { select: { id: true, nom: true, cognom1: true } } } },
    },
  });
  const mapa = new Map<string, PersonaPeriode>();
  for (const e of estades) {
    if (restringit && ocultaDelLlibre(e.observacions)) continue;
    for (const v of e.viatgers) {
      mapa.set(v.huesped.id, {
        id: v.huesped.id,
        nom: `${v.huesped.nom} ${v.huesped.cognom1}`.trim(),
        habitacio: e.habitacio?.nom ?? null,
        entrada: dia(e.dataEntrada),
        sortida: dia(e.dataSortida),
      });
    }
  }
  return [...mapa.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
}

/**
 * Full per contracte de les persones que han estat al període: de cada persona surt TOT
 * l'historial (totes les seves estades, no només les del període), un paràgraf per
 * contracte. `claus` (opcional) limita el full als contractes triats.
 */
export async function getOcupacio(desde: string, fins: string, restringit: boolean, claus?: string[]): Promise<ContracteFull[]> {
  const persones = (await getPersonesPeriode(desde, fins, restringit)).map((p) => p.id);
  if (persones.length === 0) return [];

  const estades = await prisma.estancia.findMany({
    where: { deletedAt: null, estat: { not: 'CANCELLADA' }, viatgers: { some: { huespedId: { in: persones } } } },
    select: {
      id: true,
      estanciaOrigenId: true,
      numContracte: true,
      dataEntrada: true,
      dataSortida: true,
      observacions: true,
      habitacio: { select: { nom: true } },
      viatgers: { select: { esTitular: true, huesped: { select: { id: true, nom: true, cognom1: true, telefon: true } } } },
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
      id: v.huesped.id,
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

  const full = construeixFull(dades, { restringit });
  if (!claus || claus.length === 0) return full;
  const triats = new Set(claus);
  return full.filter((c) => triats.has(c.clau));
}
