import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError } from '@/lib/http';
import { createFacturaFiscalDeSimples } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/factura-fiscal-simples — crea una factura FISCAL a
// partir de factures SIMPLIFICADES existents (body: { simplesIds, numero?, data? }).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const factura = await createFacturaFiscalDeSimples(id, body, { id: auth.id }, clientIp(req));
    return created({ factura });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
