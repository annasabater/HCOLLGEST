import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError } from '@/lib/http';
import { ActiuHistorialCreateSchema } from '@/lib/validation/actiu';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/actius/:id/historial — reparación, avería, cambio ubicación, substitución
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const data = ActiuHistorialCreateSchema.parse(body);

    const entrada = await prisma.actiuHistorial.create({
      data: {
        actiuId: id,
        tipus: data.tipus,
        descripcio: data.descripcio,
        data: data.data,
        cost: data.cost ?? null,
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'actiu_historial',
      entitatId: entrada.id,
      detall: { actiuId: id, tipus: data.tipus },
      ip: clientIp(req),
    });
    return created({ entrada });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
