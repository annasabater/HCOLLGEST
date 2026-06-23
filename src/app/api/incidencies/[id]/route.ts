import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, noContent, handleApiError } from '@/lib/http';
import { IncidenciaUpdateSchema } from '@/lib/validation/incidencia';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const data = IncidenciaUpdateSchema.parse(body);

    const before = await prisma.incidencia.findUnique({ where: { id }, select: { estat: true } });

    const incidencia = await prisma.incidencia.update({
      where: { id },
      data: {
        ...(data.titol !== undefined ? { titol: data.titol } : {}),
        ...(data.descripcio !== undefined ? { descripcio: data.descripcio ?? null } : {}),
        ...(data.habitacioId !== undefined ? { habitacioId: data.habitacioId ?? null } : {}),
        ...(data.prioritat !== undefined ? { prioritat: data.prioritat } : {}),
        ...(data.cost !== undefined ? { cost: data.cost ?? null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
        ...(data.estat !== undefined
          ? { estat: data.estat, dataResolucio: data.estat === 'RESOLTA' ? new Date() : null }
          : {}),
      },
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'incidencia', entitatId: id, ip: clientIp(req) });

    // En resoldre una incidència amb cost, genera una despesa automàtica (categoria "Manteniment").
    const cost = Number(incidencia.cost ?? 0);
    if (before && before.estat !== 'RESOLTA' && incidencia.estat === 'RESOLTA' && cost > 0) {
      let cat = await prisma.categoriaGasto.findFirst({ where: { nom: 'Manteniment' } });
      if (!cat) cat = await prisma.categoriaGasto.create({ data: { nom: 'Manteniment' } });
      const gasto = await prisma.gasto.create({
        data: {
          data: incidencia.dataResolucio ?? new Date(),
          import: cost,
          categoriaId: cat.id,
          habitacioId: incidencia.habitacioId,
          descripcio: `Manteniment: ${incidencia.titol}`,
          metodePagament: 'EFECTIU',
        },
      });
      await audit({
        usuariId: auth.id,
        accio: 'CREACIO',
        entitat: 'gasto',
        entitatId: gasto.id,
        detall: { origen: 'incidencia', incidenciaId: id, import: cost },
        ip: clientIp(req),
      });
    }

    return ok({ incidencia });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.incidencia.delete({ where: { id } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'incidencia', entitatId: id, ip: clientIp(req) });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
