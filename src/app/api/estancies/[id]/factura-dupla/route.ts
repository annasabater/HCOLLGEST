import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError } from '@/lib/http';
import { createFacturaDupla } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/factura-dupla — crea alhora una factura fiscal i una
// simplificada amb el mateix import (només la fiscal va a Veri*Factu).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const result = await createFacturaDupla(id, body, { id: auth.id }, clientIp(req));
    return created(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
