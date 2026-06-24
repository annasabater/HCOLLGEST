import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError, notFound } from '@/lib/http';
import { toISODate } from '@/lib/dates';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/estancies/:id/disponibilitat?desde=YYYY-MM-DD
// Per a una ampliació: per cada habitació, si està ocupada a partir de `desde`
// i fins quan està lliure (data de la propera reserva). Exclou la mateixa
// reserva (l'estada i les seves ampliacions) dels conflictes.
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const desdeStr = new URL(req.url).searchParams.get('desde');
    if (!desdeStr) return badRequest('Cal indicar «desde» (YYYY-MM-DD)');
    const desde = new Date(desdeStr);
    if (Number.isNaN(desde.getTime())) return badRequest('Data no vàlida');

    const est = await prisma.estancia.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, estanciaOrigenId: true, habitacioId: true },
    });
    if (!est) return notFound();
    const rootId = est.estanciaOrigenId ?? est.id;

    const chain = await prisma.estancia.findMany({
      where: { deletedAt: null, OR: [{ id: rootId }, { estanciaOrigenId: rootId }] },
      select: { id: true },
    });
    const chainIds = chain.map((c) => c.id);

    const [habitacions, ocupacions] = await Promise.all([
      prisma.habitacio.findMany({
        where: { deletedAt: null },
        orderBy: { nom: 'asc' },
        select: { id: true, nom: true },
      }),
      prisma.estancia.findMany({
        where: {
          deletedAt: null,
          habitacioId: { not: null },
          id: { notIn: chainIds },
          dataSortida: { gt: desde },
        },
        orderBy: { dataEntrada: 'asc' },
        select: { habitacioId: true, dataEntrada: true },
      }),
    ]);

    const occupatRoom = new Set<string>();
    const firstFutureByRoom = new Map<string, Date>();
    for (const o of ocupacions) {
      if (!o.habitacioId) continue;
      if (o.dataEntrada <= desde) occupatRoom.add(o.habitacioId);
      else if (!firstFutureByRoom.has(o.habitacioId)) firstFutureByRoom.set(o.habitacioId, o.dataEntrada);
    }

    const rooms = habitacions.map((h) => {
      const next = firstFutureByRoom.get(h.id) ?? null;
      return {
        id: h.id,
        nom: h.nom,
        occupat: occupatRoom.has(h.id), // ocupada el mateix dia `desde`
        lliureFins: next ? toISODate(next) : null, // null = lliure sense límit conegut
      };
    });

    return ok({ desde: desdeStr, actualHabitacioId: est.habitacioId, rooms });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
