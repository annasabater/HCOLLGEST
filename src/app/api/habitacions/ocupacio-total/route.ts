import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { badRequest, ok } from '@/lib/http';
import { WHERE_AMB_HABITACIO, tramsSolapats } from '@/lib/habitacio-trams';

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
        ...WHERE_AMB_HABITACIO,
        estat: { not: 'CANCELLADA' },
        dataEntrada: { lte: new Date(fins) },
        dataSortida: { gte: new Date(desde) },
      },
      include: {
        viatgers: { where: { esTitular: true }, include: { huesped: true }, take: 1 },
        canvisHabitacio: { select: { data: true, habitacioAnteriorId: true }, orderBy: { data: 'asc' } },
      },
      orderBy: { dataEntrada: 'asc' },
    }),
  ]);

  // Una fila per tram d'habitació (canvi d'habitació a mitja estada → dues files).
  const desdeD = new Date(desde);
  const finsD = new Date(fins);
  return ok({
    habitacions,
    estades: estades.flatMap((e) => tramsSolapats(e, desdeD, finsD, { inclusiu: true }).map((t) => {
      const h = e.viatgers[0]?.huesped;
      return {
        id: e.id,
        habitacioId: t.habitacioId!,
        titular: h ? `${h.nom} ${h.cognom1}` : '—',
        titularNom: h?.nom ?? '—',
        numContracte: e.numContracte || null,
        dataEntrada: t.desde?.toISOString().slice(0, 10) ?? null,
        dataSortida: t.fins?.toISOString().slice(0, 10) ?? null,
        estat: e.estat,
      };
    })),
  });
}

export const dynamic = 'force-dynamic';
