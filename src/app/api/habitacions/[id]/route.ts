import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

const optStr = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const PatchSchema = z.object({
  nom: z.string().trim().min(1).optional(),
  tipus: z.preprocess(optStr, z.string().optional()),
  descripcio: z.preprocess(optStr, z.string().optional()),
  capacitat: z.coerce.number().int().min(1).optional(),
});

// PATCH /api/habitacions/:id — edita l'habitació (p. ex. el tipus per a tarifes)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const data = PatchSchema.parse(body);
    const habitacio = await prisma.habitacio.update({
      where: { id },
      data: {
        ...(data.nom !== undefined ? { nom: data.nom } : {}),
        ...(data.tipus !== undefined ? { tipus: data.tipus ?? null } : {}),
        ...(data.descripcio !== undefined ? { descripcio: data.descripcio ?? null } : {}),
        ...(data.capacitat !== undefined ? { capacitat: data.capacitat } : {}),
      },
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'habitacio', entitatId: id, ip: clientIp(req) });
    return ok({ habitacio });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
