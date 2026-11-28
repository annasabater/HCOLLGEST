import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { PagamentPrevistUpdateSchema } from '@/lib/validation/pagament-previst';
import { recordatoriDesDeCobrament, recordatoriEnEsborrarCobrament } from '@/lib/services/cobrament-recordatori';
import { sincronitzaRecordatoris } from '@/lib/services/calendari-recordatoris';

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

    // El recordatori «M'ha de pagar» lligat fa el mateix (import, dia, concepte, pagat = fet).
    const recordatoriId = await prisma.$transaction(async (tx) => {
      const pp = await tx.pagamentPrevist.update({
        where: { id },
        data: {
          ...(input.pagat !== undefined ? { pagat: input.pagat, dataPagament: input.pagat ? new Date() : null } : {}),
          ...(input.import !== undefined ? { import: input.import } : {}),
          ...(input.dataPrevista !== undefined ? { dataPrevista: new Date(input.dataPrevista) } : {}),
          ...(input.concepte !== undefined ? { concepte: input.concepte } : {}),
        },
      });
      return recordatoriDesDeCobrament(tx, pp);
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'pagament_previst', entitatId: id, detall: input, ip: clientIp(req) });
    if (recordatoriId) await sincronitzaRecordatoris([recordatoriId]);
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
    // El recordatori «M'ha de pagar» lligat s'esborra amb ell.
    const recordatoriId = await prisma.$transaction(async (tx) => {
      const rid = await recordatoriEnEsborrarCobrament(tx, id);
      await tx.pagamentPrevist.delete({ where: { id } });
      return rid;
    });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'pagament_previst', entitatId: id, detall: recordatoriId ? { recordatoriId } : undefined, ip: clientIp(req) });
    if (recordatoriId) await sincronitzaRecordatoris([recordatoriId]);
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
