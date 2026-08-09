import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, badRequest, handleApiError } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/pressupostos/:id/estada — assigna/desassigna l'estada de seguida
// (sense tocar la resta del pressupost). body: { estanciaId: string | null }.
// Retorna l'etiqueta per mostrar-la al selector.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const raw = body && typeof body === 'object' ? (body as { estanciaId?: unknown }).estanciaId : undefined;

    let estanciaId: string | null = null;
    let label: string | null = null;
    if (typeof raw === 'string' && raw.trim()) {
      const est = await prisma.estancia.findFirst({
        where: { id: raw.trim(), deletedAt: null },
        select: { id: true, numContracte: true, anyContracte: true },
      });
      if (!est) return badRequest('Estada no trobada');
      estanciaId = est.id;
      label = `Contracte ${est.numContracte}/${est.anyContracte}`;
    }

    const p = await prisma.pressupost.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!p) return badRequest('Pressupost no trobat');

    await prisma.pressupost.update({ where: { id }, data: { estanciaId } });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'pressupost', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true, estanciaId, label });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
