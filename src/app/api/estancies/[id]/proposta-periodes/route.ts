import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { proposaPeriodesPerMes } from '@/lib/services/calcul-preu';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/estancies/:id/proposta-periodes?import=X — proposa repartir l'import
// entre els mesos naturals de l'estada (segons el pes de la calculadora de preus).
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const importe = Number(new URL(req.url).searchParams.get('import'));
    if (!Number.isFinite(importe) || importe <= 0) return badRequest("Cal un import positiu");
    const proposta = await proposaPeriodesPerMes(id, importe);
    return ok(proposta);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
