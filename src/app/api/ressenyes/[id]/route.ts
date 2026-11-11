import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, conflict, handleApiError, ok, readJson } from '@/lib/http';
import { RessenyaPatchSchema } from '@/lib/validation/ressenya';
import { canviaEstat } from '@/lib/services/ressenyes';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/ressenyes/:id — { estat } | { destacada }
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = RessenyaPatchSchema.parse(await readJson(req));

    if ('estat' in body) {
      await canviaEstat(id, body.estat);
    } else {
      const r = await prisma.ressenya.findUniqueOrThrow({ where: { id } });
      if (body.destacada && r.estat !== 'PUBLICADA') {
        return badRequest('Només es pot destacar una ressenya publicada a la web.');
      }
      await prisma.ressenya.update({ where: { id }, data: { destacada: body.destacada } });
    }

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'ressenya',
      entitatId: id,
      detall: body,
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/ressenyes/:id — només les afegides a mà (per corregir errors d'alta).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const r = await prisma.ressenya.findUniqueOrThrow({ where: { id } });
    if (r.font !== 'MANUAL') {
      return conflict('Les ressenyes sincronitzades de Google no s’eliminen: amaga-la.');
    }
    await prisma.ressenya.delete({ where: { id } });

    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'ressenya',
      entitatId: id,
      detall: { autor: r.autor, puntuacio: r.puntuacio },
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
