import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { purgarDocumentsVencuts } from '@/lib/services/documents-retencio';

/**
 * GET /api/cron/purga-documents — esborra les imatges de documents d'identitat
 * que han superat el termini de retenció (RGPD: no es poden conservar
 * indefinidament). L'invoca el cron de Vercel (diari, Authorization: Bearer
 * CRON_SECRET) o un ADMIN manualment (sessió).
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

    const res = await purgarDocumentsVencuts();
    if (res.esborrats > 0 || res.errors > 0) {
      await audit({
        usuariId: actorId,
        accio: 'ELIMINACIO',
        entitat: 'documento_pujat_purga',
        detall: { ...res },
        ip: clientIp(req),
      });
    }
    return ok(res);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
