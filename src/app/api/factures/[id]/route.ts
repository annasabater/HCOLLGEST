import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { handleApiError, notFound, ok } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const factura = await prisma.factura.findFirst({
      where: { id, deletedAt: null },
      include: {
        linies: true,
        cobraments: { orderBy: { data: 'asc' } },
        estancia: {
          include: { viatgers: { where: { esTitular: true }, include: { huesped: true } } },
        },
      },
    });
    if (!factura) return notFound();
    return ok({ factura });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
