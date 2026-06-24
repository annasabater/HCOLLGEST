import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { buildBackupPayload } from '@/lib/services/backup';
import { buildBackupXlsx, backupXlsxFilename } from '@/lib/exports/backup-xlsx';
import { sendEmail } from '@/lib/email';

/**
 * GET /api/cron/backup — envia la còpia de seguretat per correu.
 * L'invoca el cron de Vercel (mensual, amb Authorization: Bearer CRON_SECRET)
 * o un ADMIN manualment des de Configuració (sessió).
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

    const to = process.env.BACKUP_EMAIL_TO || 'hostalcoll@gmail.com';
    const payload = await buildBackupPayload();
    const xlsx = await buildBackupXlsx();
    const filename = backupXlsxFilename();

    const result = await sendEmail({
      to,
      subject: `Còpia de seguretat · Hostal Coll · ${filename.replace('backup-hostalcoll-', '').replace('.xlsx', '')}`,
      html: `<p>Hola,</p>
        <p>Adjuntem la <strong>còpia de seguretat completa</strong> de la gestió de l'Hostal Coll
        en <strong>Excel</strong> (${Object.keys(payload.tables).length} fulls, un per taula).
        Guarda aquest fitxer en un lloc segur.</p>
        <p>Generada automàticament el ${new Date().toLocaleString('ca-ES')}.</p>`,
      attachments: [{ filename, content: xlsx.toString('base64') }],
    });

    await audit({
      usuariId: actorId,
      accio: 'DESCARREGA',
      entitat: 'backup_email',
      detall: { to, ok: result.ok, error: result.error ?? null },
      ip: clientIp(req),
    });

    if (!result.ok) {
      return ok({ sent: false, to, error: result.error });
    }
    return ok({ sent: true, to });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
