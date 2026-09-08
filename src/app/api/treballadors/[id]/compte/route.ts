import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { CompteMarcarSchema } from '@/lib/validation/personal';
import { marcarMoviment, marcarPeriode } from '@/lib/services/compte-treballador';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/treballadors/:id/compte — marca com a pagat (o torna a pendent)
// una línia solta o tot un període, de neteja i/o de bugaderia.
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const treballador = await prisma.treballador.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!treballador) return notFound();

    const body = CompteMarcarSchema.parse(await req.json().catch(() => null));

    if (body.abast === 'LINIA') {
      const fet = await marcarMoviment(id, body.tipus, body.id, body.pagat);
      if (!fet) return notFound('Aquesta línia no és del compte d’aquest treballador');
      await audit({
        usuariId: auth.id,
        accio: 'MODIFICACIO',
        entitat: body.tipus === 'NETEJA' ? 'jornada' : 'tasca_neteja',
        entitatId: body.id,
        detall: { treballadorId: id, pagat: body.pagat },
        ip: clientIp(req),
      });
      return ok({ count: 1 });
    }

    const res = await marcarPeriode(
      id,
      { desde: body.desde, fins: body.fins },
      body.pagat,
      body.tipus,
    );
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'treballador',
      entitatId: id,
      detall: {
        compte: 'periode',
        desde: body.desde,
        fins: body.fins,
        tipus: body.tipus ?? 'TOT',
        pagat: body.pagat,
        jornades: res.neteja,
        bugaderia: res.bugaderia,
      },
      ip: clientIp(req),
    });
    return ok({ count: res.neteja + res.bugaderia, ...res });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
