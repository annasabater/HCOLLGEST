/**
 * Connexió del Google Calendar: desa el refresh token (xifrat), crea el
 * calendari «Hostal Coll · Recordatoris» si cal i hi posa els recordatoris pendents.
 */
import 'server-only';
import { prisma } from '../db';
import { encryptString } from '../crypto';
import { exchangeCode } from '../drive';
import { calendariExisteix, creaCalendari } from '../google-calendar';
import { sincronitzaTotsRecordatoris } from './calendari-recordatoris';

export async function connectaCalendari(code: string, redirectUri: string): Promise<'ok' | 'norefresh'> {
  const est = await prisma.establiment.findFirstOrThrow({ select: { id: true, googleCalendarId: true } });
  const { refreshToken, accessToken } = await exchangeCode(code, redirectUri);
  if (!refreshToken) return 'norefresh';

  // Reaprofita el calendari si ja existia (reconnexió); si no, en crea un.
  let calId = est.googleCalendarId;
  if (!calId || !(await calendariExisteix(accessToken, calId))) calId = await creaCalendari(accessToken);

  await prisma.establiment.update({
    where: { id: est.id },
    data: { googleCalendarTokenEnc: encryptString(refreshToken), googleCalendarId: calId, calendariSyncError: null },
  });
  // Calendari nou: els esdeveniments vells (si n'hi havia) ja no hi són.
  if (calId !== est.googleCalendarId) await prisma.recordatori.updateMany({ data: { googleEventId: null } });
  await sincronitzaTotsRecordatoris();
  return 'ok';
}

export async function desconnectaCalendari(): Promise<void> {
  const est = await prisma.establiment.findFirstOrThrow({ select: { id: true } });
  // El calendari queda a Google (l'esborra qui vulgui); aquí només oblidem el permís.
  await prisma.establiment.update({ where: { id: est.id }, data: { googleCalendarTokenEnc: null, calendariSyncError: null } });
}
