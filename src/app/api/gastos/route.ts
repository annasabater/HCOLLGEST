import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { GastoCreateSchema } from '@/lib/validation/gasto';

// GET /api/gastos?desde=&fins=&categoriaId=
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const desde = url.searchParams.get('desde');
  const fins = url.searchParams.get('fins');
  const categoriaId = url.searchParams.get('categoriaId');

  const where: Prisma.GastoWhereInput = { deletedAt: null };
  if (desde || fins) {
    where.data = {};
    if (desde) where.data.gte = new Date(desde);
    if (fins) where.data.lte = new Date(fins);
  }
  if (categoriaId) where.categoriaId = categoriaId;

  const gastos = await prisma.gasto.findMany({
    where,
    orderBy: { data: 'desc' },
    take: 300,
    include: { categoria: true, proveidor: true, habitacio: true, animal: true },
  });

  // El total i el desglossament per categoria NOMÉS compten les despeses reals
  // (les fiances/dipòsits no són despesa). La llista, però, les inclou (amb badge).
  const reals = gastos.filter((g) => !g.esFianca);
  const total = reals.reduce((a, g) => a + Number(g.import), 0);
  const perCategoria: Record<string, number> = {};
  for (const g of reals) {
    perCategoria[g.categoria.nom] = (perCategoria[g.categoria.nom] ?? 0) + Number(g.import);
  }

  return ok({ gastos, total, perCategoria });
}

// POST /api/gastos
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = GastoCreateSchema.parse(body);

    const gasto = await prisma.gasto.create({
      data: {
        data: data.data,
        import: data.import,
        categoriaId: data.categoriaId,
        proveidorId: data.proveidorId ?? null,
        habitacioId: data.habitacioId ?? null,
        animalId: data.animalId ?? null,
        descripcio: data.descripcio,
        numFactura: data.numFactura ?? null,
        metodePagament: data.metodePagament,
        adjuntPath: data.adjuntPath ?? null,
        esFianca: data.esFianca ?? false,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'gasto',
      entitatId: gasto.id,
      detall: { import: data.import, categoriaId: data.categoriaId },
      ip: clientIp(req),
    });
    return created({ gasto });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
