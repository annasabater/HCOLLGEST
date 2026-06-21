import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { TascaNetejaCreateSchema } from '@/lib/validation/neteja';

// GET /api/tasques-neteja?desde=&fins=&estat=&habitacioId=
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const desde = url.searchParams.get('desde');
  const fins = url.searchParams.get('fins');
  const estat = url.searchParams.get('estat');
  const habitacioId = url.searchParams.get('habitacioId');

  const where: Prisma.TascaNetejaWhereInput = {};
  if (desde || fins) {
    where.data = {};
    if (desde) where.data.gte = new Date(desde);
    if (fins) where.data.lte = new Date(fins);
  }
  if (estat === 'PENDENT' || estat === 'FETA') where.estat = estat;
  if (habitacioId) where.habitacioId = habitacioId;

  const tasques = await prisma.tascaNeteja.findMany({
    where,
    orderBy: [{ data: 'asc' }],
    include: { habitacio: true, treballador: true },
    take: 300,
  });
  return ok({ tasques });
}

// POST /api/tasques-neteja — alta manual
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = TascaNetejaCreateSchema.parse(body);

    const tasca = await prisma.tascaNeteja.create({
      data: {
        data: data.data,
        habitacioId: data.habitacioId,
        tipus: data.tipus,
        assignadaA: data.assignadaA ?? null,
        vinculadaSortidaId: data.vinculadaSortidaId ?? null,
        notes: data.notes ?? null,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'tasca_neteja',
      entitatId: tasca.id,
      ip: clientIp(req),
    });
    return created({ tasca });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
