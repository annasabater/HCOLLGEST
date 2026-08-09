import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { z } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

const ItemSchema = z.object({ article: z.string().min(1), qty: z.coerce.number().int().min(0) });
const Schema = z.object({
  manteniment: z.array(ItemSchema).default([]),
  sortida: z.array(ItemSchema).default([]),
});

// PATCH /api/bugaderia/habitacions/:id — desa els valors per defecte de l'habitació.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const bugaderiaDefault = Schema.parse(await req.json().catch(() => null));
    await prisma.habitacio.update({ where: { id }, data: { bugaderiaDefault } });
    return ok({ bugaderiaDefault });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
