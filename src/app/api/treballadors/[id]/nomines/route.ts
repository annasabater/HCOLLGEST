import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError } from '@/lib/http';
import { NominaCreateSchema } from '@/lib/validation/personal';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const data = NominaCreateSchema.parse(body);
    const total = data.base + data.extres + data.bonificacions;
    const nomina = await prisma.nomina.create({
      data: { treballadorId: id, ...data, total },
    });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'nomina',
      entitatId: nomina.id,
      detall: { treballadorId: id, periode: data.periode, total },
      ip: clientIp(req),
    });
    return created({ nomina });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
