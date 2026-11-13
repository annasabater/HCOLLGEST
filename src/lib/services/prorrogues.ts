import 'server-only';
import { prisma } from '../db';
import { diaMadrid } from '../recordatoris';
import {
  dataProposadaProrroga,
  diesEntreDies,
  estatProrroga,
  situacioEstada,
  type EstatProrroga,
  type SituacioEstada,
} from '../prorroga';

export interface EventProrroga {
  id: string;
  tipus: string; // PREGUNTAT | NO_CONTESTA | RECORDATORI | APLACAT | SI | NO | NOTA
  detall: string | null;
  data: string; // ISO
}

export interface EstadaEnCurs {
  id: string;
  habitacio: string | null;
  numContracte: string | null;
  entrada: string; // YYYY-MM-DD
  sortida: string; // YYYY-MM-DD
  nits: number;
  diesFalten: number;
  dataProposada: string;
  estat: EstatProrroga;
  situacio: SituacioEstada;
  aplacatFins: string | null; // YYYY-MM-DD
  recordatoriEnviat: boolean;
  idioma: string | null;
  numViatgers: number;
  viatgers: { nom: string; cognom1: string; telefon: string | null; esTitular: boolean; esMenor: boolean }[];
  events: EventProrroga[];
}

/**
 * Totes les estades en curs (ja han entrat i encara no han sortit), ordenades
 * per sortida, amb l'estat de la pròrroga i la seva línia del temps.
 */
export async function getEstadesEnCurs(now = new Date()): Promise<{ avui: string; estades: EstadaEnCurs[] }> {
  const avui = diaMadrid(now);
  const ini = new Date(`${avui}T00:00:00Z`);
  const rows = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      estat: { in: ['RESERVA', 'EN_CURS'] },
      // Marge d'un dia per la diferència d'hora; es filtra exacte a sota.
      dataEntrada: { lt: new Date(ini.getTime() + 2 * 86_400_000) },
      dataSortida: { gte: new Date(ini.getTime() - 86_400_000) },
    },
    orderBy: { dataSortida: 'asc' },
    take: 60,
    include: {
      habitacio: { select: { nom: true } },
      viatgers: { include: { huesped: { select: { nom: true, cognom1: true, telefon: true } } } },
      ampliacions: { where: { deletedAt: null }, select: { id: true } },
      prorrogaEvents: { orderBy: { createdAt: 'asc' }, take: 50 },
    },
  });

  const estades: EstadaEnCurs[] = [];
  for (const e of rows) {
    if (!e.dataEntrada || !e.dataSortida) continue;
    const entrada = diaMadrid(e.dataEntrada);
    const sortida = diaMadrid(e.dataSortida);
    if (entrada > avui || sortida < avui) continue;
    const estat = estatProrroga(e);
    const mateixa = !!e.prorrogaSortida && diaMadrid(e.prorrogaSortida) === sortida;
    const aplacatFins = mateixa && e.prorrogaAplacatFins ? diaMadrid(e.prorrogaAplacatFins) : null;
    const teAmpliacio = e.ampliacions.length > 0;
    estades.push({
      id: e.id,
      habitacio: e.habitacio?.nom ?? null,
      numContracte: e.numContracte,
      entrada,
      sortida,
      nits: diesEntreDies(entrada, sortida),
      diesFalten: diesEntreDies(avui, sortida),
      dataProposada: dataProposadaProrroga(entrada, sortida),
      estat,
      situacio: situacioEstada({ entrada, sortida, estat, aplacatFins, teAmpliacio }, avui),
      aplacatFins,
      recordatoriEnviat: !!e.recordatoriSortida && diaMadrid(e.recordatoriSortida) === sortida,
      idioma: e.idioma,
      numViatgers: e.numViatgers,
      viatgers: e.viatgers
        .sort((a, b) => Number(b.esTitular) - Number(a.esTitular))
        .map((v) => ({ nom: v.huesped.nom, cognom1: v.huesped.cognom1, telefon: v.huesped.telefon, esTitular: v.esTitular, esMenor: v.esMenor })),
      events: e.prorrogaEvents.map((x) => ({ id: x.id, tipus: x.tipus, detall: x.detall, data: x.createdAt.toISOString() })),
    });
  }
  return { avui, estades };
}

