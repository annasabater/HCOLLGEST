import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, badRequest, handleApiError, notFound } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/cobraments/:id — elimina un pagament A COMPTE (sense factura).
// Els cobraments d'una factura es gestionen amb una devolució, no s'esborren.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const cobrament = await prisma.cobrament.findUnique({
      where: { id },
      select: { id: true, facturaId: true },
    });
    if (!cobrament) return notFound();
    if (cobrament.facturaId) {
      return badRequest('Aquest cobrament és dins una factura; fes una devolució des de la factura.');
    }

    await prisma.cobrament.delete({ where: { id } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'cobrament',
      entitatId: id,
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
