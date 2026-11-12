import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok, serverError } from '@/lib/http';
import { enviaResumDiari } from '@/lib/services/resum-whatsapp';

export const maxDuration = 60;

/**
 * GET /api/cron/whatsapp-diari — resum del matí per WhatsApp. El cron de Vercel el
 * crida a les 8:00 UTC (9:00 a l'hivern, 10:00 a l'estiu a Madrid); només s'envia
 * un cop al dia. Un admin el pot forçar («Envia el resum ara» a Configuració).
 */
export async function GET(req: Request) {
  try {
    const cronOk =
      !!process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
    let actorId: string | null = null;
    if (!cronOk) {
      const auth = await authorize(ROLES_ADMIN);
      if (auth instanceof Response) return auth;
      actorId = auth.id;
    }
    try {
      const res = await enviaResumDiari({ forcar: !cronOk });
      if (res.enviat) {
        await audit({ usuariId: actorId, accio: 'MODIFICACIO', entitat: 'whatsapp', detall: { resumDiari: res.elements }, ip: clientIp(req) });
      }
      return ok(res);
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'No s’ha pogut enviar el WhatsApp');
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
