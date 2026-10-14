import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { buildTaulesPdf, TaulesPdfSchema } from '@/lib/pdf/taules';

// POST /api/imprimir/taules — PDF en A4 horitzontal (taules a tot l'ample del full)
// d'un document de taules tal com es veu a pantalla (vegeu `src/lib/pdf/taules-script.ts`).
export async function POST(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const parsed = TaulesPdfSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest('Document no vàlid');
    const doc = parsed.data;

    const pdf = await buildTaulesPdf(doc);

    await audit({
      usuariId: auth.id,
      accio: 'IMPRESSIO',
      entitat: 'document',
      entitatId: null,
      detall: { document: doc.titol },
      ip: clientIp(req),
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${doc.titol.replace(/[^\w .-]/g, '-')}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
