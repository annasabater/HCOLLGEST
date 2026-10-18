import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { sendEmail } from '@/lib/email';
import { revisaBoe } from '@/lib/services/boe-formularis';

/**
 * GET /api/cron/boe-formularis — cada setmana mira els sumaris del BOE dels
 * últims 8 dies i, si hi ha una ordre nova sobre els models 303/130/115/390/180/100,
 * la desa com a avís per a /impostos i envia un correu. L'invoca el cron de Vercel
 * (Authorization: Bearer CRON_SECRET) o un ADMIN manualment (?dies=N).
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronOk = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    if (!cronOk) {
      const auth = await authorize(ROLES_ADMIN);
      if (auth instanceof Response) return auth;
    }
    const dies = Math.min(60, Math.max(1, Number(new URL(req.url).searchParams.get('dies') ?? 8) || 8));
    const nous = await revisaBoe(dies);
    if (nous.length > 0) {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'https://gestio.hostalcoll.com';
      await sendEmail({
        to: process.env.BACKUP_EMAIL_TO || 'hostalcoll@gmail.com',
        subject: `Hostal Coll — el BOE canvia els models ${[...new Set(nous.flatMap((n) => n.models))].join(', ')}`,
        html: `<p>Ha sortit al BOE una ordre nova sobre models d’impostos que fa servir l’hostal:</p>
          <ul>${nous.map((n) => `<li><a href="${n.url}">${n.id}</a> (${n.data}) — models ${n.models.join(', ')}<br>${n.titol}</li>`).join('')}</ul>
          <p>Cal revisar si canvien les caselles i actualitzar els formularis de <a href="${base}/impostos">${base}/impostos</a>.</p>`,
      });
    }
    return ok({ revisats: dies, nous });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
