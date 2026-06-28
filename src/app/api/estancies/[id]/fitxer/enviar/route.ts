import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError } from '@/lib/http';
import {
  enviarFitxerMossos,
  MossosConfigError,
  MossosIncompletError,
  type ViatgerOverride,
} from '@/lib/services/mossos';
import { tipusPagamentValues } from '@/lib/validation/enums';

type Ctx = { params: Promise<{ id: string }> };

// El flux del navegador remot pot trigar; demanem fins a 5 min (Vercel ho permet
// amb fluid compute / pla Pro; en Hobby es limita igualment).
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

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

// POST /api/estancies/:id/fitxer/enviar — genera i PUJA automàticament a Mossos
// (navegador remot Browserbase). Retorna el resultat en JSON.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const tipusPagament = tipusPagamentValues.includes(body?.tipusPagament)
      ? (body.tipusPagament as (typeof tipusPagamentValues)[number])
      : 'DESTINACIO';

    const edits = z.array(ViatgerEditSchema).safeParse(body?.viatgers);
    const overrides: Record<string, ViatgerOverride> = {};
    const persist: Record<string, boolean> = {};
    if (edits.success) {
      for (const e of edits.data) {
        if (e.overrides) overrides[e.huespedId] = e.overrides;
        if (e.persist) persist[e.huespedId] = true;
      }
    }

    const result = await enviarFitxerMossos(id, { id: auth.id }, clientIp(req), {
      tipusPagamentMossos: tipusPagament,
      overrides,
      persist,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
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
