import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { badRequest, ok } from '@/lib/http';

/**
 * GET /api/habitacions/ocupacio?habitacioId=&desde=&fins=
 * Retorna les estades d'una habitació que se solapen amb el rang [desde, fins],
 * per pintar un calendari mensual d'ocupació/reserva a nivell d'habitació.
 */
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const habitacioId = url.searchParams.get('habitacioId');
  const desde = url.searchParams.get('desde');
  const fins = url.searchParams.get('fins');
  if (!habitacioId || !desde || !fins) {
    return badRequest('Cal indicar habitacioId, desde i fins');
  }

  // Una estada se solapa amb el rang si entra abans de "fins" i surt després de "desde".
  const estades = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      habitacioId,
      estat: { not: 'CANCELLADA' },
      dataEntrada: { lte: new Date(fins) },
      dataSortida: { gte: new Date(desde) },
    },
    include: { viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } } },
    orderBy: { dataEntrada: 'asc' },
  });

  return ok({
    estades: estades.map((e) => ({
      id: e.id,
      titular: (() => { const h = e.viatgers.find(v => v.esTitular)?.huesped ?? e.viatgers[0]?.huesped; return h ? `${h.nom} ${h.cognom1}` : 'Sense titular'; })(),
      viatgers: e.viatgers
        .filter(v => v.huesped)
        .map(v => `${v.huesped!.nom} ${v.huesped!.cognom1}`),
      dataEntrada: e.dataEntrada,
      dataSortida: e.dataSortida,
      estat: e.estat,
    })),
  });
}

export const dynamic = 'force-dynamic';
