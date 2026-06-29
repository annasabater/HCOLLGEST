import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { DipositResolSchema, DipositEditSchema } from '@/lib/validation/factura';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/diposits/:id
//   - amb `estat` (TORNAT|RETINGUT) → resol el dipòsit
//   - sense `estat` → edita import/mètode/notes (només si està EN_CUSTODIA)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const exists = await prisma.diposit.findUnique({ where: { id }, select: { id: true, estat: true } });
    if (!exists) return notFound();

    const body = await req.json().catch(() => null);

    // Canvi d'estat (tornar / retenir / tornar a custòdia).
    if (body && typeof body === 'object' && 'estat' in body && body.estat) {
      const data = DipositResolSchema.parse(body);
      const diposit = await prisma.diposit.update({
        where: { id },
        data: {
          estat: data.estat,
          motiu: data.motiu ?? null,
          // En custòdia no és una resolució: es buida la data de resolució.
          dataResolucio: data.estat === 'EN_CUSTODIA' ? null : new Date(),
        },
      });
      await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'diposit', entitatId: id, detall: { estat: data.estat }, ip: clientIp(req) });
      return ok({ diposit });
    }

    // Edició de camps (import/mètode/notes/facturaId) — permesa en qualsevol estat.
    const data = DipositEditSchema.parse(body);
    const diposit = await prisma.diposit.update({
      where: { id },
      data: {
        ...(data.import !== undefined ? { import: data.import } : {}),
        ...(data.metode ? { metode: data.metode } : {}),
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
        ...(data.data ? { data: data.data } : {}),
        ...('facturaId' in data ? { facturaId: data.facturaId ?? null } : {}),
      },
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'diposit', entitatId: id, detall: { camps: Object.keys(data) }, ip: clientIp(req) });
    return ok({ diposit });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/diposits/:id — elimina un dipòsit (només si està EN_CUSTODIA).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const exists = await prisma.diposit.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return notFound();
    await prisma.diposit.delete({ where: { id } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'diposit', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
