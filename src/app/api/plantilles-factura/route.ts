import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import { prisma } from '@/lib/db';
import { buildFacturaWord } from '@/lib/plantilles/factura-word';

const ESTABLIMENT_ID = 'hostal-coll';

// GET /api/plantilles-factura?doc=fiscal|simple — descarrega la plantilla de
// factura (fiscal o simplificada) en format Word (.doc), com a còpia editable.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const doc = new URL(req.url).searchParams.get('doc');
    if (doc !== 'fiscal' && doc !== 'simple') {
      return new Response('Paràmetre doc no vàlid (fiscal|simple)', { status: 400 });
    }
    const establiment = await prisma.establiment.findUnique({ where: { id: ESTABLIMENT_ID } });
    const html = buildFacturaWord(establiment, doc);
    const filename = doc === 'fiscal' ? 'Plantilla factura fiscal.doc' : 'Plantilla factura simplificada.doc';
    return new Response(html, {
      headers: {
        'Content-Type': 'application/msword; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
