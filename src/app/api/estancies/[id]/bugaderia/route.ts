import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { ok, handleApiError, notFound } from '@/lib/http';
import { z } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

const ItemSchema = z.object({ article: z.string().min(1), qty: z.coerce.number().int().min(0) });
const SeleccioSchema = z.object({
  manteniment: z.array(ItemSchema).default([]),
  sortida: z.array(ItemSchema).default([]),
});

// GET /api/estancies/:id/bugaderia — catàleg + selecció actual + valors per defecte de l'habitació.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const [est, articles] = await Promise.all([
      prisma.estancia.findFirst({
        where: { id, deletedAt: null },
        select: { bugaderia: true, habitacio: { select: { nom: true, bugaderiaDefault: true } } },
      }),
      prisma.articleBugaderia.findMany({
        where: { deletedAt: null, actiu: true },
        orderBy: { ordre: 'asc' },
        select: { id: true, nom: true, preu: true },
      }),
    ]);
    if (!est) return notFound();

    return ok({
      articles: articles.map((a) => ({ id: a.id, nom: a.nom, preu: Number(a.preu) })),
      seleccio: est.bugaderia ?? null,
      habDefault: est.habitacio?.bugaderiaDefault ?? null,
      habitacio: est.habitacio?.nom ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/estancies/:id/bugaderia — desa la selecció de la bugaderia d'aquesta estada.
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const seleccio = SeleccioSchema.parse(body);

    const est = await prisma.estancia.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!est) return notFound();

    await prisma.estancia.update({ where: { id }, data: { bugaderia: seleccio } });
    return ok({ seleccio });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
