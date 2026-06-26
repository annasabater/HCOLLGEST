import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/verifactu/:id — elimina el registre Veri*Factu (només ADMIN)
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;
    await prisma.registreVerifactu.delete({ where: { id } });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
