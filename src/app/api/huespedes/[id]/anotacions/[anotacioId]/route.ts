import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, notFound, handleApiError } from '@/lib/http';
import { AnotacioUpdateSchema } from '@/lib/validation/huesped';

type Ctx = { params: Promise<{ id: string; anotacioId: string }> };

// PATCH /api/huespedes/:id/anotacions/:anotacioId — edita una nota interna.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id, anotacioId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = AnotacioUpdateSchema.parse(body);

    // La nota ha de pertànyer a aquest hoste i no estar eliminada.
    const existing = await prisma.anotacioHuesped.findFirst({
      where: { id: anotacioId, huespedId: id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return notFound();

    const anotacio = await prisma.anotacioHuesped.update({
      where: { id: anotacioId },
      data: {
        ...(data.sentit !== undefined && { sentit: data.sentit }),
        ...(data.descripcio !== undefined && { descripcio: data.descripcio }),
        ...(data.noAcollir !== undefined && { noAcollir: data.noAcollir }),
        ...(data.tipus !== undefined && { tipus: data.tipus ?? null }),
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'anotacio_huesped',
      entitatId: anotacioId,
      detall: { huespedId: id, camps: Object.keys(data) },
      ip: clientIp(req),
    });
    return ok({ anotacio });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/huespedes/:id/anotacions/:anotacioId — esborrat lògic de la nota.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id, anotacioId } = await ctx.params;

    const existing = await prisma.anotacioHuesped.findFirst({
      where: { id: anotacioId, huespedId: id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return notFound();

    await prisma.anotacioHuesped.update({
      where: { id: anotacioId },
      data: { deletedAt: new Date() },
    });

    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'anotacio_huesped',
      entitatId: anotacioId,
      detall: { huespedId: id },
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
