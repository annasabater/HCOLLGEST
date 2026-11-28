/**
 * Recordatoris propis: alta, edició, «Fet» (crea el següent si es repeteix),
 * «Recorda-m'ho en X dies» i baixa. Tot queda a l'auditoria.
 *
 * Un recordatori pot anar lligat a una estada (`estanciaId` + `accio`): surt amb
 * l'habitació i els hostes, i el tauler proposa l'acció d'aquell dia. Els de
 * «M'ha de dir si allarga» (PRORROGA) van connectats a la pròrroga de l'estada:
 * l'aplacen fins al dia («Ho dirà el 29/12» a Estades en curs) i la resposta
 * (Allarga / Marxa) s'hi apunta.
 */
import 'server-only';
import type { Prisma, Recordatori } from '@prisma/client';
import { prisma } from '../db';
import { audit } from '../audit';
import {
  diaMadrid,
  estadaTancaRecordatori,
  seguentData,
  sumaDies,
  tocaAra,
  ACCIO_RECORDATORI_LABELS,
  type AccioRecordatori,
  type UnitatRepeticio,
} from '../recordatoris';
import { RecordatoriAccioSchema, RecordatoriSchema } from '../validation/recordatori';
import { estatEnAplacar } from '../prorroga';
import { sincronitzaRecordatoris } from './calendari-recordatoris';
import { cobramentDesDeRecordatori, cobramentPagatDesDeRecordatori } from './cobrament-recordatori';

type Actor = { id: string } | null;
type Tx = Prisma.TransactionClient;

const aData = (d: string) => new Date(`${d}T00:00:00Z`);
const deData = (d: Date) => d.toISOString().slice(0, 10);
const dc = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** El que cal de l'estada per mostrar un recordatori lligat. */
const ESTADA_SELECT = {
  id: true,
  numContracte: true,
  anyContracte: true,
  dataEntrada: true,
  dataSortida: true,
  deletedAt: true,
  estat: true,
  habitacio: { select: { nom: true } },
  viatgers: { orderBy: { esTitular: 'desc' }, select: { huesped: { select: { nom: true, cognom1: true } } } },
} satisfies Prisma.EstanciaSelect;
const INCLUDE = { estancia: { select: ESTADA_SELECT } } satisfies Prisma.RecordatoriInclude;
type EstadaRec = Prisma.EstanciaGetPayload<{ select: typeof ESTADA_SELECT }>;

export interface EstadaRecordatori {
  id: string;
  habitacio: string | null;
  /** Noms dels hostes (titular primer), tal com estan desats. */
  noms: string[];
  contracte: string | null;
  entrada: string | null;
  sortida: string | null;
}

export interface RecordatoriVista {
  id: string;
  titol: string;
  notes: string | null;
  tipus: string;
  data: string;
  hora: string | null;
  repeticioCada: number | null;
  repeticioUnitat: string | null;
  diesAbans: number[];
  whatsapp: boolean;
  calendari: boolean;
  fix: boolean;
  ajornatFins: string | null;
  ajornaments: number;
  fetAt: string | null;
  tocaAra: boolean;
  estanciaId: string | null;
  accio: AccioRecordatori | null;
  import: number | null;
  estada: EstadaRecordatori | null;
}

export function vistaEstada(e: EstadaRec): EstadaRecordatori {
  return {
    id: e.id,
    habitacio: e.habitacio?.nom ?? null,
    noms: e.viatgers.map((v) => `${v.huesped.nom} ${v.huesped.cognom1}`.trim()),
    contracte: e.numContracte ? `${e.numContracte}/${e.anyContracte}` : null,
    entrada: e.dataEntrada ? diaMadrid(e.dataEntrada) : null,
    sortida: e.dataSortida ? diaMadrid(e.dataSortida) : null,
  };
}

export function vista(r: Recordatori & { estancia?: EstadaRec | null }, avui = diaMadrid()): RecordatoriVista {
  const v = {
    id: r.id,
    titol: r.titol,
    notes: r.notes,
    tipus: r.tipus,
    data: deData(r.data),
    hora: r.hora,
    repeticioCada: r.repeticioCada,
    repeticioUnitat: r.repeticioUnitat,
    diesAbans: r.diesAbans,
    whatsapp: r.whatsapp,
    calendari: r.calendari,
    fix: r.fix,
    ajornatFins: r.ajornatFins ? deData(r.ajornatFins) : null,
    ajornaments: r.ajornaments,
    fetAt: r.fetAt ? r.fetAt.toISOString() : null,
    estanciaId: r.estanciaId,
    accio: (r.accio as AccioRecordatori | null) ?? null,
    import: r.import != null ? Number(r.import) : null,
    estada: r.estancia ? vistaEstada(r.estancia) : null,
  };
  return { ...v, tocaAra: tocaAra({ ...v, fet: !!r.fetAt }, avui) };
}

/** Còpia per a la següent repetició (mateixes dades, data nova). */
const copiaPerRepeticio = (r: Recordatori, d: string) => ({
  titol: r.titol,
  notes: r.notes,
  tipus: r.tipus,
  data: aData(d),
  hora: r.hora,
  repeticioCada: r.repeticioCada,
  repeticioUnitat: r.repeticioUnitat,
  diesAbans: r.diesAbans,
  whatsapp: r.whatsapp,
  calendari: r.calendari,
  fix: r.fix,
  estanciaId: r.estanciaId,
  accio: r.accio,
  import: r.import,
});

/** Següent data d'una repetició, sempre posterior a `avui` (si fa temps, salta períodes). */
function seguentFutura(data: string, cada: number, unitat: UnitatRepeticio, avui: string): string {
  let d = seguentData(data, cada, unitat);
  for (let i = 0; d <= avui && i < 500; i++) d = seguentData(d, cada, unitat);
  return d;
}

/**
 * Tanca sols els recordatoris d'estades que ja no hi són (esborrades o cancel·lades)
 * i els de pròrroga o sortida d'estades ja acabades.
 */
export async function tancaRecordatorisEstadesAcabades(avui = diaMadrid()): Promise<number> {
  const lligats = await prisma.recordatori.findMany({
    where: { deletedAt: null, fetAt: null, estanciaId: { not: null } },
    select: { id: true, accio: true, estancia: { select: { deletedAt: true, estat: true, dataSortida: true } } },
    take: 300,
  });
  const ids = lligats
    .filter((r) =>
      r.estancia
        ? estadaTancaRecordatori(
            r.accio,
            {
              deletedAt: r.estancia.deletedAt,
              estat: r.estancia.estat,
              sortida: r.estancia.dataSortida ? diaMadrid(r.estancia.dataSortida) : null,
            },
            avui,
          )
        : false,
    )
    .map((r) => r.id);
  if (ids.length === 0) return 0;
  await prisma.recordatori.updateMany({ where: { id: { in: ids }, fetAt: null }, data: { fetAt: new Date() } });
  for (const id of ids) {
    await audit({ usuariId: null, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { fet: true, automatic: true, motiu: 'estada acabada o cancel·lada' } });
  }
  await sincronitzaRecordatoris(ids);
  return ids.length;
}

/**
 * Els que es repeteixen van sols: un cop passat el dia (i l'ajornament, si n'hi ha),
 * es tanquen i es crea el següent, sense haver de marcar «Fet». Idempotent i segur
 * si dues crides coincideixen (el tancament és condicional a `fetAt: null`).
 * També tanca els d'estades acabades (vegeu `tancaRecordatorisEstadesAcabades`).
 */
export async function avancaRepeticions(avui = diaMadrid()): Promise<number> {
  await tancaRecordatorisEstadesAcabades(avui);
  const vencuts = await prisma.recordatori.findMany({
    where: {
      deletedAt: null,
      fetAt: null,
      repeticioCada: { not: null },
      repeticioUnitat: { not: null },
      data: { lt: aData(avui) },
      OR: [{ ajornatFins: null }, { ajornatFins: { lt: aData(avui) } }],
    },
    take: 100,
  });
  const ids: string[] = [];
  for (const r of vencuts) {
    const nouId = await prisma.$transaction(async (tx) => {
      const tancat = await tx.recordatori.updateMany({ where: { id: r.id, fetAt: null }, data: { fetAt: new Date() } });
      if (tancat.count === 0) return null;
      const d = seguentFutura(deData(r.data), r.repeticioCada!, r.repeticioUnitat as UnitatRepeticio, avui);
      const nou = await tx.recordatori.create({ data: copiaPerRepeticio(r, d) });
      await cobramentDesDeRecordatori(tx, nou); // el següent «M'ha de pagar» porta el seu cobrament
      await audit({ usuariId: null, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: r.id, detall: { fet: true, automatic: true, seguent: d } }, tx);
      await audit({ usuariId: null, accio: 'CREACIO', entitat: 'recordatori', entitatId: nou.id, detall: { repeticioDe: r.id, data: d, automatic: true } }, tx);
      return nou.id;
    });
    if (nouId) ids.push(r.id, nouId);
  }
  if (ids.length) await sincronitzaRecordatoris(ids);
  return ids.length / 2;
}

/** Pendents (per data) i els últims fets. */
export async function llistaRecordatoris() {
  const avui = diaMadrid();
  await avancaRepeticions(avui);
  const [pendents, fets] = await Promise.all([
    prisma.recordatori.findMany({ where: { deletedAt: null, fetAt: null }, orderBy: { data: 'asc' }, take: 300, include: INCLUDE }),
    prisma.recordatori.findMany({ where: { deletedAt: null, fetAt: { not: null } }, orderBy: { fetAt: 'desc' }, take: 50, include: INCLUDE }),
  ]);
  return { avui, pendents: pendents.map((r) => vista(r, avui)), fets: fets.map((r) => vista(r, avui)) };
}

/** Els que toquen ara (per al tauler). */
export async function recordatorisAra(): Promise<RecordatoriVista[]> {
  const avui = diaMadrid();
  await avancaRepeticions(avui);
  const rows = await prisma.recordatori.findMany({
    // Els «M'ha de pagar» lligats a un cobrament pendent ja surten al tauler com a
    // cobrament (avís i pop-up): no es repeteixen aquí.
    where: { deletedAt: null, fetAt: null, pagamentPrevistId: null, data: { lte: aData(sumaDies(avui, 366)) } },
    orderBy: { data: 'asc' },
    take: 200,
    include: INCLUDE,
  });
  return rows.map((r) => vista(r, avui)).filter((r) => r.tocaAra);
}

/** Ids de totes les estades de la cadena (l'original i les ampliacions). */
async function idsCadena(estanciaId: string, db: Tx | typeof prisma = prisma): Promise<string[]> {
  const e = await db.estancia.findUnique({ where: { id: estanciaId }, select: { id: true, estanciaOrigenId: true } });
  if (!e) return [estanciaId];
  const arrel = e.estanciaOrigenId ?? e.id;
  const membres = await db.estancia.findMany({
    where: { OR: [{ id: arrel }, { estanciaOrigenId: arrel }] },
    select: { id: true },
  });
  return [...new Set([estanciaId, ...membres.map((m) => m.id)])];
}

/** Recordatoris pendents d'una estada (i de la resta de la seva cadena), per a la fitxa. */
export async function recordatorisDeEstada(estanciaId: string): Promise<RecordatoriVista[]> {
  const avui = diaMadrid();
  const ids = await idsCadena(estanciaId);
  const rows = await prisma.recordatori.findMany({
    // Els lligats a un cobrament pendent ja surten a «Cobraments pendents» de la fitxa.
    where: { deletedAt: null, fetAt: null, pagamentPrevistId: null, estanciaId: { in: ids } },
    orderBy: { data: 'asc' },
    take: 50,
    include: INCLUDE,
  });
  return rows.map((r) => vista(r, avui));
}

/** Estades d'ara i futures per lligar-hi un recordatori (cerca per habitació o nom). */
export async function cercaEstadesPerRecordatori(q: string): Promise<EstadaRecordatori[]> {
  const avui = diaMadrid();
  const text = q.trim();
  const rows = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      estat: { not: 'CANCELLADA' },
      dataSortida: { gte: aData(sumaDies(avui, -1)) },
      ...(text
        ? {
            OR: [
              { habitacio: { nom: { equals: text, mode: 'insensitive' } } },
              { numContracte: { startsWith: text } },
              {
                viatgers: {
                  some: {
                    huesped: {
                      OR: [
                        { nom: { contains: text, mode: 'insensitive' } },
                        { cognom1: { contains: text, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { dataEntrada: 'asc' },
    take: 15,
    select: ESTADA_SELECT,
  });
  return rows.map(vistaEstada);
}

// ── Pròrroga ─────────────────────────────────────────────────────────────────

/** L'estada vigent de la cadena (la que acaba més tard): és on viu la pròrroga. */
async function estadaVigent(tx: Tx, estanciaId: string) {
  const ids = await idsCadena(estanciaId, tx);
  const membres = await tx.estancia.findMany({
    where: { id: { in: ids }, deletedAt: null, estat: { not: 'CANCELLADA' }, dataSortida: { not: null } },
    select: { id: true, dataSortida: true, prorrogaEstat: true, prorrogaSortida: true, prorrogaAplacatFins: true, createdAt: true },
  });
  return membres.sort(
    (a, b) => b.dataSortida!.getTime() - a.dataSortida!.getTime() || b.createdAt.getTime() - a.createdAt.getTime(),
  )[0] ?? null;
}

/** «Ho dirà el dia…»: aplaça la pròrroga fins al dia i ho apunta a la línia del temps. */
async function aplacaProrroga(tx: Tx, estanciaId: string, dia: string, detall: string, usuariId: string | null) {
  const v = await estadaVigent(tx, estanciaId);
  if (!v?.dataSortida) return;
  const mateixa = v.prorrogaSortida?.getTime() === v.dataSortida.getTime();
  await tx.estancia.update({
    where: { id: v.id },
    data: {
      prorrogaSortida: v.dataSortida,
      // La pregunta torna a quedar oberta: un «sí/no» d'abans passa a «preguntat».
      prorrogaEstat: estatEnAplacar(v.prorrogaEstat, mateixa),
      prorrogaAplacatFins: new Date(`${dia}T12:00:00Z`),
    },
  });
  await tx.prorrogaEvent.create({ data: { estanciaId: v.id, tipus: 'HO_DIRA', detall, usuariId } });
}

/** Treu l'aplaçament que havia posat el recordatori (si encara és el seu dia). */
async function treuAplacament(tx: Tx, estanciaId: string, dia: string) {
  const v = await estadaVigent(tx, estanciaId);
  if (v?.prorrogaAplacatFins && v.prorrogaAplacatFins.toISOString().slice(0, 10) === dia) {
    await tx.estancia.update({ where: { id: v.id }, data: { prorrogaAplacatFins: null } });
  }
}

/** Resposta del recordatori (Allarga / Marxa): estat de la pròrroga + pas a la línia del temps. */
async function respostaProrroga(tx: Tx, estanciaId: string, resposta: 'SI' | 'NO', usuariId: string | null) {
  const v = await estadaVigent(tx, estanciaId);
  if (!v?.dataSortida) return;
  await tx.estancia.update({
    where: { id: v.id },
    data: { prorrogaSortida: v.dataSortida, prorrogaEstat: resposta, prorrogaAplacatFins: null },
  });
  await tx.prorrogaEvent.create({
    data: { estanciaId: v.id, tipus: resposta, detall: 'Apuntat des del recordatori', usuariId },
  });
}

// ── Alta, edició i accions ───────────────────────────────────────────────────

function dades(raw: unknown) {
  const v = RecordatoriSchema.parse(raw);
  const estanciaId = v.estanciaId || null;
  // Sense estada no hi ha acció; lligat a una estada, com a mínim «Una altra cosa».
  const accio: AccioRecordatori | null = estanciaId ? (v.accio ?? 'ALTRES') : null;
  // «M'ha de dir si allarga» és d'un sol cop (va lligat a una sortida concreta).
  const unCop = accio === 'PRORROGA';
  return {
    titol: v.titol,
    notes: v.notes || null,
    tipus: estanciaId ? 'ALTRES' : v.tipus,
    data: aData(v.data),
    hora: v.hora || null,
    repeticioCada: unCop ? null : (v.repeticioCada ?? null),
    repeticioUnitat: unCop ? null : (v.repeticioUnitat ?? null),
    diesAbans: [...new Set(v.diesAbans)].sort((a, b) => b - a),
    whatsapp: v.whatsapp,
    calendari: v.calendari,
    fix: unCop ? false : v.fix,
    estanciaId,
    accio,
    import: accio === 'COBRAMENT' && v.import != null ? v.import : null,
  };
}

export async function creaRecordatori(raw: unknown, actor: Actor, ip: string | null) {
  const d = dades(raw);
  const r = await prisma.$transaction(async (tx) => {
    if (d.estanciaId) {
      const e = await tx.estancia.findFirst({ where: { id: d.estanciaId, deletedAt: null }, select: { id: true } });
      if (!e) throw new Error('L’estada no existeix');
    }
    const nou = await tx.recordatori.create({ data: d, include: INCLUDE });
    await cobramentDesDeRecordatori(tx, nou); // «M'ha de pagar» amb import → cobrament pendent
    if (d.accio === 'PRORROGA' && d.estanciaId) {
      const detall = `Ho dirà el ${dc(deData(d.data))}${d.notes ? ` · ${d.notes}` : ''}`;
      await aplacaProrroga(tx, d.estanciaId, deData(d.data), detall, actor?.id ?? null);
    }
    await audit({ usuariId: actor?.id ?? null, accio: 'CREACIO', entitat: 'recordatori', entitatId: nou.id, detall: { titol: nou.titol, data: deData(nou.data), estanciaId: d.estanciaId, accio: d.accio }, ip }, tx);
    return nou;
  });
  await sincronitzaRecordatoris([r.id]);
  return vista(r);
}

export async function editaRecordatori(id: string, raw: unknown, actor: Actor, ip: string | null) {
  const d = dades(raw);
  const abans = await prisma.recordatori.findFirstOrThrow({ where: { id, deletedAt: null } });
  // Si canvia la data, l'ajornament d'abans ja no té sentit; si canvia l'hora o la
  // data, torna a avisar avui encara que ja hagués avisat.
  const canviaData = deData(abans.data) !== deData(d.data);
  const eraProrroga = abans.accio === 'PRORROGA' && !!abans.estanciaId;
  const esProrroga = d.accio === 'PRORROGA' && !!d.estanciaId;
  const mateixaEstada = abans.estanciaId === d.estanciaId;
  const r = await prisma.$transaction(async (tx) => {
    const r2 = await tx.recordatori.update({
      where: { id },
      data: {
        ...d,
        ...(canviaData ? { ajornatFins: null } : {}),
        ...(canviaData || abans.hora !== d.hora ? { avisatDia: null } : {}),
      },
      include: INCLUDE,
    });
    await cobramentDesDeRecordatori(tx, r2); // el cobrament pendent lligat segueix el recordatori
    // Pròrroga: si deixa de ser-ho (o canvia d'estada), treu l'aplaçament d'abans;
    // si ho és i és nou o canvia el dia, aplaça fins al dia nou.
    if (eraProrroga && !abans.fetAt && (!esProrroga || !mateixaEstada)) {
      await treuAplacament(tx, abans.estanciaId!, deData(abans.ajornatFins ?? abans.data));
    }
    if (esProrroga && !abans.fetAt && (!eraProrroga || !mateixaEstada || canviaData)) {
      await aplacaProrroga(tx, d.estanciaId!, deData(d.data), `Ho dirà el ${dc(deData(d.data))}`, actor?.id ?? null);
    }
    await audit({ usuariId: actor?.id ?? null, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { titol: r2.titol, data: deData(r2.data), estanciaId: d.estanciaId, accio: d.accio }, ip }, tx);
    return r2;
  });
  await sincronitzaRecordatoris([id]);
  return vista(r);
}

export async function eliminaRecordatori(id: string, actor: Actor, ip: string | null) {
  const r = await prisma.$transaction(async (tx) => {
    const r2 = await tx.recordatori.update({ where: { id }, data: { deletedAt: new Date() } });
    // «M'ha de pagar»: el cobrament pendent (si no s'ha pagat) s'esborra amb ell.
    await cobramentDesDeRecordatori(tx, r2);
    // Si era el «Ho dirà el dia…» d'una estada, l'estada torna a sortir com abans.
    if (r2.accio === 'PRORROGA' && r2.estanciaId && !r2.fetAt) {
      await treuAplacament(tx, r2.estanciaId, deData(r2.ajornatFins ?? r2.data));
    }
    return r2;
  });
  await audit({ usuariId: actor?.id ?? null, accio: 'ELIMINACIO', entitat: 'recordatori', entitatId: id, detall: { titol: r.titol }, ip });
  await sincronitzaRecordatoris([id]);
}

/** Fet / Recorda-m'ho en X dies / Desfer el «Fet» / Resposta de la pròrroga / Canviar el dia. */
export async function accioRecordatori(id: string, raw: unknown, actor: Actor, ip: string | null) {
  const a = RecordatoriAccioSchema.parse(raw);
  const r = await prisma.recordatori.findFirstOrThrow({ where: { id, deletedAt: null } });
  const avui = diaMadrid();
  const usuariId = actor?.id ?? null;
  const prorroga = r.accio === 'PRORROGA' && !!r.estanciaId;

  if (a.accio === 'AJORNA') {
    const fins = sumaDies(avui, a.dies);
    await prisma.$transaction(async (tx) => {
      await tx.recordatori.update({ where: { id }, data: { ajornatFins: aData(fins), ajornaments: { increment: 1 } } });
      // «Encara no ho sap»: la pròrroga també espera fins al dia nou.
      if (prorroga) await aplacaProrroga(tx, r.estanciaId!, fins, `Encara no ho sap: ho dirà el ${dc(fins)}`, usuariId);
    });
    await audit({ usuariId, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { ajornatFins: fins }, ip });
    return { ok: true, ajornatFins: fins };
  }

  if (a.accio === 'MOU') {
    await prisma.$transaction(async (tx) => {
      await tx.recordatori.update({ where: { id }, data: { data: aData(a.data), ajornatFins: null, avisatDia: null } });
      if (prorroga) {
        await aplacaProrroga(tx, r.estanciaId!, a.data, `Ho dirà el ${dc(a.data)}${a.nota ? ` · ${a.nota}` : ''}`, usuariId);
      }
    });
    await audit({ usuariId, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { data: a.data }, ip });
    await sincronitzaRecordatoris([id]);
    return { ok: true };
  }

  if (a.accio === 'DESFES') {
    await prisma.$transaction(async (tx) => {
      await tx.recordatori.update({ where: { id }, data: { fetAt: null } });
      await cobramentPagatDesDeRecordatori(tx, r, false); // el cobrament torna a estar pendent
    });
    await audit({ usuariId, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { desfetFet: true }, ip });
    await sincronitzaRecordatoris([id]);
    return { ok: true };
  }

  if (a.accio === 'RESPOSTA') {
    if (!prorroga) throw new Error(`Aquest recordatori no és «${ACCIO_RECORDATORI_LABELS.PRORROGA}»`);
    await prisma.$transaction(async (tx) => {
      await tx.recordatori.update({ where: { id }, data: { fetAt: r.fetAt ?? new Date() } });
      await respostaProrroga(tx, r.estanciaId!, a.resposta, usuariId);
    });
    await audit({ usuariId, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { fet: true, resposta: a.resposta }, ip });
    await sincronitzaRecordatoris([id]);
    return { ok: true, estanciaId: r.estanciaId };
  }

  // FET: tanca aquest i, si es repeteix, programa el següent (una sola vegada).
  const res = await prisma.$transaction(async (tx) => {
    if (r.fetAt) return { ok: true, seguent: null, nouId: null as string | null };
    await tx.recordatori.update({ where: { id }, data: { fetAt: new Date() } });
    // «M'ha de pagar» fet = cobrat: el cobrament pendent queda pagat.
    await cobramentPagatDesDeRecordatori(tx, r, true);
    let seguent: string | null = null;
    let nouId: string | null = null;
    if (r.repeticioCada && r.repeticioUnitat) {
      // La següent data ha de ser futura (si s'ha marcat tard, salta períodes).
      const d = seguentFutura(deData(r.data), r.repeticioCada, r.repeticioUnitat as UnitatRepeticio, avui);
      const nou = await tx.recordatori.create({ data: copiaPerRepeticio(r, d) });
      await cobramentDesDeRecordatori(tx, nou);
      seguent = d;
      nouId = nou.id;
      await audit({ usuariId, accio: 'CREACIO', entitat: 'recordatori', entitatId: nou.id, detall: { repeticioDe: id, data: d }, ip }, tx);
    }
    await audit({ usuariId, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { fet: true, seguent }, ip }, tx);
    return { ok: true, seguent, nouId };
  });
  // Al calendari: treu el fet i posa el següent.
  await sincronitzaRecordatoris(res.nouId ? [id, res.nouId] : [id]);
  return { ok: true, seguent: res.seguent };
}

/**
 * En ampliar una estada: els «M'ha de dir si allarga» pendents ja estan resolts
 * (ha allargat) i es tanquen; la resta passen a l'estada nova. Retorna els ids
 * tocats (per sincronitzar el calendari després de la transacció).
 */
export async function recordatorisEnAmpliar(tx: Tx, idsEstades: string[], novaId: string): Promise<string[]> {
  const pendents = await tx.recordatori.findMany({
    where: { estanciaId: { in: idsEstades }, fetAt: null, deletedAt: null },
    select: { id: true, accio: true },
  });
  const prorrogues = pendents.filter((p) => p.accio === 'PRORROGA').map((p) => p.id);
  const altres = pendents.filter((p) => p.accio !== 'PRORROGA').map((p) => p.id);
  if (prorrogues.length) await tx.recordatori.updateMany({ where: { id: { in: prorrogues } }, data: { fetAt: new Date() } });
  if (altres.length) await tx.recordatori.updateMany({ where: { id: { in: altres } }, data: { estanciaId: novaId } });
  return [...prorrogues, ...altres];
}

/** Si hi ha mòbils/WhatsApp i Google Calendar actius (textos del formulari). */
export async function estatAvisos(): Promise<{ mobilActiu: boolean; calendariConnectat: boolean }> {
  const [est, mobils] = await Promise.all([
    prisma.establiment.findFirst({ select: { whatsappActiu: true, googleCalendarTokenEnc: true, googleCalendarId: true } }),
    prisma.pushSubscripcio.count({ where: { resumMati: true } }),
  ]);
  return {
    mobilActiu: mobils > 0 || !!est?.whatsappActiu,
    calendariConnectat: !!(est?.googleCalendarTokenEnc && est.googleCalendarId),
  };
}

/**
 * La pròrroga s'ha decidit per una altra banda («Ha dit que sí / que no» a Estades
 * en curs): els «M'ha de dir si allarga» pendents de l'estada ja no cal que surtin.
 */
export async function tancaRecordatorisProrroga(estanciaId: string): Promise<void> {
  const ids = await idsCadena(estanciaId);
  const pendents = await prisma.recordatori.findMany({
    where: { estanciaId: { in: ids }, accio: 'PRORROGA', fetAt: null, deletedAt: null },
    select: { id: true },
  });
  if (pendents.length === 0) return;
  await prisma.recordatori.updateMany({ where: { id: { in: pendents.map((p) => p.id) } }, data: { fetAt: new Date() } });
  await sincronitzaRecordatoris(pendents.map((p) => p.id));
}

/**
 * Recordatoris (pendents i fets) d'unes estades, per a la línia del temps d'Estades
 * en curs. Sense els de pròrroga (ja hi surten com «Ho dirà el…» i la resposta) ni
 * els lligats a un cobrament pendent (hi surten com a cobrament).
 */
export async function recordatorisPerEstades(ids: string[]): Promise<RecordatoriVista[]> {
  if (ids.length === 0) return [];
  const avui = diaMadrid();
  const rows = await prisma.recordatori.findMany({
    where: {
      estanciaId: { in: ids },
      deletedAt: null,
      pagamentPrevistId: null,
      OR: [{ accio: null }, { accio: { not: 'PRORROGA' } }],
    },
    orderBy: { data: 'asc' },
    take: 300,
    include: INCLUDE,
  });
  return rows.map((r) => vista(r, avui));
}
