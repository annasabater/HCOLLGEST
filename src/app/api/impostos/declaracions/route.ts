import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, ok } from '@/lib/http';
import { DeclaracioSchema, ModelFiscalSchema } from '@/lib/validation/impostos';

// POST /api/impostos/declaracions — marca una autoliquidació com a PRESENTADA i
// en desa les caselles tal com es van presentar (els trimestres següents en llegeixen
// els imports reals: casella 05 del 130, quotes a compensar del 303).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const input = DeclaracioSchema.parse(await req.json().catch(() => null));
    const data = {
      caselles: input.caselles,
      justificant: input.justificant?.trim() || null,
      presentadaEl: input.presentadaEl ?? new Date(),
      usuariId: auth.id,
    };
    const where = { model_any_periode: { model: input.model, any: input.any, periode: input.periode } };
    const d = await prisma.declaracioFiscal.upsert({
      where,
      create: { model: input.model, any: input.any, periode: input.periode, ...data },
      update: data,
    });
    await audit({ usuariId: auth.id, accio: 'CREACIO', entitat: 'declaracio_fiscal', entitatId: d.id, detall: { model: input.model, any: input.any, periode: input.periode }, ip: clientIp(req) });
    return ok({ ok: true, id: d.id });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/impostos/declaracions?model=130&any=2026&periode=3 — desfà "presentada".
export async function DELETE(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const sp = new URL(req.url).searchParams;
    const model = ModelFiscalSchema.safeParse(sp.get('model'));
    const any = Number(sp.get('any'));
    const periode = Number(sp.get('periode'));
    if (!model.success || !Number.isInteger(any) || !Number.isInteger(periode)) return badRequest('Paràmetres no vàlids');
    const d = await prisma.declaracioFiscal.findUnique({ where: { model_any_periode: { model: model.data, any, periode } } });
    if (!d) return ok({ ok: true });
    await prisma.declaracioFiscal.delete({ where: { id: d.id } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'declaracio_fiscal', entitatId: d.id, detall: { model: model.data, any, periode, caselles: d.caselles as object }, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
