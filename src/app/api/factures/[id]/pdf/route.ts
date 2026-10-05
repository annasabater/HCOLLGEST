import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { handleApiError, notFound } from '@/lib/http';
import { habitacioLlibre } from '@/lib/habitacio-llibre';
import { buildFacturaSimplePdf, type FacturaPdfLinia } from '@/lib/pdf/factura-simple';

type Ctx = { params: Promise<{ id: string }> };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmtDate = (d: Date) => d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

// GET /api/factures/:id/pdf[?custodia=true] — factura simplificada en PDF (sense peu del navegador).
// Reflecteix el que hi ha DESAT a la factura (cal "Desar canvis" abans de descarregar).
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const ambCustodia = new URL(req.url).searchParams.get('custodia') === 'true';

    const factura = await prisma.factura.findFirst({
      where: { id, deletedAt: null },
      include: {
        linies: true,
        estancia: {
          include: {
            habitacio: true,
            viatgers: {
              where: { esTitular: true },
              include: { huesped: true, habitacioSeparada: { select: { nom: true } } },
            },
            diposits: { where: { estat: 'EN_CUSTODIA' }, orderBy: { data: 'asc' } },
          },
        },
      },
    });
    if (!factura) return notFound();

    const establiment = await prisma.establiment.findFirst();
    const titular = factura.estancia.viatgers[0]?.huesped ?? null;
    const diposits = ambCustodia && !factura.fiancaInclosa ? factura.estancia.diposits : [];

    const habDates =
      factura.estancia.dataEntrada && factura.estancia.dataSortida
        ? `Del ${fmtDate(factura.estancia.dataEntrada)} al ${fmtDate(factura.estancia.dataSortida)}`
        : '';

    const linies: FacturaPdfLinia[] = factura.linies.map((l) => {
      const descripcio = l.descripcio ?? l.concepte;
      const needsDates = l.concepte === 'ALLOTJAMENT' && habDates !== '' && !descripcio.includes('Del ');
      return { descripcio, detall: needsDates ? habDates : undefined, import: Number(l.import) };
    });
    for (const d of diposits) {
      linies.push({ descripcio: `${d.notes ?? 'Fiança'} ${fmtDate(d.data)}`, import: Number(d.import) });
    }
    const total = round2(linies.reduce((a, l) => a + l.import, 0));

    const pdf = await buildFacturaSimplePdf({
      emissor: {
        titular: factura.emissorTitular || establiment?.facturaTitular || 'Elisabet Nualart Coll',
        nif: factura.emissorNif || `NIF ${establiment?.facturaNif || '38835174L'}`,
        adreca: factura.emissorAdreca || establiment?.adreca || 'C/ Sant Isidre, 54',
        localitat:
          factura.emissorLocalitat ||
          [establiment?.codiPostal, establiment?.poblacio, establiment?.provincia ? `(${establiment.provincia})` : null]
            .filter(Boolean)
            .join(' ') ||
          '08370 Calella (Barcelona)',
        descriptor: establiment?.poblacio ? `Casa de Hostes · ${establiment.poblacio}` : 'Casa de Hostes · Calella',
      },
      client: {
        nom:
          factura.clientNom ??
          (titular ? [titular.nom, titular.cognom1, titular.cognom2].filter(Boolean).join(' ') : ''),
        nif:
          factura.clientNif ??
          (titular?.numDocument ? `${titular.tipusDocument ?? 'DNI'} ${titular.numDocument}` : ''),
        adreca: factura.clientAdreca ?? titular?.adreca ?? '',
        localitat:
          factura.clientLocalitat ??
          [titular?.codiPostal, titular?.municipi || titular?.localitat].filter(Boolean).join(' '),
      },
      numero: factura.numero.replace(/^\d{4}-/, ''),
      data: fmtDate(factura.data),
      habitacio: habitacioLlibre(factura.estancia) ?? '',
      linies,
      total,
    });

    await audit({
      usuariId: auth.id,
      accio: 'IMPRESSIO',
      entitat: 'factura',
      entitatId: id,
      detall: { document: 'factura-simple-pdf' },
      ip: clientIp(req),
    });

    const filename = `Factura ${factura.numero.replace(/[\\/]/g, '-')}.pdf`;
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
