import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, noContent, handleApiError } from '@/lib/http';
import { TarifaUpdateSchema } from '@/lib/validation/tarifa';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const data = TarifaUpdateSchema.parse(body);
    const tarifa = await prisma.tarifa.update({
      where: { id },
      data: {
        ...(data.nom !== undefined ? { nom: data.nom } : {}),
        ...(data.temporada !== undefined ? { temporada: data.temporada ?? null } : {}),
        ...(data.preuNit !== undefined ? { preuNit: data.preuNit } : {}),
        ...(data.preuMensual !== undefined ? { preuMensual: data.preuMensual ?? null } : {}),
        ...(data.tipusHabitacio !== undefined ? { tipusHabitacio: data.tipusHabitacio ?? null } : {}),
        ...(data.habitacioId !== undefined ? { habitacioId: data.habitacioId ?? null } : {}),
        ...(data.dataInici !== undefined ? { dataInici: data.dataInici ?? null } : {}),
        ...(data.dataFi !== undefined ? { dataFi: data.dataFi ?? null } : {}),
        ...(data.actiu !== undefined ? { actiu: data.actiu } : {}),
      },
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'tarifa', entitatId: id, ip: clientIp(req) });
    return ok({ tarifa });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.tarifa.delete({ where: { id } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'tarifa', entitatId: id, ip: clientIp(req) });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
