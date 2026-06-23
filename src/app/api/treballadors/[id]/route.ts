import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError, notFound } from '@/lib/http';
import { TreballadorUpdateSchema } from '@/lib/validation/personal';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/treballadors/:id — edita les dades d'un treballador.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = TreballadorUpdateSchema.parse(body);

    const existing = await prisma.treballador.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return notFound();

    const treballador = await prisma.treballador.update({
      where: { id },
      data: {
        ...(data.nom !== undefined && { nom: data.nom }),
        ...(data.carrec !== undefined && { carrec: data.carrec }),
        ...(data.dni !== undefined && { dni: data.dni ?? null }),
        ...(data.telefon !== undefined && { telefon: data.telefon ?? null }),
        ...(data.email !== undefined && { email: data.email ?? null }),
        ...(data.preuHora !== undefined && { preuHora: data.preuHora ?? null }),
        ...(data.salari !== undefined && { salari: data.salari ?? null }),
        ...(data.costEmpresa !== undefined && { costEmpresa: data.costEmpresa ?? null }),
        ...(data.dataContractacio !== undefined && { dataContractacio: data.dataContractacio }),
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'treballador',
      entitatId: id,
      detall: { camps: Object.keys(data) },
      ip: clientIp(req),
    });
    return ok({ treballador });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/treballadors/:id — esborrat lògic (conserva jornades/nòmines històriques).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const existing = await prisma.treballador.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return notFound();

    await prisma.treballador.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'treballador', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
