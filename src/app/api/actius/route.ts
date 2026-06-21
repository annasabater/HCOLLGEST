import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { ActiuCreateSchema } from '@/lib/validation/actiu';

// GET /api/actius?habitacioId=
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const habitacioId = new URL(req.url).searchParams.get('habitacioId');
  const where: Prisma.ActiuWhereInput = { deletedAt: null };
  if (habitacioId) where.habitacioId = habitacioId;

  const actius = await prisma.actiu.findMany({
    where,
    orderBy: { dataCompra: 'desc' },
    include: { proveidor: true, habitacio: true },
  });
  return ok({ actius });
}

// POST /api/actius
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = ActiuCreateSchema.parse(body);
    const actiu = await prisma.actiu.create({
      data: {
        nom: data.nom,
        categoria: data.categoria,
        dataCompra: data.dataCompra,
        cost: data.cost,
        proveidorId: data.proveidorId ?? null,
        habitacioId: data.habitacioId ?? null,
        garantiaFins: data.garantiaFins ?? null,
        ubicacio: data.ubicacio ?? null,
        numSerie: data.numSerie ?? null,
        facturaPath: data.facturaPath ?? null,
        estat: data.estat,
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'actiu',
      entitatId: actiu.id,
      ip: clientIp(req),
    });
    return created({ actiu });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
