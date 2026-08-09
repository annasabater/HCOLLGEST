import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, noContent, handleApiError } from '@/lib/http';
import { z } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

const UpdateSchema = z.object({
  nom: z.string().trim().min(1).optional(),
  preu: z.coerce.number().nonnegative().optional(),
  actiu: z.coerce.boolean().optional(),
  ordre: z.coerce.number().int().optional(),
});

// PATCH /api/bugaderia/articles/:id — editar un article del catàleg.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const d = UpdateSchema.parse(await req.json().catch(() => null));
    const article = await prisma.articleBugaderia.update({
      where: { id },
      data: {
        ...(d.nom !== undefined ? { nom: d.nom } : {}),
        ...(d.preu !== undefined ? { preu: d.preu } : {}),
        ...(d.actiu !== undefined ? { actiu: d.actiu } : {}),
        ...(d.ordre !== undefined ? { ordre: d.ordre } : {}),
      },
    });
    return ok({ article });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/bugaderia/articles/:id — esborrat lògic.
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.articleBugaderia.update({ where: { id }, data: { deletedAt: new Date(), actiu: false } });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
