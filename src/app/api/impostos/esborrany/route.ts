import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { validaAeat } from '@/lib/aeat/servei';
import { ErrorFitxer, generaFitxerAeat, parametresFitxer } from '@/lib/services/aeat';

export const maxDuration = 60;

// GET /api/impostos/esborrany?model=115&any=2026&trimestre=3&pagament=I
// Esborrany OFICIAL en PDF fet per la mateixa AEAT (servei ServValiDos): el gestio
// li envia el fitxer amb les caselles i l'AEAT torna el formulari omplert. No
// presenta res ni demana certificat. Si l'AEAT hi troba errors, els torna en text.
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { model, any, trimestre, pagament } = parametresFitxer(new URL(req.url).searchParams);
    const f = await generaFitxerAeat(model, any, trimestre, pagament);
    const r = await validaAeat({ model, any, periode: f.periode, fitxer: f.contingut });
    await audit({
      usuariId: auth.id, accio: 'DESCARREGA', entitat: 'declaracio_fiscal', entitatId: `${model}-${any}-${trimestre}`,
      detall: { accio: 'esborrany_aeat', ok: r.ok, errors: r.errors.slice(0, 10) }, ip: clientIp(req),
    });
    if (!r.pdfBase64) {
      return new NextResponse(`L’AEAT no ha generat l’esborrany.\n\nErrors:\n${r.errors.join('\n') || '—'}\n\nAvisos:\n${r.avisos.join('\n') || '—'}`, {
        status: 422, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    return new NextResponse(new Uint8Array(Buffer.from(r.pdfBase64, 'base64')), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="model-${model}-${any}-${trimestre}T-esborrany-AEAT.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof ErrorFitxer) return badRequest(err.message);
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
