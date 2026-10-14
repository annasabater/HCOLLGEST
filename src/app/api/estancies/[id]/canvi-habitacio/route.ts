import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError } from '@/lib/http';
import { canviarHabitacio } from '@/lib/services/canvi-habitacio';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/canvi-habitacio — { habitacioId, data }: a partir de
// `data` l'hoste dorm a la nova habitació (mateix contracte).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    return created(await canviarHabitacio(id, body, { id: auth.id }, clientIp(req)));
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
