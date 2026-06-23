import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError } from '@/lib/http';
import { addPagamentEstada } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/pagaments — registra un pagament a compte de l'estada
// (sense factura encara). Compta com a ingrés des de ja.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const cobrament = await addPagamentEstada(id, body, { id: auth.id }, clientIp(req));
    return created({ cobrament });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
