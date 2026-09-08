import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, notFound, handleApiError } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/estancies/:id/hostes-orfes
// Estat al CRM de cada client d'aquesta estada, per poder dir-ho clar al diàleg
// d'eliminar: quants li'n quedarien (0 = quedaria sense cap estada i s'ofereix
// treure'l del CRM) i si ja estava eliminat d'abans.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const estancia = await prisma.estancia.findFirst({
      where: { id, deletedAt: null },
      select: {
        viatgers: {
          select: {
            huesped: { select: { id: true, nom: true, cognom1: true, cognom2: true, deletedAt: true } },
          },
        },
      },
    });
    if (!estancia) return notFound();

    const viatgers: { id: string; nom: string; altresEstades: number; eliminatEl: string | null }[] = [];
    const vistos = new Set<string>();
    for (const v of estancia.viatgers) {
      const h = v.huesped;
      if (!h || vistos.has(h.id)) continue;
      vistos.add(h.id);
      const altresEstades = await prisma.estanciaViatger.count({
        where: { huespedId: h.id, estanciaId: { not: id }, estancia: { deletedAt: null } },
      });
      viatgers.push({
        id: h.id,
        nom: [h.nom, h.cognom1, h.cognom2].filter(Boolean).join(' '),
        altresEstades,
        eliminatEl: h.deletedAt ? h.deletedAt.toISOString() : null,
      });
    }

    return ok({ viatgers });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
