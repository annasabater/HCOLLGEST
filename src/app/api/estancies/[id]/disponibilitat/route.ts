import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError, notFound } from '@/lib/http';
import { toISODate } from '@/lib/dates';
import { WHERE_AMB_HABITACIO, tramsHabitacio, SELECT_CANVIS } from '@/lib/habitacio-trams';

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
          ...WHERE_AMB_HABITACIO,
          id: { notIn: chainIds },
          dataSortida: { gt: desde },
        },
        orderBy: { dataEntrada: 'asc' },
        select: { habitacioId: true, dataEntrada: true, dataSortida: true, ...SELECT_CANVIS },
      }),
    ]);

    const occupatRoom = new Set<string>();
    const firstFutureByRoom = new Map<string, Date>();
    // Per trams d'habitació (un canvi a mitja estada allibera l'antiga i ocupa la nova).
    const trams = ocupacions
      .flatMap((o) => tramsHabitacio(o))
      .filter((t) => t.habitacioId && t.fins && t.fins > desde)
      .sort((a, b) => (a.desde?.getTime() ?? 0) - (b.desde?.getTime() ?? 0));
    for (const t of trams) {
      if (!t.habitacioId) continue;
      if (t.desde && t.desde <= desde) occupatRoom.add(t.habitacioId);
      else if (t.desde && !firstFutureByRoom.has(t.habitacioId)) firstFutureByRoom.set(t.habitacioId, t.desde);
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
