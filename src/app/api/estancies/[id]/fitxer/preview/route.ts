import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import { getFitxerPreview, MossosConfigError } from '@/lib/services/mossos';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/estancies/:id/fitxer/preview — dades en text clar que s'enviarien a
// Mossos, per revisar/editar abans de generar el fitxer.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const preview = await getFitxerPreview(id);
    return NextResponse.json(preview);
  } catch (err) {
    if (err instanceof MossosConfigError) {
      return NextResponse.json({ error: err.message, code: 'MOSSOS_CONFIG' }, { status: 422 });
    }
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
