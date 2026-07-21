import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ok, handleApiError } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/proveidors/:id/defaults
// Valors habituals d'aquest proveïdor, agafats de la seva última despesa real:
// categoria, %IVA, %IRPF i mètode de pagament. Serveixen per autoemplenar el
// formulari de nova despesa quan es tria un proveïdor ja usat (només cal posar
// producte i preu). El NIF ja ve amb el proveïdor.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const ultima = await prisma.gasto.findFirst({
      where: { proveidorId: id, deletedAt: null, esFianca: false },
      orderBy: { data: 'desc' },
      select: {
        categoriaId: true,
        ivaPercent: true,
        irpfPercent: true,
        metodePagament: true,
      },
    });

    const defaults = ultima
      ? {
          categoriaId: ultima.categoriaId,
          ivaPercent: ultima.ivaPercent != null ? Number(ultima.ivaPercent) : null,
          irpfPercent: ultima.irpfPercent != null ? Number(ultima.irpfPercent) : null,
          metodePagament: ultima.metodePagament,
        }
      : null;

    return ok({ defaults });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
