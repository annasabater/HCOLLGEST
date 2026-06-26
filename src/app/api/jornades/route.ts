import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';

// GET /api/jornades?mes=YYYY-MM — llista de jornades de tots els treballadors (ADMIN)
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const mes = url.searchParams.get('mes'); // YYYY-MM

    const where = mes
      ? (() => {
          const parts = mes.split('-');
          const y = Number(parts[0]);
          const m = Number(parts[1]);
          const ini = new Date(y, m - 1, 1, 0, 0, 0);
          const fi = new Date(y, m, 0, 23, 59, 59, 999); // darrer dia del mes
          return { data: { gte: ini, lte: fi } };
        })()
      : undefined;

    const jornades = await prisma.jornada.findMany({
      where,
      orderBy: { data: 'desc' },
      take: 500,
      include: {
        treballador: { select: { id: true, nom: true, carrec: true } },
      },
    });

    return ok({ jornades });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
