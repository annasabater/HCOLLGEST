import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { badRequest, ok } from '@/lib/http';

/**
 * GET /api/habitacions/ocupacio-total?desde=&fins=
 * Retorna totes les estades de totes les habitacions que se solapen amb el rang
 * [desde, fins], per pintar el calendari mensual multi-habitació.
 */
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const desde = url.searchParams.get('desde');
  const fins = url.searchParams.get('fins');
  if (!desde || !fins) return badRequest('Cal indicar desde i fins');

  const [habitacions, estades] = await Promise.all([
    prisma.habitacio.findMany({
      where: { deletedAt: null },
      orderBy: { nom: 'asc' },
      select: { id: true, nom: true },
    }),
    prisma.estancia.findMany({
      where: {
        deletedAt: null,
        habitacioId: { not: null },
        estat: { not: 'CANCELLADA' },
        dataEntrada: { lte: new Date(fins) },
        dataSortida: { gte: new Date(desde) },
      },
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true }, take: 1 } },
      orderBy: { dataEntrada: 'asc' },
    }),
  ]);

  return ok({
    habitacions,
    estades: estades.map((e) => {
      const h = e.viatgers[0]?.huesped;
      return {
        id: e.id,
        habitacioId: e.habitacioId!,
        titular: h ? `${h.nom} ${h.cognom1}` : '—',
        dataEntrada: e.dataEntrada.toISOString().slice(0, 10),
        dataSortida: e.dataSortida.toISOString().slice(0, 10),
        estat: e.estat,
      };
    }),
  });
}

export const dynamic = 'force-dynamic';
