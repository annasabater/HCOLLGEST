import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, badRequest, handleApiError } from '@/lib/http';

interface Item { article: string; qty: number }
interface Seleccio { manteniment?: Item[]; sortida?: Item[] }

// GET /api/neteja/bugaderia?data=YYYY-MM-DD
// Catàleg d'articles + valors per defecte de bugaderia per habitació per a aquell
// dia: si hi ha una estada allotjada a l'habitació, s'usa la seva selecció
// (Estancia.bugaderia); si no, els valors per defecte de l'habitació. Serveixen
// per PREOMPLIR la bugaderia opt-in del full de neteja (el que compta és el que
// es desa a la tasca).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const dataStr = new URL(req.url).searchParams.get('data');
    if (!dataStr || !/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return badRequest('Cal el paràmetre data=YYYY-MM-DD');
    const [y, m, d] = dataStr.split('-').map(Number);
    const dia = new Date(y!, m! - 1, d!, 12, 0, 0, 0); // migdia local, evita límits

    const [articles, habitacions, estades] = await Promise.all([
      prisma.articleBugaderia.findMany({
        where: { deletedAt: null, actiu: true },
        orderBy: { ordre: 'asc' },
        select: { id: true, nom: true, preu: true },
      }),
      prisma.habitacio.findMany({
        where: { deletedAt: null },
        orderBy: { nom: 'asc' },
        select: { id: true, nom: true, bugaderiaDefault: true },
      }),
      prisma.estancia.findMany({
        where: {
          deletedAt: null,
          estat: { not: 'CANCELLADA' },
          habitacioId: { not: null },
          dataEntrada: { lte: dia },
          OR: [{ dataSortida: null }, { dataSortida: { gte: dia } }],
        },
        select: { habitacioId: true, bugaderia: true, dataEntrada: true },
        orderBy: { dataEntrada: 'desc' },
      }),
    ]);

    // Per habitació, l'estada allotjada més recent (la primera per ordre desc).
    const perHab = new Map<string, Seleccio>();
    for (const e of estades) {
      if (e.habitacioId && e.bugaderia != null && !perHab.has(e.habitacioId)) {
        perHab.set(e.habitacioId, e.bugaderia as Seleccio);
      }
    }

    const out = habitacions.map((h) => {
      const sel = perHab.get(h.id) ?? (h.bugaderiaDefault as Seleccio | null) ?? {};
      return {
        id: h.id,
        nom: h.nom,
        manteniment: sel.manteniment ?? [],
        sortida: sel.sortida ?? [],
      };
    });

    return ok({
      articles: articles.map((a) => ({ id: a.id, nom: a.nom, preu: Number(a.preu) })),
      habitacions: out,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
