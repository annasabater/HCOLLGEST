import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { notFound, handleApiError } from '@/lib/http';
import { buildDocPdf } from '@/lib/pdf/document';
import { docPdfPressupost } from '@/lib/pdf/pressupost';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/pressupostos/:id/pdf — PDF del pressupost tal com està desat (el mateix
// disseny que «Imprimir PDF»). És el que s'adjunta en enviar-lo per WhatsApp.
// ?descarrega=1 → es descarrega (per arrossegar-lo al WhatsApp de l'ordinador).
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const p = await prisma.pressupost.findFirst({
      where: { id, deletedAt: null },
      include: {
        linies: { orderBy: { createdAt: 'asc' } },
        estancia: { select: { viatgers: { where: { esTitular: true }, take: 1, include: { huesped: true } } } },
      },
    });
    if (!p) return notFound('Pressupost no trobat');
    const establiment = await prisma.establiment.findFirst();

    const pdf = await buildDocPdf(docPdfPressupost(p, p.estancia?.viatgers[0]?.huesped ?? null, establiment));
    await audit({ usuariId: auth.id, accio: 'DESCARREGA', entitat: 'pressupost', entitatId: p.id, detall: { document: 'pdf' }, ip: clientIp(req) });

    const descarrega = new URL(req.url).searchParams.get('descarrega') === '1';
    const nom = `Pressupost ${p.numero} - Hostal Coll.pdf`.replace(/[^\w .-]/g, '-');
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${descarrega ? 'attachment' : 'inline'}; filename="${nom}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
