import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { PagamentPrevistUpdateSchema } from '@/lib/validation/pagament-previst';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/pagaments-previstos/:id — marca com a pagat (o desfés) i/o edita
// l'import, la data prevista i el concepte. En marcar-lo pagat, desapareix de
// l'avís del tauler.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const input = PagamentPrevistUpdateSchema.parse(body);

    await prisma.pagamentPrevist.update({
      where: { id },
      data: {
        ...(input.pagat !== undefined ? { pagat: input.pagat, dataPagament: input.pagat ? new Date() : null } : {}),
        ...(input.import !== undefined ? { import: input.import } : {}),
        ...(input.dataPrevista !== undefined ? { dataPrevista: new Date(input.dataPrevista) } : {}),
        ...(input.concepte !== undefined ? { concepte: input.concepte } : {}),
      },
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'pagament_previst', entitatId: id, detall: input, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/pagaments-previstos/:id
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.pagamentPrevist.delete({ where: { id } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'pagament_previst', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
