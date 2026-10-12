import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { getIeetAny } from '@/lib/services/ieet';
import { buildIeetXlsx } from '@/lib/exports/ieet-xlsx';

// GET /api/ieet/export?any=2026 — Excel de la taxa turística de l'any.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const any = Number(new URL(req.url).searchParams.get('any') ?? new Date().getFullYear());
    if (!Number.isInteger(any) || any < 2000 || any > 2100) return badRequest('Any no vàlid');

    const xlsx = await buildIeetXlsx(await getIeetAny(any));
    await audit({ usuariId: auth.id, accio: 'DESCARREGA', entitat: 'ieet', detall: { any }, ip: clientIp(req) });
    return new NextResponse(new Uint8Array(xlsx), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="taxa-turistica-${any}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
