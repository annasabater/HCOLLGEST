import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { sendEmail } from '@/lib/email';

/**
 * GET /api/cron/uptime — comprovació de salut. Si /api/health falla, envia un
 * correu d'avís. L'invoca el cron de Vercel (Authorization: Bearer CRON_SECRET)
 * o un ADMIN manualment. NOTA: per a monitoratge en TEMPS REAL ("app caiguda"),
 * el millor és un servei extern gratuït (UptimeRobot) que faci ping a /api/health
 * cada 5 min; aquest cron intern és una xarxa de seguretat addicional.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronOk = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    if (!cronOk) {
      const auth = await authorize(ROLES_ADMIN);
      if (auth instanceof Response) return auth;
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://gestio.hostalcoll.com';
    let healthy = false;
    let detail = '';
    try {
      const res = await fetch(`${base}/api/health`, { cache: 'no-store' });
      detail = `HTTP ${res.status}`;
      healthy = res.ok;
      if (res.ok) {
        const data = await res.json().catch(() => null);
        // /api/health marca problemes (BD no migrada, config incompleta…).
        if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
          healthy = false;
          detail = JSON.stringify(data).slice(0, 300);
        }
      }
    } catch (e) {
      healthy = false;
      detail = e instanceof Error ? e.message : 'fetch error';
    }

    if (!healthy) {
      const to = process.env.BACKUP_EMAIL_TO || 'hostalcoll@gmail.com';
      await sendEmail({
        to,
        subject: '⚠ Hostal Coll — l’aplicació no respon correctament',
        html: `<p>La comprovació automàtica de salut ha <strong>fallat</strong>.</p>
          <p>Detall: <code>${detail}</code></p>
          <p>Revisa <a href="${base}/api/health">${base}/api/health</a> i el panell de Vercel/Supabase.</p>`,
      });
      await audit({ usuariId: null, accio: 'ACCES', entitat: 'uptime', detall: { healthy, detail }, ip: clientIp(req) });
    }

    return ok({ healthy, detail });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
