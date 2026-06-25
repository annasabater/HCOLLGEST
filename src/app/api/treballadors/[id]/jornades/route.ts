import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, created, handleApiError, notFound, ok } from '@/lib/http';
import { JornadaCreateSchema } from '@/lib/validation/personal';

type Ctx = { params: Promise<{ id: string }> };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// GET /api/treballadors/:id/jornades?desde=YYYY-MM-DD&fins=YYYY-MM-DD
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const desde = url.searchParams.get('desde');
    const fins = url.searchParams.get('fins');
    const where: Record<string, unknown> = { treballadorId: id, deletedAt: null };
    if (desde) where.data = { ...(where.data as object ?? {}), gte: new Date(desde) };
    if (fins) {
      const finsDate = new Date(fins);
      finsDate.setDate(finsDate.getDate() + 1);
      where.data = { ...(where.data as object ?? {}), lt: finsDate };
    }
    const jornades = await prisma.jornada.findMany({
      where,
      orderBy: { data: 'desc' },
      select: { id: true, data: true, notes: true, import: true, pagada: true },
    });
    return ok({ jornades });
  } catch (err) {
    return handleApiError(err);
  }
}

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

// PATCH /api/treballadors/:id/jornades — marca un mes (YYYY-MM) com a pagat/pendent
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const mes = String(body?.mes ?? '');
    const pagada = Boolean(body?.pagada);
    if (!/^\d{4}-\d{2}$/.test(mes)) return badRequest('Mes no vàlid (YYYY-MM)');

    const treballador = await prisma.treballador.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!treballador) return notFound();

    const start = new Date(`${mes}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const res = await prisma.jornada.updateMany({
      where: { treballadorId: id, data: { gte: start, lt: end } },
      data: { pagada, dataPagament: pagada ? new Date() : null },
    });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'jornada',
      entitatId: id,
      detall: { treballadorId: id, mes, pagada, jornades: res.count },
      ip: clientIp(req),
    });
    return ok({ count: res.count });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
