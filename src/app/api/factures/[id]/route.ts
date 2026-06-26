import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, notFound, ok } from '@/lib/http';
import { editFactura } from '@/lib/services/factura';

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

// PATCH /api/factures/:id — edita les línies d'un rebut O canvia l'estat manualment.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const existing = await prisma.factura.findFirst({
      where: { id, deletedAt: null },
      select: { tipusDocument: true, verifactu: { select: { id: true } } },
    });
    if (!existing) return notFound();

    const body = await req.json().catch(() => null);

    // Canvi d'estat manual (COBRADA ↔ PENDENT) — permès per a qualsevol tipus de factura.
    if (body && typeof body.estat === 'string' && ['COBRADA', 'PENDENT'].includes(body.estat)) {
      const updated = await prisma.factura.update({
        where: { id },
        data: { estat: body.estat },
      });
      await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'factura', entitatId: id,
        detall: { estat: body.estat }, ip: clientIp(req) });
      return ok({ estat: updated.estat });
    }

    // Edició de línies — només rebuts sense Veri*Factu.
    if (existing.tipusDocument !== 'RECIBO' || existing.verifactu) {
      return badRequest(
        'Una factura fiscal (amb registre Veri*Factu) no es pot editar; cal emetre una factura rectificativa.',
      );
    }
    const result = await editFactura(id, body, { id: auth.id }, clientIp(req));
    return ok(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/factures/:id — esborrat lògic d'una factura/rebut. Surt de la
// comptabilitat (els seus cobraments deixen de comptar com a ingrés). Les dades
// queden a la BD i a l'audit_log.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const existing = await prisma.factura.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return notFound();

    // Els pagaments tornen a "a compte" (segueixen sent ingrés de l'estada);
    // esborrar el document no fa desaparèixer els diners cobrats.
    await prisma.$transaction([
      prisma.cobrament.updateMany({ where: { facturaId: id }, data: { facturaId: null } }),
      prisma.factura.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'factura',
      entitatId: id,
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
