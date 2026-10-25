import 'server-only';
import { prisma } from '../db';
import { DIES_AVIS_PRORROGA, diesEntre, estatProrroga, inicDia, situacioProrroga, type EstatProrroga } from '../prorroga';

export interface EstadaAvisProrroga {
  id: string;
  habitacio: string | null;
  dataSortida: string; // ISO
  diesFalten: number;
  estat: EstatProrroga;
  preguntatAt: string | null;
  aplacatFins: string | null;
  idioma: string | null;
  numViatgers: number;
  viatgers: { nom: string; cognom1: string; telefon: string | null; esTitular: boolean; esMenor: boolean }[];
}

/**
 * Avisos de pròrroga per al tauler: estades llargues que s'acaben aviat (per
 * preguntar o esperant resposta), les aplaçades, i les que surten demà (per
 * enviar el recordatori de sortida).
 */
export async function getProrrogues(now = new Date()) {
  const avui = inicDia(now);
  const fins = new Date(avui.getTime() + (DIES_AVIS_PRORROGA + 1) * 86_400_000);

  const estades = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      estat: { in: ['RESERVA', 'EN_CURS'] },
      dataSortida: { gte: avui, lt: fins },
      // Si ja té una ampliació, ja ha allargat.
      ampliacions: { none: { deletedAt: null } },
    },
    orderBy: { dataSortida: 'asc' },
    include: {
      habitacio: { select: { nom: true } },
      viatgers: { include: { huesped: { select: { nom: true, cognom1: true, telefon: true } } } },
    },
  });

  const item = (e: (typeof estades)[number]): EstadaAvisProrroga => ({
    id: e.id,
    habitacio: e.habitacio?.nom ?? null,
    dataSortida: e.dataSortida!.toISOString(),
    diesFalten: diesEntre(avui, e.dataSortida!),
    estat: estatProrroga(e),
    preguntatAt: e.prorrogaPreguntatAt?.toISOString() ?? null,
    aplacatFins: e.prorrogaAplacatFins?.toISOString() ?? null,
    idioma: e.idioma,
    numViatgers: e.numViatgers,
    viatgers: e.viatgers
      .sort((a, b) => Number(b.esTitular) - Number(a.esTitular))
      .map((v) => ({ nom: v.huesped.nom, cognom1: v.huesped.cognom1, telefon: v.huesped.telefon, esTitular: v.esTitular, esMenor: v.esMenor })),
  });

  return {
    avisos: estades.filter((e) => situacioProrroga(e, avui) === 'avis').map(item),
    aplacades: estades.filter((e) => situacioProrroga(e, avui) === 'aplacada').map(item),
    // Surten demà i encara no se'ls ha enviat el recordatori per a aquesta sortida.
    surtenDema: estades
      .filter((e) => diesEntre(avui, e.dataSortida!) === 1)
      .filter((e) => !e.recordatoriSortida || diesEntre(e.recordatoriSortida, e.dataSortida!) !== 0)
      .map(item),
  };
}
