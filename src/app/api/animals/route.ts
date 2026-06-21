import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { AnimalCreateSchema } from '@/lib/validation/actiu';

// GET /api/animals — animales + total de gastos asociados
export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const animals = await prisma.animal.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
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
        dataNaixement: data.dataNaixement ?? null,
        notes: data.notes ?? null,
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
