import { z } from 'zod';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { marcaSortidaProbable, treuSortidaProbable } from '@/lib/services/sortida-probable';

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no vàlida'),
  nota: z.string().trim().max(300).nullish(),
});

// POST /api/estancies/:id/sortida-probable — «Marxarà abans» (no toca la sortida oficial).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const input = Schema.parse(await req.json().catch(() => null));
    return ok(await marcaSortidaProbable(id, input, { id: auth.id }, clientIp(req)));
  } catch (err) {
    // Errors del servei (dates fora de l'estada…) amb missatge per a l'usuari.
    if (err instanceof Error && err.name === 'Error') return badRequest(err.message);
    return handleApiError(err);
  }
}

// DELETE /api/estancies/:id/sortida-probable — «Al final es queda».
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    return ok(await treuSortidaProbable(id, { id: auth.id }, clientIp(req)));
  } catch (err) {
    // Errors del servei (dates fora de l'estada…) amb missatge per a l'usuari.
    if (err instanceof Error && err.name === 'Error') return badRequest(err.message);
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
