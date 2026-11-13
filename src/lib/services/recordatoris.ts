/**
 * Recordatoris propis: alta, edició, «Fet» (crea el següent si es repeteix),
 * «Recorda-m'ho en X dies» i baixa. Tot queda a l'auditoria.
 */
import 'server-only';
import type { Recordatori } from '@prisma/client';
import { prisma } from '../db';
import { audit } from '../audit';
import { diaMadrid, seguentData, sumaDies, tocaAra, type UnitatRepeticio } from '../recordatoris';
import { RecordatoriAccioSchema, RecordatoriSchema } from '../validation/recordatori';
import { sincronitzaRecordatoris } from './calendari-recordatoris';

type Actor = { id: string } | null;

const aData = (d: string) => new Date(`${d}T00:00:00Z`);
const deData = (d: Date) => d.toISOString().slice(0, 10);

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
  ajornatFins: string | null;
  ajornaments: number;
  fetAt: string | null;
  tocaAra: boolean;
}

export function vista(r: Recordatori, avui = diaMadrid()): RecordatoriVista {
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
    ajornatFins: r.ajornatFins ? deData(r.ajornatFins) : null,
    ajornaments: r.ajornaments,
    fetAt: r.fetAt ? r.fetAt.toISOString() : null,
  };
  return { ...v, tocaAra: tocaAra({ ...v, fet: !!r.fetAt }, avui) };
}

/** Pendents (per data) i els últims fets. */
export async function llistaRecordatoris() {
  const avui = diaMadrid();
  const [pendents, fets] = await Promise.all([
    prisma.recordatori.findMany({ where: { deletedAt: null, fetAt: null }, orderBy: { data: 'asc' }, take: 300 }),
    prisma.recordatori.findMany({ where: { deletedAt: null, fetAt: { not: null } }, orderBy: { fetAt: 'desc' }, take: 50 }),
  ]);
  return { avui, pendents: pendents.map((r) => vista(r, avui)), fets: fets.map((r) => vista(r, avui)) };
}

/** Els que toquen ara (per al tauler). */
export async function recordatorisAra(): Promise<RecordatoriVista[]> {
  const avui = diaMadrid();
  const rows = await prisma.recordatori.findMany({
    where: { deletedAt: null, fetAt: null, data: { lte: aData(sumaDies(avui, 366)) } },
    orderBy: { data: 'asc' },
    take: 200,
  });
  return rows.map((r) => vista(r, avui)).filter((r) => r.tocaAra);
}

function dades(raw: unknown) {
  const v = RecordatoriSchema.parse(raw);
  return {
    titol: v.titol,
    notes: v.notes || null,
    tipus: v.tipus,
    data: aData(v.data),
    hora: v.hora || null,
    repeticioCada: v.repeticioCada ?? null,
    repeticioUnitat: v.repeticioUnitat ?? null,
    diesAbans: [...new Set(v.diesAbans)].sort((a, b) => b - a),
    whatsapp: v.whatsapp,
    calendari: v.calendari,
  };
}

export async function creaRecordatori(raw: unknown, actor: Actor, ip: string | null) {
  const d = dades(raw);
  const r = await prisma.recordatori.create({ data: d });
  await audit({ usuariId: actor?.id ?? null, accio: 'CREACIO', entitat: 'recordatori', entitatId: r.id, detall: { titol: r.titol, data: deData(r.data) }, ip });
  await sincronitzaRecordatoris([r.id]);
  return vista(r);
}

export async function editaRecordatori(id: string, raw: unknown, actor: Actor, ip: string | null) {
  const d = dades(raw);
  const abans = await prisma.recordatori.findFirstOrThrow({ where: { id, deletedAt: null } });
  // Si canvia la data, l'ajornament d'abans ja no té sentit; si canvia l'hora o la
  // data, torna a avisar avui encara que ja hagués avisat.
  const canviaData = deData(abans.data) !== deData(d.data);
  const r = await prisma.recordatori.update({
    where: { id },
    data: {
      ...d,
      ...(canviaData ? { ajornatFins: null } : {}),
      ...(canviaData || abans.hora !== d.hora ? { avisatDia: null } : {}),
    },
  });
  await audit({ usuariId: actor?.id ?? null, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { titol: r.titol, data: deData(r.data) }, ip });
  await sincronitzaRecordatoris([id]);
  return vista(r);
}

export async function eliminaRecordatori(id: string, actor: Actor, ip: string | null) {
  const r = await prisma.recordatori.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ usuariId: actor?.id ?? null, accio: 'ELIMINACIO', entitat: 'recordatori', entitatId: id, detall: { titol: r.titol }, ip });
  await sincronitzaRecordatoris([id]);
}

/** Fet / Recorda-m'ho en X dies / Desfer el «Fet». */
export async function accioRecordatori(id: string, raw: unknown, actor: Actor, ip: string | null) {
  const a = RecordatoriAccioSchema.parse(raw);
  const r = await prisma.recordatori.findFirstOrThrow({ where: { id, deletedAt: null } });
  const avui = diaMadrid();

  if (a.accio === 'AJORNA') {
    const fins = sumaDies(avui, a.dies);
    await prisma.recordatori.update({ where: { id }, data: { ajornatFins: aData(fins), ajornaments: { increment: 1 } } });
    await audit({ usuariId: actor?.id ?? null, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { ajornatFins: fins }, ip });
    return { ok: true, ajornatFins: fins };
  }

  if (a.accio === 'DESFES') {
    await prisma.recordatori.update({ where: { id }, data: { fetAt: null } });
    await audit({ usuariId: actor?.id ?? null, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { desfetFet: true }, ip });
    await sincronitzaRecordatoris([id]);
    return { ok: true };
  }

  // FET: tanca aquest i, si es repeteix, programa el següent (una sola vegada).
  const res = await prisma.$transaction(async (tx) => {
    if (r.fetAt) return { ok: true, seguent: null, nouId: null as string | null };
    await tx.recordatori.update({ where: { id }, data: { fetAt: new Date() } });
    let seguent: string | null = null;
    let nouId: string | null = null;
    if (r.repeticioCada && r.repeticioUnitat) {
      // La següent data ha de ser futura (si s'ha marcat tard, salta períodes).
      let d = seguentData(deData(r.data), r.repeticioCada, r.repeticioUnitat as UnitatRepeticio);
      for (let i = 0; d <= avui && i < 500; i++) d = seguentData(d, r.repeticioCada, r.repeticioUnitat as UnitatRepeticio);
      const nou = await tx.recordatori.create({
        data: {
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
        },
      });
      seguent = d;
      nouId = nou.id;
      await audit({ usuariId: actor?.id ?? null, accio: 'CREACIO', entitat: 'recordatori', entitatId: nou.id, detall: { repeticioDe: id, data: d }, ip }, tx);
    }
    await audit({ usuariId: actor?.id ?? null, accio: 'MODIFICACIO', entitat: 'recordatori', entitatId: id, detall: { fet: true, seguent }, ip }, tx);
    return { ok: true, seguent, nouId };
  });
  // Al calendari: treu el fet i posa el següent.
  await sincronitzaRecordatoris(res.nouId ? [id, res.nouId] : [id]);
  return { ok: true, seguent: res.seguent };
}
