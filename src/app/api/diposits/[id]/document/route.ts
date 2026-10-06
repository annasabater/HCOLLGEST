import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError, notFound } from '@/lib/http';
import { creaDocumentDiposit } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/diposits/:id/document — crea el document del dipòsit (factura
// simplificada sense IVA amb el número següent de l'estada). Si ja en té, el retorna.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const exists = await prisma.diposit.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return notFound();

    const factura = await prisma.$transaction((tx) => creaDocumentDiposit(tx, id, { id: auth.id }, clientIp(req)));
    return created({ factura });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
