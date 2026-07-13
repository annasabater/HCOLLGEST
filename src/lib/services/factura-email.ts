/**
 * Enviament d'una factura per correu (com els justificants): genera el PDF de la
 * factura i l'adjunta al correu de l'hostal. Best-effort respecte a la config de
 * correu (si RESEND no està configurat, retorna l'error de manera clara).
 */
import 'server-only';
import { prisma } from '../db';
import { audit } from '../audit';
import { buildFacturaPdf } from '../pdf/factura';
import { sendEmail } from '../email';

const ESTABLIMENT_ID = 'hostal-coll';
const HOSTAL_EMAIL = process.env.BACKUP_EMAIL_TO ?? 'hostalcoll@gmail.com';

const TIPUS_LABEL: Record<string, string> = {
  RECIBO: 'Rebut',
  FACTURA_SIMPLIFICADA: 'Factura simplificada',
  FACTURA: 'Factura fiscal',
};

export async function enviaFacturaEmail(
  facturaId: string,
  actorId: string | null,
  ip: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const factura = await prisma.factura.findFirst({
    where: { id: facturaId, deletedAt: null },
    include: {
      linies: true,
      estancia: {
        include: {
          habitacio: { select: { nom: true } },
          viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } },
        },
      },
    },
  });
  if (!factura) return { ok: false, error: 'Factura no trobada' };

  const establiment = await prisma.establiment.findUnique({ where: { id: ESTABLIMENT_ID } });
  const pdf = await buildFacturaPdf(factura, establiment);

  const tipus = TIPUS_LABEL[factura.tipusDocument] ?? 'Factura';
  const titular = factura.estancia.viatgers[0]?.huesped;
  const nom = titular ? `${titular.nom} ${titular.cognom1}` : '—';
  const filename = `${tipus} ${factura.numero} - ${nom}.pdf`.replace(/[\\/:*?"<>|]/g, '-');

  const result = await sendEmail({
    to: HOSTAL_EMAIL,
    subject: `${tipus} ${factura.numero} — ${nom}`,
    html: `<p>Hola,</p><p>Adjuntem la <strong>${tipus.toLowerCase()}</strong> núm. <strong>${factura.numero}</strong> de <strong>${nom}</strong> (total ${Number(factura.total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €).</p><p>Hostal Coll</p>`,
    attachments: [{ filename, content: Buffer.from(pdf).toString('base64') }],
  });
  if (!result.ok) return { ok: false, error: result.error };

  await audit({
    usuariId: actorId,
    accio: 'MODIFICACIO',
    entitat: 'factura',
    entitatId: facturaId,
    detall: { accio: 'factura-email', to: HOSTAL_EMAIL, numero: factura.numero },
    ip,
  });
  return { ok: true };
}
