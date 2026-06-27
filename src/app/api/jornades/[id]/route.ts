import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, noContent, notFound, ok } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/jornades/:id — marca/desmarca com a pagada
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const pagada = Boolean(body.pagada);
    const j = await prisma.jornada.update({
      where: { id },
      data: { pagada, dataPagament: pagada ? new Date() : null },
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'jornada', entitatId: id, detall: { pagada }, ip: clientIp(req) });
    return ok({ jornada: j });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/jornades/:id — elimina una jornada i reverteix les tasques associades a PENDENT
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const j = await prisma.jornada.findUnique({
      where: { id },
      select: { id: true, treballadorId: true, data: true, notes: true },
    });
    if (!j) return notFound();

    await prisma.$transaction(async (tx) => {
      await tx.jornada.delete({ where: { id } });

      // Si la jornada era d'una tasca de neteja (auto o manual), revertim les tasques FETA d'aquell dia a PENDENT
      const esNeteja =
        j.notes?.startsWith('[auto]') ||
        j.notes?.startsWith('Neteja:') ||
        j.notes?.startsWith('[auto] Neteja');
      if (esNeteja && j.treballadorId) {
        const dayStart = new Date(j.data); dayStart.setHours(0, 0, 0, 0);
        const dayEnd   = new Date(j.data); dayEnd.setHours(23, 59, 59, 999);
        await tx.tascaNeteja.deleteMany({
          where: {
            assignadaA: j.treballadorId,
            data: { gte: dayStart, lte: dayEnd },
          },
        });
      }
    });

    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'jornada',
      entitatId: id,
      ip: clientIp(req),
    });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
