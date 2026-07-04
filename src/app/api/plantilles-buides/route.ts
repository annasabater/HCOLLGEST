import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { handleApiError, ok } from '@/lib/http';
import { buildFitxaBlank, buildLlibreBlank } from '@/lib/pdf/plantilles-buides';
import { sendEmail } from '@/lib/email';

const HOSTAL_EMAIL = process.env.BACKUP_EMAIL_TO ?? 'hostalcoll@gmail.com';
const NOM_FITXA = 'Registre persones allotjades (en blanc).pdf';
const NOM_LLIBRE = 'Llibre de registre (en blanc).pdf';

function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}

// GET /api/plantilles-buides?doc=fitxa|llibre — descarrega la plantilla en blanc.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const doc = new URL(req.url).searchParams.get('doc');
    if (doc === 'fitxa') return pdfResponse(buildFitxaBlank(), NOM_FITXA);
    if (doc === 'llibre') return pdfResponse(await buildLlibreBlank(), NOM_LLIBRE);
    return new Response('Paràmetre doc no vàlid (fitxa|llibre)', { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/plantilles-buides — envia les dues plantilles en blanc per correu.
export async function POST(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const fitxa = buildFitxaBlank();
    const llibre = await buildLlibreBlank();
    const result = await sendEmail({
      to: HOSTAL_EMAIL,
      subject: 'Plantilles en blanc — Registre de persones allotjades i Llibre de registre',
      html: `<p>Hola,</p><p>Adjuntem les plantilles <strong>en blanc</strong> per imprimir i omplir a mà: la fitxa de <strong>Registre de persones allotjades</strong> i el <strong>Llibre de registre</strong>.</p><p>Hostal Coll</p>`,
      attachments: [
        { filename: NOM_FITXA, content: Buffer.from(fitxa).toString('base64') },
        { filename: NOM_LLIBRE, content: Buffer.from(llibre).toString('base64') },
      ],
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await audit({ usuariId: auth.id, accio: 'DESCARREGA', entitat: 'plantilla_buida', detall: { email: HOSTAL_EMAIL }, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
