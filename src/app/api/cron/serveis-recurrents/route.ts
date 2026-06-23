import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { generarDespesesVencudes } from '@/lib/services/serveis-recurrents';

/**
 * GET /api/cron/serveis-recurrents — genera les despeses dels serveis vençuts.
 * L'invoca el cron de Vercel (diari, amb Authorization: Bearer CRON_SECRET) o un
 * ADMIN manualment (sessió).
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronOk = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    let actorId: string | null = null;
    if (!cronOk) {
      const auth = await authorize(ROLES_ADMIN);
      if (auth instanceof Response) return auth;
      actorId = auth.id;
    }

    const creats = await generarDespesesVencudes();
    if (creats > 0) {
      await audit({
        usuariId: actorId,
        accio: 'CREACIO',
        entitat: 'servei_recurrent_cron',
        detall: { despesesCreades: creats },
        ip: clientIp(req),
      });
    }
    return ok({ despesesCreades: creats });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
