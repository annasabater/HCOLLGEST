import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { handleApiError, notFound } from '@/lib/http';
import { buildFitxaPdf } from '@/lib/pdf/fitxa';

const ESTABLIMENT_ID = 'hostal-coll';
type Ctx = { params: Promise<{ id: string }> };

// GET /api/estancies/:id/fitxa-pdf — fitxa "Registre de persones allotjades" (PDF amb firma)
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const estancia = await prisma.estancia.findFirst({ where: { id, deletedAt: null } });
    if (!estancia) return notFound();

    const [establiment, viatgers] = await Promise.all([
      prisma.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID } }),
      prisma.estanciaViatger.findMany({
        where: { estanciaId: id },
        include: { huesped: true, signatura: true },
        orderBy: { esTitular: 'desc' },
      }),
    ]);

    const pdf = await buildFitxaPdf(establiment, estancia, viatgers);

    // Nom del fitxer amb el número de contracte: "Registre - 26005-2026.pdf".
    const filename = `Registre - ${estancia.numContracte}-${estancia.anyContracte}.pdf`;

    await audit({
      usuariId: auth.id,
      accio: 'IMPRESSIO',
      entitat: 'estancia',
      entitatId: id,
      detall: { document: 'fitxa-pdf' },
      ip: clientIp(req),
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
