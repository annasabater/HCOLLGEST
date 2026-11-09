import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok, serverError } from '@/lib/http';
import { sincronitzaRessenyesGoogle } from '@/lib/services/google-ressenyes';

export const maxDuration = 300; // llegir Google + traduir les noves

/**
 * GET /api/cron/ressenyes-google — cada nit porta les ressenyes noves de Google a
 * gestio (PENDENTS, traduïdes). L'invoca el cron de Vercel (Bearer CRON_SECRET) o
 * algú de recepció/admin amb el botó «Sincronitza ara».
 */
export async function GET(req: Request) {
  try {
    const cronOk =
      !!process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
    let actorId: string | null = null;
    if (!cronOk) {
      const auth = await authorize(ROLES_WRITE);
      if (auth instanceof Response) return auth;
      actorId = auth.id;
    }

    try {
      const res = await sincronitzaRessenyesGoogle();
      await audit({
        usuariId: actorId,
        accio: 'MODIFICACIO',
        entitat: 'ressenya',
        detall: { sincronitzacioGoogle: { ...res } },
        ip: clientIp(req),
      });
      return ok({ ok: true, ...res });
    } catch (err) {
      // L'error ja queda desat a establiment.ressenyesSyncError (es veu a /ressenyes).
      return serverError(err instanceof Error ? err.message : 'No s’ha pogut sincronitzar amb Google');
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
