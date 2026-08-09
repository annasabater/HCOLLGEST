import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { PressupostSaveSchema } from '@/lib/validation/pressupost';
import { calculaTotalsPressupost } from '@/lib/services/pressupost';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/pressupostos/:id — desa els canvis (client, línies, compte, notes…).
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const input = PressupostSaveSchema.parse(body);

    const totals = calculaTotalsPressupost(input.linies, input.ivaPercent);

    await prisma.$transaction([
      prisma.liniaPressupost.deleteMany({ where: { pressupostId: id } }),
      prisma.pressupost.update({
        where: { id },
        data: {
          numero: input.numero,
          data: input.data ? new Date(input.data) : undefined,
          validesa: input.validesa ? new Date(input.validesa) : null,
          clientNom: input.clientNom ?? null,
          clientNif: input.clientNif ?? null,
          clientAdreca: input.clientAdreca ?? null,
          compte: input.compte ?? null,
          notes: input.notes ?? null,
          ivaPercent: input.ivaPercent,
          base: totals.base,
          iva: totals.iva,
          total: totals.total,
          linies: { create: input.linies.map((l) => ({ descripcio: l.descripcio, import: l.import })) },
        },
      }),
    ]);

    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'pressupost', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/pressupostos/:id — esborra el pressupost (i el número queda lliure).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.pressupost.delete({ where: { id } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'pressupost', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
