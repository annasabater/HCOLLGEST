import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, noContent, ok } from '@/lib/http';
import { GastoUpdateSchema } from '@/lib/validation/gasto';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/gastos/:id — edita una despesa (p. ex. marcar/desmarcar com a fiança).
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const input = GastoUpdateSchema.parse(body);

    const data: Prisma.GastoUpdateInput = {};
    if (input.data !== undefined) data.data = input.data;
    if (input.import !== undefined) data.import = input.import;
    if (input.descripcio !== undefined) data.descripcio = input.descripcio;
    if (input.numFactura !== undefined) data.numFactura = input.numFactura ?? null;
    if (input.metodePagament !== undefined) data.metodePagament = input.metodePagament;
    if (input.esFianca !== undefined) data.esFianca = input.esFianca;
    if (input.categoriaId !== undefined) data.categoria = { connect: { id: input.categoriaId } };

    const gasto = await prisma.gasto.update({ where: { id }, data });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'gasto',
      entitatId: id,
      detall: { esFianca: input.esFianca },
      ip: clientIp(req),
    });
    return ok({ gasto });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/gastos/:id — borrado lógico
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.gasto.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'gasto',
      entitatId: id,
      ip: clientIp(req),
    });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
