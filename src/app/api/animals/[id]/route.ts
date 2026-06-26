import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { z } from 'zod';
import { midaAnimalValues } from '@/lib/validation/enums';

type Ctx = { params: Promise<{ id: string }> };

const AnimalEditSchema = z.object({
  nom: z.string().trim().min(1).optional(),
  especie: z.string().trim().min(1).optional(),
  mida: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.enum(midaAnimalValues).optional(),
  ),
});

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const existing = await prisma.animal.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return notFound();

    const body = await req.json().catch(() => null);
    const data = AnimalEditSchema.parse(body);

    const animal = await prisma.animal.update({
      where: { id },
      data: {
        ...(data.nom !== undefined && { nom: data.nom }),
        ...(data.especie !== undefined && { especie: data.especie }),
        ...(data.mida !== undefined ? { mida: data.mida } : {}),
      },
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'animal', entitatId: id, detall: data, ip: clientIp(req) });
    return ok({ animal });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const existing = await prisma.animal.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return notFound();

    await prisma.animal.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'animal', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
