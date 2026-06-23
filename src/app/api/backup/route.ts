import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError } from '@/lib/http';
import { buildBackupPayload, backupFilename } from '@/lib/services/backup';

/**
 * GET /api/backup — exporta TOTES les dades a un fitxer JSON (només ADMIN).
 * És una còpia de seguretat portàtil i auditable. No inclou contrasenyes.
 */
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;

    const payload = await buildBackupPayload();

    await audit({
      usuariId: auth.id,
      accio: 'DESCARREGA',
      entitat: 'backup',
      detall: { taules: Object.keys(payload.tables).length },
      ip: clientIp(req),
    });

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${backupFilename()}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
