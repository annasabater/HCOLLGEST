import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, noContent, handleApiError } from '@/lib/http';
import { ServeiUpdateSchema } from '@/lib/validation/servei';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/serveis-recurrents/:id — edició del servei.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const d = ServeiUpdateSchema.parse(body);

    const servei = await prisma.serveiRecurrent.update({
      where: { id },
      data: {
        ...(d.activitat !== undefined ? { activitat: d.activitat } : {}),
        ...(d.proveidorId !== undefined ? { proveidorId: d.proveidorId ?? null } : {}),
        ...(d.categoriaId !== undefined ? { categoriaId: d.categoriaId ?? null } : {}),
        ...(d.frequencia !== undefined ? { frequencia: d.frequencia } : {}),
        ...(d.importPrevist !== undefined ? { importPrevist: d.importPrevist ?? null } : {}),
        ...(d.metodePagament !== undefined ? { metodePagament: d.metodePagament } : {}),
        ...(d.properaData !== undefined ? { properaData: d.properaData } : {}),
        ...(d.vigenciaInici !== undefined ? { vigenciaInici: d.vigenciaInici ?? null } : {}),
        ...(d.vigenciaFi !== undefined ? { vigenciaFi: d.vigenciaFi ?? null } : {}),
        ...(d.generaDespesa !== undefined ? { generaDespesa: d.generaDespesa } : {}),
        ...(d.observacions !== undefined ? { observacions: d.observacions ?? null } : {}),
        ...(d.actiu !== undefined ? { actiu: d.actiu } : {}),
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'servei_recurrent',
      entitatId: id,
      ip: clientIp(req),
    });
    return ok({ servei });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/serveis-recurrents/:id — esborrat lògic.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.serveiRecurrent.update({ where: { id }, data: { deletedAt: new Date(), actiu: false } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'servei_recurrent',
      entitatId: id,
      ip: clientIp(req),
    });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
