import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError } from '@/lib/http';
import { AbsenciaCreateSchema } from '@/lib/validation/personal';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const data = AbsenciaCreateSchema.parse(body);
    const absencia = await prisma.absencia.create({ data: { treballadorId: id, ...data } });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'absencia',
      entitatId: absencia.id,
      detall: { treballadorId: id, tipus: data.tipus },
      ip: clientIp(req),
    });
    return created({ absencia });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
