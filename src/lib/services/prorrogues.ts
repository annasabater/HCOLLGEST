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
  tipus: string; // PREGUNTAT | NO_CONTESTA | RECORDATORI | APLACAT | SI | NO | NOTA | AMPLIAT (calculat)
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
  /** Dies en què comença cada ampliació (si l'hoste ja ha allargat). */
  ampliacions: string[];
}

const DIA_MS = 86_400_000;
const evVista = (x: { id: string; tipus: string; detall: string | null; createdAt: Date }): EventProrroga => ({
  id: x.id,
  tipus: x.tipus,
  detall: x.detall,
  data: x.createdAt.toISOString(),
});

/**
 * Totes les estades en curs, ordenades per sortida, amb l'estat de la pròrroga i
 * la seva línia del temps. Si l'hoste ja ha allargat (ampliació), surt l'ÚLTIMA
 * estada de la cadena (encara que no hagi començat), amb la història de totes:
 * així es pot tornar a preguntar si allarga un altre cop.
 */
export async function getEstadesEnCurs(now = new Date()): Promise<{ avui: string; estades: EstadaEnCurs[] }> {
  const avui = diaMadrid(now);
  const ini = new Date(`${avui}T00:00:00Z`);
  const rows = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      estat: { in: ['RESERVA', 'EN_CURS'] },
      dataSortida: { gte: new Date(ini.getTime() - DIA_MS) },
      // Les que ja han entrat (marge d'un dia per l'hora; es filtra exacte a sota)
      // i les ampliacions, que poden començar més endavant.
      OR: [{ dataEntrada: { lt: new Date(ini.getTime() + 2 * DIA_MS) } }, { estanciaOrigenId: { not: null } }],
    },
    orderBy: { dataSortida: 'asc' },
    take: 120,
    include: {
      habitacio: { select: { nom: true } },
      viatgers: { include: { huesped: { select: { nom: true, cognom1: true, telefon: true } } } },
      ampliacions: { where: { deletedAt: null }, select: { id: true } },
      prorrogaEvents: { orderBy: { createdAt: 'asc' }, take: 50 },
    },
  });

  // Estades anteriors de cada cadena (fins a 6 nivells), per a la història i la data d'entrada.
  type Anterior = { id: string; origen: string | null; entrada: Date | null; sortida: Date | null; numContracte: string | null; creada: Date; events: EventProrroga[] };
  const anteriors = new Map<string, Anterior>();
  for (const r of rows) {
    anteriors.set(r.id, { id: r.id, origen: r.estanciaOrigenId, entrada: r.dataEntrada, sortida: r.dataSortida, numContracte: r.numContracte, creada: r.createdAt, events: r.prorrogaEvents.map(evVista) });
  }
  for (let nivell = 0; nivell < 6; nivell++) {
    const falten = [...new Set([...anteriors.values()].map((a) => a.origen).filter((id): id is string => !!id && !anteriors.has(id)))];
    if (falten.length === 0) break;
    const mes = await prisma.estancia.findMany({
      where: { id: { in: falten }, deletedAt: null },
      select: { id: true, estanciaOrigenId: true, dataEntrada: true, dataSortida: true, numContracte: true, createdAt: true, prorrogaEvents: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
    for (const m of mes) {
      anteriors.set(m.id, { id: m.id, origen: m.estanciaOrigenId, entrada: m.dataEntrada, sortida: m.dataSortida, numContracte: m.numContracte, creada: m.createdAt, events: m.prorrogaEvents.map(evVista) });
    }
    // Les que no s'han trobat (esborrades) tallen la cadena.
    for (const id of falten) if (!anteriors.has(id)) anteriors.set(id, { id, origen: null, entrada: null, sortida: null, numContracte: null, creada: new Date(0), events: [] });
  }
  /** Cadena de l'estada: [la primera, …, ella mateixa]. */
  const cadena = (id: string): Anterior[] => {
    const out: Anterior[] = [];
    for (let a = anteriors.get(id); a && out.length < 8; a = a.origen ? anteriors.get(a.origen) : undefined) {
      if (a.entrada) out.unshift(a);
    }
    return out;
  };

  const estades: EstadaEnCurs[] = [];
  for (const e of rows) {
    if (!e.dataEntrada || !e.dataSortida) continue;
    // Si ja s'ha allargat, la que surt és l'ampliació (l'última de la cadena).
    if (e.ampliacions.length > 0) continue;
    const entradaTram = diaMadrid(e.dataEntrada);
    const sortida = diaMadrid(e.dataSortida);
    if (sortida < avui) continue;
    const ch = cadena(e.id);
    const entrada = ch[0]?.entrada ? diaMadrid(ch[0].entrada) : entradaTram;
    // Ha d'haver entrat (ella o la primera de la cadena).
    if (entrada > avui) continue;

    const estat = estatProrroga(e);
    const mateixa = !!e.prorrogaSortida && diaMadrid(e.prorrogaSortida) === sortida;
    const aplacatFins = mateixa && e.prorrogaAplacatFins ? diaMadrid(e.prorrogaAplacatFins) : null;

    // Història de tota la cadena + un pas «Ha allargat» per cada ampliació.
    const events: EventProrroga[] = [];
    ch.forEach((a, i) => {
      events.push(...a.events);
      const seg = ch[i + 1];
      if (seg?.sortida) {
        events.push({
          id: `ampliacio-${seg.id}`,
          tipus: 'AMPLIAT',
          detall: `Estada nova fins al ${diaMadrid(seg.sortida).slice(8, 10)}/${diaMadrid(seg.sortida).slice(5, 7)}${seg.numContracte ? ` (contracte ${seg.numContracte})` : ''}`,
          data: seg.creada.toISOString(),
        });
      }
    });
    events.sort((a, b) => a.data.localeCompare(b.data));

    estades.push({
      id: e.id,
      habitacio: e.habitacio?.nom ?? null,
      numContracte: e.numContracte,
      entrada,
      sortida,
      nits: diesEntreDies(entrada, sortida),
      diesFalten: diesEntreDies(avui, sortida),
      // Llarga o curta segons tota l'estada; mai abans que comenci l'última ampliació.
      dataProposada: dataProposadaProrroga(entrada, sortida, entradaTram),
      estat,
      situacio: situacioEstada({ entrada, sortida, estat, aplacatFins, teAmpliacio: false, entradaTram }, avui),
      aplacatFins,
      recordatoriEnviat: !!e.recordatoriSortida && diaMadrid(e.recordatoriSortida) === sortida,
      idioma: e.idioma,
      numViatgers: e.numViatgers,
      viatgers: e.viatgers
        .sort((a, b) => Number(b.esTitular) - Number(a.esTitular))
        .map((v) => ({ nom: v.huesped.nom, cognom1: v.huesped.cognom1, telefon: v.huesped.telefon, esTitular: v.esTitular, esMenor: v.esMenor })),
      events,
      ampliacions: ch.slice(1).map((a) => diaMadrid(a.entrada!)),
    });
  }
  return { avui, estades };
}

