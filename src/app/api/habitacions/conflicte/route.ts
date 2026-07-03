import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { toISODate } from '@/lib/dates';

// GET /api/habitacions/conflicte?habitacioId=&desde=YYYY-MM-DD&fins=YYYY-MM-DD&exclou=
// Retorna les estades que se solapen amb (habitació + rang de dates). Mateix dia de
// sortida d'una i entrada de l'altra NO és conflicte (rotació). `exclou` treu una
// estada concreta (p. ex. la mateixa que s'està editant).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const habitacioId = url.searchParams.get('habitacioId');
    const desdeStr = url.searchParams.get('desde');
    const finsStr = url.searchParams.get('fins');
    const exclou = url.searchParams.get('exclou');

    if (!habitacioId || !desdeStr || !finsStr) return ok({ conflictes: [] });
    const desde = new Date(desdeStr);
    const fins = new Date(finsStr);
    if (Number.isNaN(desde.getTime()) || Number.isNaN(fins.getTime())) {
      return badRequest('Dates no vàlides');
    }

    const estancies = await prisma.estancia.findMany({
      where: {
        deletedAt: null,
        habitacioId,
        estat: { not: 'CANCELLADA' },
        ...(exclou ? { id: { not: exclou } } : {}),
        // Solapament d'intervals [dataEntrada, dataSortida): entrada < fins i sortida > desde.
        dataEntrada: { lt: fins },
        dataSortida: { gt: desde },
      },
      orderBy: { dataEntrada: 'asc' },
      select: {
        id: true,
        numContracte: true,
        anyContracte: true,
        estat: true,
        dataEntrada: true,
        dataSortida: true,
        viatgers: {
          where: { esTitular: true },
          take: 1,
          select: { huesped: { select: { nom: true, cognom1: true, cognom2: true } } },
        },
      },
    });

    const conflictes = estancies.map((e) => {
      const h = e.viatgers[0]?.huesped;
      return {
        id: e.id,
        contracte: `${e.numContracte}/${e.anyContracte}`,
        estat: e.estat,
        titular: h ? `${h.nom} ${h.cognom1}${h.cognom2 ? ` ${h.cognom2}` : ''}` : 'Sense titular',
        dataEntrada: e.dataEntrada ? toISODate(e.dataEntrada) : null,
        dataSortida: e.dataSortida ? toISODate(e.dataSortida) : null,
      };
    });

    return ok({ conflictes });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
