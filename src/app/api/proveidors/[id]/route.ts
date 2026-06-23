import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, noContent, handleApiError } from '@/lib/http';
import { ProveidorUpdateSchema } from '@/lib/validation/gasto';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/proveidors/:id — edició de la fitxa del proveïdor.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const d = ProveidorUpdateSchema.parse(body);

    const proveidor = await prisma.proveidor.update({
      where: { id },
      data: {
        ...(d.nom !== undefined ? { nom: d.nom } : {}),
        ...(d.cif !== undefined ? { cif: d.cif ?? null } : {}),
        ...(d.contacte !== undefined ? { contacte: d.contacte ?? null } : {}),
        ...(d.telefon !== undefined ? { telefon: d.telefon ?? null } : {}),
        ...(d.email !== undefined ? { email: d.email ?? null } : {}),
        ...(d.adreca !== undefined ? { adreca: d.adreca ?? null } : {}),
        ...(d.web !== undefined ? { web: d.web ?? null } : {}),
        ...(d.activitat !== undefined ? { activitat: d.activitat ?? null } : {}),
        ...(d.notes !== undefined ? { notes: d.notes ?? null } : {}),
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'proveidor',
      entitatId: id,
      ip: clientIp(req),
    });
    return ok({ proveidor });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/proveidors/:id — esborrat lògic.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.proveidor.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'proveidor',
      entitatId: id,
      ip: clientIp(req),
    });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
