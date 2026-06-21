import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError } from '@/lib/http';
import { AnotacioCreateSchema } from '@/lib/validation/huesped';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/huespedes/:id/anotacions — nota interna OBJETIVA (§7).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = AnotacioCreateSchema.parse(body);

    const anotacio = await prisma.anotacioHuesped.create({
      data: {
        huespedId: id,
        estanciaId: data.estanciaId ?? null,
        sentit: data.sentit,
        tipus: data.tipus ?? null,
        descripcio: data.descripcio,
        privada: data.privada,
        noAcollir: data.noAcollir,
        usuariId: auth.id,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'anotacio_huesped',
      entitatId: anotacio.id,
      detall: { huespedId: id, sentit: data.sentit, noAcollir: data.noAcollir },
      ip: clientIp(req),
    });

    return created({ anotacio });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
