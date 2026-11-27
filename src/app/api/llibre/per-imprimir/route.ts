import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError, ok } from '@/lib/http';
import { WHERE_LLIBRE_PER_IMPRIMIR } from '@/lib/llibre-impres';

// GET /api/llibre/per-imprimir — contractes (estades noves i ampliacions) amb el
// llibre registre encara per imprimir, per a la llista taronja de /llibre.
export async function GET() {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;

    const estancies = await prisma.estancia.findMany({
      where: WHERE_LLIBRE_PER_IMPRIMIR,
      orderBy: [{ dataEntrada: 'asc' }, { createdAt: 'asc' }],
      take: 200,
      select: {
        id: true,
        numContracte: true,
        anyContracte: true,
        dataEntrada: true,
        dataSortida: true,
        estanciaOrigenId: true,
        viatgers: {
          orderBy: { esTitular: 'desc' },
          take: 1,
          select: { huesped: { select: { nom: true, cognom1: true } } },
        },
      },
    });

    return ok({
      items: estancies.map((e) => {
        const t = e.viatgers[0]?.huesped;
        return {
          id: e.id,
          contracte: e.numContracte ? `${e.numContracte}/${e.anyContracte}` : null,
          titular: t ? `${t.nom} ${t.cognom1}`.trim() : null,
          dataEntrada: e.dataEntrada?.toISOString() ?? null,
          dataSortida: e.dataSortida?.toISOString() ?? null,
          esAmpliacio: e.estanciaOrigenId != null,
        };
      }),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
