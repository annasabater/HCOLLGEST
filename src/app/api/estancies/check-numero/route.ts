import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, handleApiError } from '@/lib/http';

// GET /api/estancies/check-numero?any=YYYY&numero=NNNNN&exclou=<id>
// Comprova si un número de contracte ja està en ús per a l'any indicat.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const anyNum = Number(url.searchParams.get('any')) || new Date().getFullYear();
    const numero = (url.searchParams.get('numero') ?? '').trim();
    const exclou = url.searchParams.get('exclou');

    if (!numero) return ok({ exists: false });

    const [found, foundSeparat] = await Promise.all([
      prisma.estancia.findFirst({
        where: {
          anyContracte: anyNum,
          numContracte: numero,
          deletedAt: null,
          ...(exclou ? { id: { not: exclou } } : {}),
        },
        select: { id: true },
      }),
      // També compta si el número és d'un contracte separat (viatger).
      prisma.estanciaViatger.findFirst({
        where: {
          numContracteSeparat: numero,
          estancia: {
            anyContracte: anyNum,
            deletedAt: null,
            ...(exclou ? { id: { not: exclou } } : {}),
          },
        },
        select: { id: true },
      }),
    ]);

    return ok({ exists: found != null || foundSeparat != null });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
