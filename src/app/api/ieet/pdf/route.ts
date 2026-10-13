import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { getIeetPeriode } from '@/lib/services/ieet';
import { buildIeetPdf } from '@/lib/pdf/ieet';
import { giraPerImprimir } from '@/lib/pdf/gira-per-imprimir';
import { esClauPeriode, periodePerDefecte } from '@/lib/ieet';

// GET /api/ieet/pdf?periode=2026-1 — PDF de la taxa turística del període.
// &imprimir=1 → la mateixa pàgina girada dins d'un A4 vertical (per a l'iPad).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const params = new URL(req.url).searchParams;
    const clau = params.get('periode') ?? periodePerDefecte(new Date());
    const perImprimir = params.get('imprimir') === '1';
    if (!esClauPeriode(clau)) return badRequest('Període no vàlid (format AAAA-1 o AAAA-2)');

    const [dades, est] = await Promise.all([
      getIeetPeriode(clau),
      prisma.establiment.findFirst({ select: { nom: true, raoSocial: true, facturaNif: true, poblacio: true } }),
    ]);
    const horitzontal = await buildIeetPdf(dades, { nom: est?.nom || est?.raoSocial || 'Hostal Coll', nif: est?.facturaNif ?? null, poblacio: est?.poblacio ?? null });
    const pdf = perImprimir ? await giraPerImprimir(horitzontal) : horitzontal;
    await audit({ usuariId: auth.id, accio: 'DESCARREGA', entitat: 'ieet', detall: { periode: clau, format: perImprimir ? 'pdf-imprimir' : 'pdf' }, ip: clientIp(req) });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="taxa-turistica-${clau}${perImprimir ? '-imprimir' : ''}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
