import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';

// GET /api/treballadors/:id/tasques?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const tasques = await prisma.tascaNeteja.findMany({
      where: {
        assignadaA: id,
        estat: 'FETA',
        ...(from || to
          ? {
              data: {
                ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ data: 'asc' }, { tipus: 'asc' }],
      include: { habitacio: { select: { nom: true } } },
    });

    return ok({ tasques });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
