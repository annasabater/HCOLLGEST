/**
 * Notificacions push al mòbil/navegador (Web Push amb claus VAPID).
 * Claus: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (Vercel).
 * Les subscripcions que el navegador dona per mortes (404/410) s'esborren soles.
 */
import 'server-only';
import webpush from 'web-push';
import { prisma } from './db';

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // on porta en tocar-la (ruta de gestio)
  tag?: string; // la mateixa etiqueta substitueix l'anterior
}

export const vapidPublica = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
export const pushConfigurat = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let preparat = false;
function prepara() {
  if (preparat) return;
  if (!pushConfigurat()) throw new Error('Falten les claus VAPID (notificacions no configurades).');
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hostalcoll@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  preparat = true;
}

type Filtre = { resumMati?: true; alMoment?: true; id?: string };

/** Envia a totes les subscripcions que compleixen el filtre. Retorna quantes l'han rebut. */
export async function enviaPush(filtre: Filtre, payload: PushPayload): Promise<{ ok: number; errors: number }> {
  if (!pushConfigurat()) return { ok: 0, errors: 0 };
  prepara();
  const subs = await prisma.pushSubscripcio.findMany({ where: filtre });
  let ok = 0;
  let errors = 0;
  const cos = JSON.stringify({ ...payload, url: payload.url ?? '/' });
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, cos, { TTL: 24 * 3600 });
      ok++;
      if (s.darrerError) await prisma.pushSubscripcio.update({ where: { id: s.id }, data: { darrerError: null } });
    } catch (err) {
      errors++;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscripcio.delete({ where: { id: s.id } }).catch(() => undefined);
      } else {
        await prisma.pushSubscripcio
          .update({ where: { id: s.id }, data: { darrerError: `${status ?? ''} ${err instanceof Error ? err.message : 'error'}`.trim().slice(0, 300) } })
          .catch(() => undefined);
      }
    }
  }
  return { ok, errors };
}

/** Avís al moment (ressenya/valoració nova). Mai fa fallar qui el crida. */
export async function avisAlMoment(payload: PushPayload): Promise<void> {
  try {
    await enviaPush({ alMoment: true }, payload);
  } catch (err) {
    console.error('[push al moment]', err instanceof Error ? err.message : err);
  }
}

/** "Android", "iPhone", "Windows"… a partir de l'user agent. */
export function nomDispositiu(ua: string | null): string {
  const u = ua ?? '';
  if (/iPhone/i.test(u)) return 'iPhone';
  if (/iPad/i.test(u)) return 'iPad';
  if (/Android/i.test(u)) return 'Android';
  if (/Macintosh/i.test(u)) return 'Mac';
  if (/Windows/i.test(u)) return 'Windows';
  return 'Navegador';
}
