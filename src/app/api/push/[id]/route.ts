import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok, readJson, serverError } from '@/lib/http';
import { enviaPush } from '@/lib/push';

type Ctx = { params: Promise<{ id: string }> };

const PatchSchema = z.object({ resumMati: z.boolean().optional(), alMoment: z.boolean().optional() });

// PATCH /api/push/:id — què rep aquest mòbil.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const data = PatchSchema.parse(await readJson(req));
    await prisma.pushSubscripcio.update({ where: { id }, data });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'push_subscripcio', entitatId: id, detall: data, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/push/:id — notificació de prova a aquest mòbil.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const r = await enviaPush({ id }, { title: 'Hostal Coll', body: 'Prova feta: aquí t’arribaran els avisos.', url: '/recordatoris', tag: 'prova' });
    if (r.ok === 0) {
      const s = await prisma.pushSubscripcio.findUnique({ where: { id } });
      return serverError(s?.darrerError ? `No ha arribat: ${s.darrerError}` : 'Aquest mòbil ja no accepta notificacions: torna-les a activar des d’ell.');
    }
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/push/:id — deixa de rebre notificacions.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.pushSubscripcio.delete({ where: { id } });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'push_subscripcio', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
