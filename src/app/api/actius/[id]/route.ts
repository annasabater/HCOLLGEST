import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, noContent, notFound, ok } from '@/lib/http';
import { ActiuUpdateSchema } from '@/lib/validation/actiu';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  const actiu = await prisma.actiu.findFirst({
    where: { id, deletedAt: null },
    include: { proveidor: true, habitacio: true, historial: { orderBy: { data: 'desc' } } },
  });
  if (!actiu) return notFound();
  return ok({ actiu });
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const data = ActiuUpdateSchema.parse(body);
    const exists = await prisma.actiu.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!exists) return notFound();
    const actiu = await prisma.actiu.update({ where: { id }, data });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'actiu',
      entitatId: id,
      detall: { camps: Object.keys(data) },
      ip: clientIp(req),
    });
    return ok({ actiu });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.actiu.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'actiu',
      entitatId: id,
      ip: clientIp(req),
    });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
