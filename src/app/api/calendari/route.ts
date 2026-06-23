import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { badRequest, ok } from '@/lib/http';
import { occurrencesInRange } from '@/lib/services/serveis-recurrents';
import type { FrequenciaServeiValue } from '@/lib/validation/servei';

// GET /api/calendari?desde=&fins= — agrega entrades, sortides i tasques de neteja.
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const desde = url.searchParams.get('desde');
  const fins = url.searchParams.get('fins');
  if (!desde || !fins) return badRequest('Cal indicar desde i fins');

  const range = { gte: new Date(desde), lte: new Date(fins) };
  const titularInclude = {
    viatgers: { where: { esTitular: true }, include: { huesped: true } },
    habitacio: true,
  } as const;

  const [entrades, sortides, tasques, serveisActius] = await Promise.all([
    prisma.estancia.findMany({
      where: { deletedAt: null, dataEntrada: range },
      include: titularInclude,
      orderBy: { dataEntrada: 'asc' },
    }),
    prisma.estancia.findMany({
      where: { deletedAt: null, dataSortida: range },
      include: titularInclude,
      orderBy: { dataSortida: 'asc' },
    }),
    prisma.tascaNeteja.findMany({
      where: { data: range },
      include: { habitacio: true, treballador: true },
      orderBy: { data: 'asc' },
    }),
    prisma.serveiRecurrent.findMany({
      where: { deletedAt: null, actiu: true },
      include: { proveidor: { select: { nom: true } } },
    }),
  ]);

  // Projecta cada servei recurrent a totes les seves ocurrències dins del rang.
  const desdeD = new Date(desde);
  const finsD = new Date(fins);
  const serveis = serveisActius.flatMap((s) =>
    occurrencesInRange(s.properaData, s.frequencia as FrequenciaServeiValue, desdeD, finsD).map((data) => ({
      id: `${s.id}-${data.toISOString().slice(0, 10)}`,
      data,
      activitat: s.activitat,
      proveidor: s.proveidor?.nom ?? null,
      import: s.importPrevist != null ? Number(s.importPrevist) : null,
    })),
  );

  const titular = (e: (typeof entrades)[number]) => {
    const h = e.viatgers[0]?.huesped;
    return h ? `${h.nom} ${h.cognom1}` : 'Sense titular';
  };

  return ok({
    entrades: entrades.map((e) => ({
      id: e.id,
      data: e.dataEntrada,
      titular: titular(e),
      habitacio: e.habitacio?.nom ?? null,
    })),
    sortides: sortides.map((e) => ({
      id: e.id,
      data: e.dataSortida,
      titular: titular(e),
      habitacio: e.habitacio?.nom ?? null,
    })),
    tasques: tasques.map((t) => ({
      id: t.id,
      data: t.data,
      tipus: t.tipus,
      estat: t.estat,
      habitacio: t.habitacio?.nom ?? null,
      assignada: t.treballador?.nom ?? null,
    })),
    serveis,
  });
}

export const dynamic = 'force-dynamic';
