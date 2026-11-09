import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok, serverError } from '@/lib/http';
import { traduirRessenya } from '@/lib/services/traduccio-ressenya';

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 60;

// POST /api/ressenyes/:id/tradueix — (re)genera les traduccions es/ca/en/fr.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const traduida = await traduirRessenya(id);
    if (!traduida) return serverError('No s’ha pogut traduir ara mateix. Torna-ho a provar d’aquí a una estona.');

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'ressenya',
      entitatId: id,
      detall: { traduccions: 'regenerades' },
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
