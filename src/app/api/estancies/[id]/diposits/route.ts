import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { created, handleApiError, notFound } from '@/lib/http';
import { addDiposit } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/diposits — registra un dipòsit/fiança (en custòdia)
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const est = await prisma.estancia.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!est) return notFound();

    const body = await req.json().catch(() => null);
    const diposit = await addDiposit(id, body, { id: auth.id }, clientIp(req));
    return created({ diposit });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
