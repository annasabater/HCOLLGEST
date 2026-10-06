import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError, notFound } from '@/lib/http';
import { creaDocumentDiposit } from '@/lib/services/factura';
import { DocumentDipositSchema } from '@/lib/validation/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/diposits/:id/document { numero?, data? } — «Factura de dipòsit»:
// factura simplificada sense IVA. Número triat (únic) o el següent de l'estada.
// Si el dipòsit ja en té, retorna l'existent.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const exists = await prisma.diposit.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return notFound();

    const opts = DocumentDipositSchema.parse((await req.json().catch(() => ({}))) ?? {});
    const factura = await prisma.$transaction((tx) => creaDocumentDiposit(tx, id, { id: auth.id }, clientIp(req), opts));
    return created({ factura });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
