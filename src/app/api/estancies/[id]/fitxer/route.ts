import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/http';
import {
  generateFitxer,
  MossosConfigError,
  MossosIncompletError,
  type ViatgerOverride,
} from '@/lib/services/mossos';
import { tipusPagamentValues } from '@/lib/validation/enums';

type Ctx = { params: Promise<{ id: string }> };

const OV = z.string().optional();
const ViatgerEditSchema = z.object({
  huespedId: z.string().min(1),
  persist: z.boolean().optional(),
  overrides: z
    .object({
      nom: OV, cognom1: OV, cognom2: OV, tipusDocument: OV, numDocument: OV, numSuport: OV,
      dataExpedicio: OV, sexe: OV, dataNaixement: OV, nacionalitat: OV, telefon: OV, email: OV,
      adreca: OV, pais: OV, provincia: OV, municipi: OV, localitat: OV, codiPostal: OV,
    })
    .partial()
    .optional(),
});

// POST /api/estancies/:id/fitxer — genera el fitxer massiu (.txt) y lo descarga.
// Crea un enviament PENDENT. Devuelve 422 si falta config de Mossos (§9).
// El body pot incloure { tipusPagament } per comunicar-ne un de concret a Mossos
// (per defecte "Pagament a destinació"), independent del cobrament intern.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const tipusPagament = tipusPagamentValues.includes(body?.tipusPagament)
      ? (body.tipusPagament as (typeof tipusPagamentValues)[number])
      : 'DESTINACIO';

    // Edicions abans d'enviar (opcionals): { huespedId, overrides, persist }[].
    const edits = z.array(ViatgerEditSchema).safeParse(body?.viatgers);
    const overrides: Record<string, ViatgerOverride> = {};
    const persist: Record<string, boolean> = {};
    if (edits.success) {
      for (const e of edits.data) {
        if (e.overrides) overrides[e.huespedId] = e.overrides;
        if (e.persist) persist[e.huespedId] = true;
      }
    }

    const { buffer, fitxerNom, encoding, provisional } = await generateFitxer(
      id,
      { id: auth.id },
      clientIp(req),
      { tipusPagamentMossos: tipusPagament, overrides, persist },
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
