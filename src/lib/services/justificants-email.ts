/**
 * Enviament per correu dels 3 justificants d'una estada: la fitxa de "Registre de
 * persones allotjades", el "Llibre de registre" i el "Comprovant de Mossos" (si
 * l'estada ja s'ha comunicat). El fan servir el botó manual (/fitxa-email) i
 * l'enviament AUTOMÀTIC quan arriba el comprovant de Mossos (els 3 ja hi són).
 */
import 'server-only';
import { prisma } from '../db';
import { audit } from '../audit';
import { buildFitxaPdf } from '../pdf/fitxa';
import { buildRegistrePdf } from '../pdf/registre';
import { getComprovantMossosPdf } from '../pdf/comprovant-mossos';
import { sendEmail } from '../email';

const ESTABLIMENT_ID = 'hostal-coll';
const HOSTAL_EMAIL = process.env.BACKUP_EMAIL_TO ?? 'hostalcoll@gmail.com';

/** Envia els 3 justificants per correu. `auto` només canvia l'etiqueta d'auditoria. */
export async function enviaJustificantsEmail(
  estanciaId: string,
  actorId: string | null,
  ip: string | null,
  opts: { auto?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const estancia = await prisma.estancia.findFirst({
    where: { id: estanciaId, deletedAt: null },
    include: {
      habitacio: true,
      viatgers: { include: { huesped: true, signatura: true }, orderBy: { esTitular: 'desc' } },
      cobraments: { orderBy: { data: 'asc' } },
    },
  });
  if (!estancia) return { ok: false, error: 'Estada no trobada' };

  const establiment = await prisma.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID } });
  const viatgers = estancia.viatgers;

  const [fitxaPdf, registrePdf] = await Promise.all([
    buildFitxaPdf(establiment, estancia, viatgers),
    buildRegistrePdf(establiment, estancia),
  ]);
  const sufix = `${estancia.numContracte}-${estancia.anyContracte}`;
  const titular = viatgers[0]?.huesped;
  const nom = titular ? `${titular.nom} ${titular.cognom1}` : '—';

  const enviament = await prisma.enviamentMossos.findFirst({
    where: { estanciaId, estat: { in: ['ENVIAT', 'ACCEPTAT'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  const comprovant = enviament ? await getComprovantMossosPdf(enviament.id) : null;

  const attachments: { filename: string; content: string }[] = [
    { filename: `Registre persones allotjades - ${sufix}.pdf`, content: Buffer.from(fitxaPdf).toString('base64') },
    { filename: `Llibre registre - ${sufix}.pdf`, content: Buffer.from(registrePdf).toString('base64') },
  ];
  if (comprovant) {
    attachments.push({ filename: comprovant.filename, content: comprovant.buffer.toString('base64') });
  }

  const result = await sendEmail({
    to: HOSTAL_EMAIL,
    subject: `Registre de persones allotjades — ${nom} · Contracte ${estancia.numContracte}/${estancia.anyContracte}`,
    html: `<p>Hola,</p><p>Adjuntem, per a l'estada de <strong>${nom}</strong> (contracte ${estancia.numContracte}/${estancia.anyContracte}): la fitxa de registre de persones allotjades, el llibre de registre${comprovant ? ' i el comprovant de comunicació a Mossos' : ''}.</p><p>Hostal Coll</p>`,
    attachments,
  });
  if (!result.ok) return { ok: false, error: result.error };

  await audit({
    usuariId: actorId,
    accio: 'MODIFICACIO',
    entitat: 'estancia',
    entitatId: estanciaId,
    detall: { accio: opts.auto ? 'fitxa-email-auto' : 'fitxa-email', to: HOSTAL_EMAIL },
    ip,
  });
  return { ok: true };
}

/**
 * Enviament AUTOMÀTIC (best-effort): quan arriba el comprovant de Mossos i els 3
 * justificants ja hi són, s'envia el correu UNA sola vegada. El control "una
 * vegada" es fa mirant si ja hi ha un enviament automàtic previ a l'auditoria.
 * No llança mai: si el correu no està configurat o falla, no bloqueja el flux.
 */
export async function enviaJustificantsEmailAuto(estanciaId: string, ip: string | null): Promise<void> {
  try {
    const previ = await prisma.auditLog.findFirst({
      where: {
        entitat: 'estancia',
        entitatId: estanciaId,
        detall: { path: ['accio'], equals: 'fitxa-email-auto' },
      },
      select: { id: true },
    });
    if (previ) return; // ja s'ha enviat automàticament un cop
    await enviaJustificantsEmail(estanciaId, null, ip, { auto: true });
  } catch {
    /* best-effort: no bloqueja la comunicació a Mossos */
  }
}
