import 'server-only';
import { prisma } from '../db';
import { diaMadrid } from '../recordatoris';
import {
  dataProposadaProrroga,
  diesEntreDies,
  estatProrroga,
  recordatoriSortida,
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
  /** «Marxarà abans»: dia que ha dit que probablement marxa (la sortida oficial no canvia). */
  sortidaProbable: string | null;
  nits: number;
  diesFalten: number;
  dataProposada: string;
  /** El dia per preguntar l'ha triat la persona (no és el proposat). */
  preguntarTriat: boolean;
  estat: EstatProrroga;
  situacio: SituacioEstada;
  aplacatFins: string | null; // YYYY-MM-DD
  /** Ja se n'ha enviat almenys un per a aquesta sortida. */
  recordatoriEnviat: boolean;
  /** Dia del (següent) recordatori de sortida i si està per enviar. */
  recordatoriDia: string;
  recordatoriPendent: boolean;
  recordatoriTriat: boolean;
  idioma: string | null;
  numViatgers: number;
  viatgers: { nom: string; cognom1: string; telefon: string | null; esTitular: boolean; esMenor: boolean }[];
  events: EventProrroga[];
  /** Dies en què comença cada ampliació (si l'hoste ja ha allargat). */
  ampliacions: string[];
  /** Cada tram de la cadena: l'estada i les ampliacions, amb les seves dates. */
  trams: TramEstada[];
  /** Pagaments registrats de tota la cadena (amb la factura, si en tenen). */
  cobraments: CobramentEstada[];
  /** Cobraments previstos encara no marcats com a pagats (de tota la cadena). */
  pendents: PendentEstada[];
  /** «Ho dirà el dia…»: recordatori «M'ha de dir si allarga» pendent (de tota la cadena). */
  hoDira: { dia: string; recordatoriId: string } | null;
}

export interface TramEstada {
  id: string;
  entrada: string; // YYYY-MM-DD
  sortida: string;
  nits: number;
  numContracte: string | null;
}
export interface CobramentEstada {
  id: string;
  /** Tram (estada) al qual pertany. */
  tramId: string;
  import: number;
  data: string; // YYYY-MM-DD
  metode: string;
  factura: string | null;
  /** És un dipòsit (no un cobrament). */
  diposit?: boolean;
  /** Fiança (es torna en marxar), no un dipòsit documentat. */
  fianca?: boolean;
}
export interface PendentEstada {
  id: string;
  tramId: string;
  import: number;
  data: string; // YYYY-MM-DD
  concepte: string | null;
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
  // Les ampliacions (.1, .2…) pengen totes de l'estada ORIGINAL (germanes), no l'una
  // de l'altra: el grup és l'original + totes les que en pengen (a qualsevol nivell).
  const arrel = (id: string): string => {
    let a = anteriors.get(id);
    for (let i = 0; a?.origen && anteriors.has(a.origen) && i < 8; i++) a = anteriors.get(a.origen);
    return a?.id ?? id;
  };
  const membres = new Map<string, Anterior>(anteriors);
  for (let nivell = 0, pares = [...anteriors.keys()]; nivell < 4 && pares.length; nivell++) {
    const fills = await prisma.estancia.findMany({
      where: { estanciaOrigenId: { in: pares }, deletedAt: null, estat: { not: 'CANCELLADA' }, id: { notIn: [...membres.keys()] } },
      select: { id: true, estanciaOrigenId: true, dataEntrada: true, dataSortida: true, numContracte: true, createdAt: true, prorrogaEvents: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
    for (const m of fills) {
      membres.set(m.id, { id: m.id, origen: m.estanciaOrigenId, entrada: m.dataEntrada, sortida: m.dataSortida, numContracte: m.numContracte, creada: m.createdAt, events: m.prorrogaEvents.map(evVista) });
      anteriors.set(m.id, membres.get(m.id)!);
    }
    pares = fills.map((m) => m.id);
  }
  const grups = new Map<string, Anterior[]>();
  for (const m of membres.values()) {
    if (!m.entrada) continue;
    const r = arrel(m.id);
    grups.set(r, [...(grups.get(r) ?? []), m]);
  }
  for (const g of grups.values()) g.sort((a, b) => a.entrada!.getTime() - b.entrada!.getTime() || a.creada.getTime() - b.creada.getTime());
  /** Cadena de l'estada: [la primera, …, ella mateixa], per data d'entrada. */
  const cadena = (id: string): Anterior[] => {
    const g = grups.get(arrel(id)) ?? [];
    const jo = g.find((a) => a.id === id);
    return jo ? g.filter((a) => a.entrada! <= jo.entrada!) : g;
  };
  /** L'estada del grup que acaba més tard: és la que surt al quadre. */
  const ultimaDelGrup = (id: string): string | undefined =>
    (grups.get(arrel(id)) ?? [])
      .filter((a) => a.sortida)
      .reduce<Anterior | undefined>((m, a) => (!m || a.sortida! > m.sortida! || (+a.sortida! === +m.sortida! && a.creada > m.creada) ? a : m), undefined)?.id;

  const estades: EstadaEnCurs[] = [];
  for (const e of rows) {
    if (!e.dataEntrada || !e.dataSortida) continue;
    // Si ja s'ha allargat, la que surt és l'ampliació que acaba més tard.
    if (ultimaDelGrup(e.id) !== e.id) continue;
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
    // Dia triat a mà per preguntar (només si és dins d'aquest tram).
    const preguntarTriat = e.prorrogaPreguntarEl ? diaMadrid(e.prorrogaPreguntarEl) : null;
    const preguntarEl = preguntarTriat && preguntarTriat <= sortida && preguntarTriat >= entradaTram ? preguntarTriat : null;
    // Recordatori de sortida: l'últim enviat per a aquesta sortida i el següent que toca.
    const enviatPerAquesta = !!e.recordatoriSortida && diaMadrid(e.recordatoriSortida) === sortida;
    const ultimRec = e.prorrogaEvents.filter((x) => x.tipus === 'RECORDATORI').at(-1);
    const ultimEnviat = enviatPerAquesta ? (ultimRec ? diaMadrid(ultimRec.createdAt) : sortida) : null;
    const rec = recordatoriSortida(
      sortida,
      e.recordatoriSortidaEl ? diaMadrid(e.recordatoriSortidaEl) : null,
      ultimEnviat,
    );

    // Història de tota la cadena + un pas «Ha allargat» per cada ampliació.
    const events: EventProrroga[] = [];
    ch.forEach((a, i) => {
      events.push(...a.events);
      const seg = ch[i + 1];
      if (seg?.sortida) {
        const dd = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
        const ini = seg.entrada ? diaMadrid(seg.entrada) : null;
        const fi = diaMadrid(seg.sortida);
        events.push({
          id: `ampliacio-${seg.id}`,
          tipus: 'AMPLIAT',
          detall: ini
            ? `De ${dd(ini)} a ${dd(fi)} · ${diesEntreDies(ini, fi)} nits més${seg.numContracte ? ` · contracte ${seg.numContracte}` : ''}`
            : `Estada nova fins al ${dd(fi)}${seg.numContracte ? ` (contracte ${seg.numContracte})` : ''}`,
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
      sortidaProbable: e.sortidaProbable ? diaMadrid(e.sortidaProbable) : null,
      nits: diesEntreDies(entrada, sortida),
      diesFalten: Math.max(0, diesEntreDies(avui, e.sortidaProbable ? diaMadrid(e.sortidaProbable) : sortida)),
      // Llarga o curta segons tota l'estada; mai abans que comenci l'última ampliació.
      dataProposada: preguntarEl ?? dataProposadaProrroga(entrada, sortida, entradaTram),
      preguntarTriat: !!preguntarEl,
      estat,
      // Si ha dit que marxa abans, ja no cal preguntar si allarga.
      situacio: e.sortidaProbable ? 'MARXA' : situacioEstada({ entrada, sortida, estat, aplacatFins, teAmpliacio: false, entradaTram, preguntarEl }, avui),
      aplacatFins,
      recordatoriEnviat: enviatPerAquesta,
      recordatoriDia: rec.dia,
      recordatoriPendent: rec.pendent,
      recordatoriTriat: rec.triat,
      idioma: e.idioma,
      numViatgers: e.numViatgers,
      viatgers: e.viatgers
        .sort((a, b) => Number(b.esTitular) - Number(a.esTitular))
        .map((v) => ({ nom: v.huesped.nom, cognom1: v.huesped.cognom1, telefon: v.huesped.telefon, esTitular: v.esTitular, esMenor: v.esMenor })),
      events,
      ampliacions: ch.slice(1).map((a) => diaMadrid(a.entrada!)),
      trams: ch
        .filter((a) => a.entrada && a.sortida)
        .map((a) => ({
          id: a.id,
          entrada: diaMadrid(a.entrada!),
          sortida: diaMadrid(a.sortida!),
          nits: diesEntreDies(diaMadrid(a.entrada!), diaMadrid(a.sortida!)),
          numContracte: a.numContracte || null,
        })),
      cobraments: [],
      pendents: [],
      hoDira: null,
    });
  }

  // Pagaments i cobraments previstos de cada cadena (una sola consulta per a totes).
  const ids = [...new Set(estades.flatMap((e) => e.trams.map((t) => t.id)))];
  if (ids.length) {
    // «Ho dirà el dia…»: el recordatori de pròrroga pendent de cada cadena (el dia
    // efectiu és el de l'ajornament, si n'hi ha).
    const recs = await prisma.recordatori.findMany({
      where: { estanciaId: { in: ids }, accio: 'PRORROGA', fetAt: null, deletedAt: null },
      orderBy: { data: 'asc' },
      select: { id: true, estanciaId: true, data: true, ajornatFins: true },
    });
    for (const e of estades) {
      const meus = new Set(e.trams.map((t) => t.id));
      const r = recs.find((x) => x.estanciaId && meus.has(x.estanciaId));
      if (r) e.hoDira = { dia: (r.ajornatFins ?? r.data).toISOString().slice(0, 10), recordatoriId: r.id };
    }
  }
  if (ids.length) {
    const [cobs, prev, dips] = await Promise.all([
      prisma.cobrament.findMany({
        where: { estanciaId: { in: ids } },
        orderBy: { data: 'asc' },
        select: { id: true, estanciaId: true, import: true, data: true, metode: true, factura: { select: { numero: true } } },
      }),
      prisma.pagamentPrevist.findMany({
        where: { estanciaId: { in: ids }, pagat: false },
        orderBy: { dataPrevista: 'asc' },
        select: { id: true, estanciaId: true, import: true, dataPrevista: true, concepte: true },
      }),
      // Els dipòsits també són pagaments de l'estada (els tornats no compten).
      prisma.diposit.findMany({
        where: { estanciaId: { in: ids }, estat: { not: 'TORNAT' } },
        orderBy: { data: 'asc' },
        select: { id: true, estanciaId: true, import: true, data: true, metode: true, esDiposit: true, factura: { select: { numero: true } } },
      }),
    ]);
    for (const e of estades) {
      const meus = new Set(e.trams.map((t) => t.id));
      e.cobraments = [
        ...cobs
          .filter((c) => meus.has(c.estanciaId))
          .map((c) => ({ id: c.id, tramId: c.estanciaId, import: Number(c.import), data: diaMadrid(c.data), metode: c.metode, factura: c.factura?.numero ?? null })),
        ...dips
          .filter((d) => meus.has(d.estanciaId))
          .map((d) => ({ id: d.id, tramId: d.estanciaId, import: Number(d.import), data: diaMadrid(d.data), metode: d.metode, factura: d.factura?.numero ?? null, diposit: true, fianca: !d.esDiposit })),
      ].sort((a, b) => a.data.localeCompare(b.data));
      e.pendents = prev
        .filter((p) => meus.has(p.estanciaId))
        .map((p) => ({ id: p.id, tramId: p.estanciaId, import: Number(p.import), data: diaMadrid(p.dataPrevista), concepte: p.concepte }));
    }
  }
  return { avui, estades };
}

