import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, noContent, handleApiError } from '@/lib/http';
import { AvisUpdateSchema } from '@/lib/validation/avis';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/avisos/:id — edita o activa/desactiva un avís
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = AvisUpdateSchema.parse(body);

    const avis = await prisma.avis.update({
      where: { id },
      data: {
        ...(data.nom !== undefined ? { nom: data.nom } : {}),
        ...(data.telefon !== undefined ? { telefon: data.telefon ?? null } : {}),
        ...(data.email !== undefined ? { email: data.email ?? null } : {}),
        ...(data.motiu !== undefined ? { motiu: data.motiu } : {}),
        ...(data.gravetat !== undefined ? { gravetat: data.gravetat } : {}),
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
        ...(data.actiu !== undefined ? { actiu: data.actiu } : {}),
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'avis',
      entitatId: id,
      ip: clientIp(req),
    });
    return ok({ avis });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/avisos/:id — elimina un avís
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    await prisma.avis.delete({ where: { id } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'avis',
      entitatId: id,
      ip: clientIp(req),
    });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
