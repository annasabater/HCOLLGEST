import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError } from '@/lib/http';
import { createFacturaRectificativa } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/factura-rectificativa — crea una factura simplificada
// rectificativa (reducció, import negatiu) d'una factura anterior de l'estada.
// body: { facturaOriginalId, import, motiu?, numero?, data? }
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const factura = await createFacturaRectificativa(id, body, { id: auth.id }, clientIp(req));
    return created({ factura });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
