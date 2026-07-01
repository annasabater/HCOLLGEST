import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { handleApiError, notFound } from '@/lib/http';
import { buildRegistrePdf } from '@/lib/pdf/registre';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/estancies/:id/registre-pdf — "Libro de Registro de Alojamiento" (NRA/NRUA) en PDF.
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const estancia = await prisma.estancia.findFirst({
      where: { id, deletedAt: null },
      include: {
        habitacio: true,
        viatgers: { include: { huesped: true, signatura: true }, orderBy: { esTitular: 'desc' } },
        cobraments: { orderBy: { data: 'asc' } },
      },
    });
    if (!estancia) return notFound();

    const establiment = await prisma.establiment.findFirst();
    const pdf = await buildRegistrePdf(establiment, estancia);

    await audit({
      usuariId: auth.id,
      accio: 'IMPRESSIO',
      entitat: 'estancia',
      entitatId: id,
      detall: { document: 'registre-pdf' },
      ip: clientIp(req),
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="registre-${estancia.numContracte}-${estancia.anyContracte}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
