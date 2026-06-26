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
      ? {
          data: {
            gte: new Date(`${mes}-01T00:00:00`),
            lte: new Date(`${mes}-31T23:59:59`),
          },
        }
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
