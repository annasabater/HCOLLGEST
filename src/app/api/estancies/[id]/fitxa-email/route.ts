import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { buildFitxaPdf } from '@/lib/pdf/fitxa';
import { buildRegistrePdf } from '@/lib/pdf/registre';
import { getComprovantMossosPdf } from '@/lib/pdf/comprovant-mossos';
import { sendEmail } from '@/lib/email';
const ESTABLIMENT_ID = 'hostal-coll';
type Ctx = { params: Promise<{ id: string }> };

const HOSTAL_EMAIL = process.env.BACKUP_EMAIL_TO ?? 'hostalcoll@gmail.com';

// POST /api/estancies/:id/fitxa-email — envia la fitxa PDF de registre per correu
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const to = HOSTAL_EMAIL;

    const estancia = await prisma.estancia.findFirst({
      where: { id, deletedAt: null },
      include: {
        habitacio: true,
        viatgers: { include: { huesped: true, signatura: true }, orderBy: { esTitular: 'desc' } },
        cobraments: { orderBy: { data: 'asc' } },
      },
    });
    if (!estancia) return notFound();

    const establiment = await prisma.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID } });
    const viatgers = estancia.viatgers;

    // Adjuntem els dos documents: la fitxa de registre i el llibre de registre (Registre de persones allotjades).
    const [fitxaPdf, registrePdf] = await Promise.all([
      buildFitxaPdf(establiment, estancia, viatgers),
      buildRegistrePdf(establiment, estancia),
    ]);
    const sufix = `${estancia.numContracte}-${estancia.anyContracte}`;
    const titular = viatgers[0]?.huesped;
    const nom = titular ? `${titular.nom} ${titular.cognom1}` : '—';

    // 3r adjunt: el comprovant de Mossos, si l'estada ja s'ha comunicat.
    const enviament = await prisma.enviamentMossos.findFirst({
      where: { estanciaId: id, estat: { in: ['ENVIAT', 'ACCEPTAT'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const comprovant = enviament ? await getComprovantMossosPdf(enviament.id) : null;

    const attachments = [
      { filename: `Registre persones allotjades - ${sufix}.pdf`, content: Buffer.from(fitxaPdf).toString('base64') },
      { filename: `Llibre registre - ${sufix}.pdf`, content: Buffer.from(registrePdf).toString('base64') },
    ];
    if (comprovant) {
      attachments.push({ filename: comprovant.filename, content: comprovant.buffer.toString('base64') });
    }

    const result = await sendEmail({
      to,
      subject: `Registre de persones allotjades — ${nom} · Contracte ${estancia.numContracte}/${estancia.anyContracte}`,
      html: `<p>Hola,</p><p>Adjuntem, per a l'estada de <strong>${nom}</strong> (contracte ${estancia.numContracte}/${estancia.anyContracte}): la fitxa de registre de persones allotjades, el llibre de registre${comprovant ? ' i el comprovant de comunicació a Mossos' : ''}.</p><p>Hostal Coll</p>`,
      attachments,
    });

    if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: 502, headers: { 'Content-Type': 'application/json' } });

    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'estancia', entitatId: id, detall: { accio: 'fitxa-email', to }, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
