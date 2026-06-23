import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok } from '@/lib/http';
import { TascaNetejaUpdateSchema } from '@/lib/validation/neteja';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/tasques-neteja/:id — marcar FETA, reasignar, cambiar tipo/fecha…
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = TascaNetejaUpdateSchema.parse(body);

    const tasca = await prisma.tascaNeteja.update({
      where: { id },
      data,
      include: { habitacio: true, treballador: true },
    });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'tasca_neteja',
      entitatId: id,
      detall: { camps: Object.keys(data) },
      ip: clientIp(req),
    });
    return ok({ tasca });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/tasques-neteja/:id — elimina una tasca de neteja.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    await prisma.tascaNeteja.delete({ where: { id } });

    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'tasca_neteja',
      entitatId: id,
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
