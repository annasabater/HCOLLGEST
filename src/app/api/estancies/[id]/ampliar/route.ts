import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError } from '@/lib/http';
import { AmpliacioSchema } from '@/lib/validation/registre';
import { ampliarEstancia } from '@/lib/services/registre';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/ampliar — crea una ampliació enllaçada (1.1, 1.2…)
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const { dataEntrada, dataSortida, habitacioId, reaprofitarFirmes, dataSignatura, llocSignatura } =
      AmpliacioSchema.parse(body);
    const result = await ampliarEstancia(
      id,
      { dataEntrada, dataSortida, habitacioId, reaprofitarFirmes, dataSignatura, llocSignatura },
      { id: auth.id },
      clientIp(req),
    );
    return created(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
