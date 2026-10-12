import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, ok } from '@/lib/http';
import { pujaIeetDrive } from '@/lib/services/ieet';

// POST /api/ieet/drive { any } — reescriu ara l'Excel de la taxa turística a Drive
// (el cron diari ho fa sol cada matí).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = (await req.json().catch(() => ({}))) as { any?: unknown };
    const any = Number(body.any ?? new Date().getFullYear());
    if (!Number.isInteger(any) || any < 2000 || any > 2100) return badRequest('Any no vàlid');

    let fitxer: string | null = null;
    let error: string | null = null;
    try {
      fitxer = await pujaIeetDrive(any);
      if (!fitxer) error = 'Google Drive no està connectat. Connecta’l a Configuració.';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Error pujant a Drive';
    }
    await audit({ usuariId: auth.id, accio: 'DESCARREGA', entitat: 'drive_export', detall: { tipus: 'ieet', any, ok: !error, fitxer, error }, ip: clientIp(req) });
    return ok({ ok: !error, fitxer, error });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
