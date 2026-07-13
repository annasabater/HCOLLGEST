import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { handleApiError, ok } from '@/lib/http';
import { buildFitxaBlank, buildLlibreBlank, buildReglamentBlank, buildCartellBlank } from '@/lib/pdf/plantilles-buides';
import { sendEmail } from '@/lib/email';

const HOSTAL_EMAIL = process.env.BACKUP_EMAIL_TO ?? 'hostalcoll@gmail.com';
const NOM_FITXA = 'Registre persones allotjades (en blanc).pdf';
const NOM_LLIBRE = 'Llibre de registre (en blanc).pdf';
const NOM_REGLAMENT = 'Reglament intern hospedatge (en blanc).pdf';
const NOM_CARTELL = 'Cartell reglament intern.pdf';

function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}

// GET /api/plantilles-buides?doc=fitxa|llibre|reglament|cartell — descarrega la plantilla en blanc.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const doc = new URL(req.url).searchParams.get('doc');
    if (doc === 'fitxa') return pdfResponse(buildFitxaBlank(), NOM_FITXA);
    if (doc === 'llibre') return pdfResponse(await buildLlibreBlank(), NOM_LLIBRE);
    if (doc === 'reglament') return pdfResponse(await buildReglamentBlank(), NOM_REGLAMENT);
    if (doc === 'cartell') return pdfResponse(await buildCartellBlank(), NOM_CARTELL);
    return new Response('Paràmetre doc no vàlid (fitxa|llibre|reglament|cartell)', { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/plantilles-buides — envia les plantilles en blanc per correu.
export async function POST(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const [fitxa, llibre, reglament, cartell] = await Promise.all([
      buildFitxaBlank(),
      buildLlibreBlank(),
      buildReglamentBlank(),
      buildCartellBlank(),
    ]);
    const result = await sendEmail({
      to: HOSTAL_EMAIL,
      subject: 'Plantilles en blanc — Registre, Llibre, Reglament intern i Cartell',
      html: `<p>Hola,</p><p>Adjuntem les plantilles <strong>en blanc</strong> per imprimir i omplir a mà: la fitxa de <strong>Registre de persones allotjades</strong>, el <strong>Llibre de registre</strong>, el <strong>Reglament intern d'hospedatge (LOPD)</strong> i el <strong>Cartell</strong> informatiu.</p><p>Hostal Coll</p>`,
      attachments: [
        { filename: NOM_FITXA, content: Buffer.from(fitxa).toString('base64') },
        { filename: NOM_LLIBRE, content: Buffer.from(llibre).toString('base64') },
        { filename: NOM_REGLAMENT, content: Buffer.from(reglament).toString('base64') },
        { filename: NOM_CARTELL, content: Buffer.from(cartell).toString('base64') },
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
