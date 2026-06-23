import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/http';
import { generateFitxer, MossosConfigError, MossosIncompletError } from '@/lib/services/mossos';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/fitxer — genera el fitxer massiu (.txt) y lo descarga.
// Crea un enviament PENDENT. Devuelve 422 si falta config de Mossos (§9).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const { buffer, fitxerNom, encoding, provisional } = await generateFitxer(
      id,
      { id: auth.id },
      clientIp(req),
    );

    const charset = encoding === 'utf-8' ? 'utf-8' : 'ISO-8859-1';
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': `text/plain; charset=${charset}`,
        'Content-Disposition': `attachment; filename="${fitxerNom}"`,
        'Cache-Control': 'no-store',
        'X-Mossos-Provisional': provisional ? 'true' : 'false',
      },
    });
  } catch (err) {
    if (err instanceof MossosConfigError) {
      return NextResponse.json({ error: err.message, code: 'MOSSOS_CONFIG' }, { status: 422 });
    }
    if (err instanceof MossosIncompletError) {
      return NextResponse.json({ error: err.message, code: 'MOSSOS_INCOMPLET' }, { status: 422 });
    }
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
