import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { noContent, handleApiError } from '@/lib/http';
import { desferCanviHabitacio } from '@/lib/services/canvi-habitacio';

type Ctx = { params: Promise<{ id: string; canviId: string }> };

// DELETE /api/estancies/:id/canvi-habitacio/:canviId — desfà l'últim canvi d'habitació.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id, canviId } = await ctx.params;
    await desferCanviHabitacio(id, canviId, { id: auth.id }, clientIp(req));
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
