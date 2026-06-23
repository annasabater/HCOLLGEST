import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { AnimalCreateSchema } from '@/lib/validation/actiu';

// GET /api/animals?huespedId= — animales + total de gastos asociados
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const huespedId = new URL(req.url).searchParams.get('huespedId');
  const animals = await prisma.animal.findMany({
    where: { deletedAt: null, ...(huespedId ? { huespedId } : {}) },
    orderBy: { nom: 'asc' },
    include: { huesped: { select: { id: true, nom: true, cognom1: true } } },
  });
  const sums = await prisma.gasto.groupBy({
    by: ['animalId'],
    where: { animalId: { not: null }, deletedAt: null },
    _sum: { import: true },
  });
  const map = new Map(sums.map((s) => [s.animalId, Number(s._sum.import ?? 0)]));

  return ok({
    animals: animals.map((a) => ({ ...a, gastoTotal: map.get(a.id) ?? 0 })),
  });
}

// POST /api/animals
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = AnimalCreateSchema.parse(body);
    const animal = await prisma.animal.create({
      data: {
        nom: data.nom,
        especie: data.especie,
        mida: data.mida ?? null,
        dataNaixement: data.dataNaixement ?? null,
        notes: data.notes ?? null,
        huespedId: data.huespedId ?? null,
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'animal',
      entitatId: animal.id,
      ip: clientIp(req),
    });
    return created({ animal });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
