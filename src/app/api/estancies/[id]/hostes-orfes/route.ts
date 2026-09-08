import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, notFound, handleApiError } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/estancies/:id/hostes-orfes
// Clients d'aquesta estada que, si s'elimina, es quedarien sense cap estada
// visible (no en tenen cap altra de no esborrada). Serveix per avisar-ne abans
// d'eliminar i oferir treure'ls també del CRM.
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

    const hostes: { id: string; nom: string }[] = [];
    const vistos = new Set<string>();
    for (const v of estancia.viatgers) {
      const h = v.huesped;
      if (!h || h.deletedAt || vistos.has(h.id)) continue;
      vistos.add(h.id);
      const altres = await prisma.estanciaViatger.count({
        where: { huespedId: h.id, estanciaId: { not: id }, estancia: { deletedAt: null } },
      });
      if (altres === 0) {
        hostes.push({ id: h.id, nom: [h.nom, h.cognom1, h.cognom2].filter(Boolean).join(' ') });
      }
    }

    return ok({ hostes });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
