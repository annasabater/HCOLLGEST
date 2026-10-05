import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { buildDocPdf, DocPdfSchema } from '@/lib/pdf/document';

// POST /api/imprimir/pdf — PDF net (sense URL/data del navegador) del document que
// l'usuari té a pantalla (factura simple/fiscal, fiança, pressupost). El cos és el
// contingut de la pàgina (vegeu `src/lib/pdf/client-script.ts`).
export async function POST(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const parsed = DocPdfSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest('Document no vàlid');
    const doc = parsed.data;

    const pdf = await buildDocPdf(doc);

    await audit({
      usuariId: auth.id,
      accio: 'IMPRESSIO',
      entitat: 'document',
      entitatId: doc.ref || null,
      detall: { document: doc.title },
      ip: clientIp(req),
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${doc.title.replace(/[^\w .-]/g, '-')}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
