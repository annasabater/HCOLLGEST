import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { buildBackupPayload, backupFilename } from '@/lib/services/backup';
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
    const json = JSON.stringify(payload, null, 2);
    const filename = backupFilename();

    const result = await sendEmail({
      to,
      subject: `Còpia de seguretat · Hostal Coll · ${filename.replace('backup-hostalcoll-', '').replace('.json', '')}`,
      html: `<p>Hola,</p>
        <p>Adjuntem la <strong>còpia de seguretat completa</strong> de la gestió de l'Hostal Coll
        (${Object.keys(payload.tables).length} taules). Guarda aquest fitxer en un lloc segur.</p>
        <p>Generada automàticament el ${new Date().toLocaleString('ca-ES')}.</p>`,
      attachments: [{ filename, content: Buffer.from(json).toString('base64') }],
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
