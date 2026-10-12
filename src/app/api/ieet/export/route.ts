import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { getIeetPeriode, nomFitxerIeet } from '@/lib/services/ieet';
import { buildIeetXlsx } from '@/lib/exports/ieet-xlsx';
import { esClauPeriode, periodePerDefecte } from '@/lib/ieet';

// GET /api/ieet/export?periode=2026-1 — Excel de la taxa turística del període.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const clau = new URL(req.url).searchParams.get('periode') ?? periodePerDefecte(new Date());
    if (!esClauPeriode(clau)) return badRequest('Període no vàlid (format AAAA-1 o AAAA-2)');

    const dades = await getIeetPeriode(clau);
    const xlsx = await buildIeetXlsx(dades);
    await audit({ usuariId: auth.id, accio: 'DESCARREGA', entitat: 'ieet', detall: { periode: clau }, ip: clientIp(req) });
    const nom = nomFitxerIeet(dades.periode);
    return new NextResponse(new Uint8Array(xlsx), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="taxa-turistica-${clau}.xlsx"; filename*=UTF-8''${encodeURIComponent(nom)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
