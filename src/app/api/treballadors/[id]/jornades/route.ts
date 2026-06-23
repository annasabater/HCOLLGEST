import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, created, handleApiError, notFound } from '@/lib/http';
import { JornadaCreateSchema } from '@/lib/validation/personal';

type Ctx = { params: Promise<{ id: string }> };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// POST /api/treballadors/:id/jornades — registra un dia treballat (hores → import)
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const treballador = await prisma.treballador.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, preuHora: true },
    });
    if (!treballador) return notFound();

    const data = JornadaCreateSchema.parse(await req.json().catch(() => null));
    const preuHora = data.preuHora ?? (treballador.preuHora ? Number(treballador.preuHora) : 0);
    if (!preuHora || preuHora <= 0) {
      return badRequest('Indica un preu/hora (al treballador o en aquesta jornada)');
    }
    const importTotal = round2(data.hores * preuHora);

    const jornada = await prisma.jornada.create({
      data: {
        treballadorId: id,
        data: data.data,
        hores: data.hores,
        preuHora,
        import: importTotal,
        notes: data.notes ?? null,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'jornada',
      entitatId: jornada.id,
      detall: { treballadorId: id, hores: data.hores, import: importTotal },
      ip: clientIp(req),
    });
    return created({ jornada });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
