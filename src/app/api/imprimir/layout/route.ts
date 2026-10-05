import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { buildLayoutPdf, LayoutPdfSchema } from '@/lib/pdf/layout';

// POST /api/imprimir/layout — PDF net (sense URL/data del navegador) del llibre de
// registre tal com es veu a pantalla (vegeu `src/lib/pdf/layout-script.ts`).
export async function POST(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const parsed = LayoutPdfSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest('Document no vàlid');
    const doc = parsed.data;

    const pdf = await buildLayoutPdf(doc);

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
