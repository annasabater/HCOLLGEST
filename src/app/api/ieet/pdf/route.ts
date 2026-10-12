import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { getIeetPeriode } from '@/lib/services/ieet';
import { buildIeetPdf } from '@/lib/pdf/ieet';
import { esClauPeriode, periodePerDefecte } from '@/lib/ieet';

// GET /api/ieet/pdf?periode=2026-1 — PDF de la taxa turística del període.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const clau = new URL(req.url).searchParams.get('periode') ?? periodePerDefecte(new Date());
    if (!esClauPeriode(clau)) return badRequest('Període no vàlid (format AAAA-1 o AAAA-2)');

    const [dades, est] = await Promise.all([
      getIeetPeriode(clau),
      prisma.establiment.findFirst({ select: { nom: true, raoSocial: true, facturaNif: true } }),
    ]);
    const pdf = await buildIeetPdf(dades, { nom: est?.nom || est?.raoSocial || 'Hostal Coll', nif: est?.facturaNif ?? null });
    await audit({ usuariId: auth.id, accio: 'DESCARREGA', entitat: 'ieet', detall: { periode: clau, format: 'pdf' }, ip: clientIp(req) });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="taxa-turistica-${clau}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
