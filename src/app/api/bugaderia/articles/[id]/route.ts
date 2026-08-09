import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, noContent, handleApiError } from '@/lib/http';
import { z } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

const UpdateSchema = z.object({
  nom: z.string().trim().min(1).optional(),
  preu: z.coerce.number().nonnegative().optional(),
  actiu: z.coerce.boolean().optional(),
  ordre: z.coerce.number().int().optional(),
});

type Item = { article: string; qty: number };
type Seleccio = { manteniment?: Item[]; sortida?: Item[] };

// Reanomena les referències a un article (que es guarden pel nom) dins una selecció.
function renameEnSeleccio(sel: Seleccio | null, antic: string, nou: string): { sel: Seleccio; canvi: boolean } {
  const s: Seleccio = { manteniment: sel?.manteniment ?? [], sortida: sel?.sortida ?? [] };
  let canvi = false;
  for (const k of ['manteniment', 'sortida'] as const) {
    s[k] = (s[k] ?? []).map((i) => {
      if (i.article === antic) { canvi = true; return { ...i, article: nou }; }
      return i;
    });
  }
  return { sel: s, canvi };
}

// PATCH /api/bugaderia/articles/:id — editar un article del catàleg.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const d = UpdateSchema.parse(await req.json().catch(() => null));

    const previ = await prisma.articleBugaderia.findUnique({ where: { id }, select: { nom: true } });
    const article = await prisma.articleBugaderia.update({
      where: { id },
      data: {
        ...(d.nom !== undefined ? { nom: d.nom } : {}),
        ...(d.preu !== undefined ? { preu: d.preu } : {}),
        ...(d.actiu !== undefined ? { actiu: d.actiu } : {}),
        ...(d.ordre !== undefined ? { ordre: d.ordre } : {}),
      },
    });

    // Si es reanomena, propaga el nom nou a defaults d'habitacions i seleccions d'estades
    // (que referencien l'article pel nom) per no deixar-les òrfenes.
    if (d.nom !== undefined && previ && previ.nom !== d.nom) {
      const [habs, estades] = await Promise.all([
        prisma.habitacio.findMany({ where: { deletedAt: null }, select: { id: true, bugaderiaDefault: true } }),
        prisma.estancia.findMany({ where: { deletedAt: null }, select: { id: true, bugaderia: true } }),
      ]);
      const feines: Promise<unknown>[] = [];
      for (const h of habs) {
        if (h.bugaderiaDefault == null) continue;
        const { sel, canvi } = renameEnSeleccio(h.bugaderiaDefault as Seleccio, previ.nom, d.nom);
        if (canvi) feines.push(prisma.habitacio.update({ where: { id: h.id }, data: { bugaderiaDefault: sel } }));
      }
      for (const e of estades) {
        if (e.bugaderia == null) continue;
        const { sel, canvi } = renameEnSeleccio(e.bugaderia as Seleccio, previ.nom, d.nom);
        if (canvi) feines.push(prisma.estancia.update({ where: { id: e.id }, data: { bugaderia: sel } }));
      }
      await Promise.all(feines);
    }

    return ok({ article });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/bugaderia/articles/:id — esborrat lògic.
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.articleBugaderia.update({ where: { id }, data: { deletedAt: new Date(), actiu: false } });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
