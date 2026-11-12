/**
 * Sincronitza els recordatoris amb el Google Calendar de l'app: cada recordatori
 * pendent amb `calendari` és un esdeveniment; si es marca Fet, s'esborra o es
 * desactiva, l'esdeveniment desapareix. Mai fa fallar l'acció de gestio: els
 * errors queden a `establiment.calendariSyncError`.
 */
import 'server-only';
import { prisma } from '../db';
import { decryptString } from '../crypto';
import { getAccessToken } from '../drive';
import { desaEvent, esborraEvent } from '../google-calendar';
import { dataCurta, textRepeticio } from '../recordatoris';

const urlBase = () => process.env.NEXT_PUBLIC_APP_URL || 'https://gestio.hostalcoll.com';

async function connexio() {
  const est = await prisma.establiment.findFirst({
    select: { id: true, googleCalendarTokenEnc: true, googleCalendarId: true },
  });
  if (!est?.googleCalendarTokenEnc || !est.googleCalendarId) return null;
  const token = await getAccessToken(decryptString(est.googleCalendarTokenEnc));
  return { estId: est.id, token, calId: est.googleCalendarId };
}

type Con = NonNullable<Awaited<ReturnType<typeof connexio>>>;

async function sincronitzaUn(con: Con, id: string): Promise<void> {
  const r = await prisma.recordatori.findUnique({ where: { id } });
  if (!r) return;
  const viu = !r.deletedAt && !r.fetAt && r.calendari;
  if (!viu) {
    if (r.googleEventId) {
      await esborraEvent(con.token, con.calId, r.googleEventId);
      await prisma.recordatori.update({ where: { id }, data: { googleEventId: null } });
    }
    return;
  }
  const dia = r.data.toISOString().slice(0, 10);
  const descripcio = [
    r.notes,
    `${textRepeticio(r.repeticioCada, r.repeticioUnitat)} · és el ${dataCurta(dia)}.`,
    `Quan estigui fet, marca’l a gestio: ${urlBase()}/recordatoris`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const eventId = await desaEvent(con.token, con.calId, r.googleEventId, { titol: r.titol, descripcio, dia, diesAbans: r.diesAbans });
  if (eventId !== r.googleEventId) await prisma.recordatori.update({ where: { id }, data: { googleEventId: eventId } });
}

/** Sincronitza uns recordatoris concrets (després de crear/editar/Fet/esborrar). */
export async function sincronitzaRecordatoris(ids: string[]): Promise<void> {
  let estId: string | null = null;
  try {
    const con = await connexio();
    if (!con) return;
    estId = con.estId;
    for (const id of ids) await sincronitzaUn(con, id);
    await prisma.establiment.update({ where: { id: con.estId }, data: { calendariSyncError: null } });
  } catch (err) {
    const msg = (err instanceof Error ? err.message : 'Error de Google Calendar').slice(0, 500);
    console.error('[calendari]', msg);
    if (estId) await prisma.establiment.update({ where: { id: estId }, data: { calendariSyncError: msg } }).catch(() => undefined);
  }
}

/** Tots els pendents (en connectar o amb «Sincronitza ara»). Retorna quants n'hi ha posat. */
export async function sincronitzaTotsRecordatoris(): Promise<number> {
  const pendents = await prisma.recordatori.findMany({
    where: { deletedAt: null, fetAt: null, calendari: true },
    select: { id: true },
    orderBy: { data: 'asc' },
    take: 300,
  });
  await sincronitzaRecordatoris(pendents.map((p) => p.id));
  return pendents.length;
}
