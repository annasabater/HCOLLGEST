import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { inicDia } from '@/lib/prorroga';

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.discriminatedUnion('accio', [
  z.object({ accio: z.literal('PREGUNTAT') }), // missatge «vol allargar?» enviat
  z.object({ accio: z.literal('SI') }),
  z.object({ accio: z.literal('NO') }), // ha dit que no o «no ha contestat» enviat
  z.object({ accio: z.literal('APLACA'), dies: z.coerce.number().int().min(1).max(60) }),
  z.object({ accio: z.literal('MOSTRA') }), // treu l'aplaçament
  z.object({ accio: z.literal('RECORDATORI') }), // recordatori de sortida enviat
]);

// POST /api/estancies/:id/prorroga — desa què s'ha fet amb l'avís de pròrroga.
// Tot queda lligat a la data de sortida actual (si canvia, es torna a preguntar).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = Schema.parse(await req.json().catch(() => null));

    const e = await prisma.estancia.findFirst({
      where: { id, deletedAt: null },
      select: { dataSortida: true, prorrogaEstat: true, prorrogaSortida: true },
    });
    if (!e?.dataSortida) return notFound();

    const now = new Date();
    // Estat anterior només si era per a aquesta mateixa sortida.
    const mateixa = e.prorrogaSortida?.getTime() === e.dataSortida.getTime();
    const base = { prorrogaSortida: e.dataSortida, prorrogaEstat: mateixa ? e.prorrogaEstat : null };

    const data =
      body.accio === 'RECORDATORI'
        ? { recordatoriSortida: e.dataSortida }
        : body.accio === 'APLACA'
          ? { ...base, prorrogaAplacatFins: new Date(inicDia(now).getTime() + body.dies * 86_400_000) }
          : body.accio === 'MOSTRA'
            ? { ...base, prorrogaAplacatFins: null }
            : body.accio === 'PREGUNTAT'
              ? { ...base, prorrogaEstat: 'PREGUNTAT', prorrogaPreguntatAt: now, prorrogaAplacatFins: null }
              : { ...base, prorrogaEstat: body.accio, prorrogaAplacatFins: null };

    await prisma.estancia.update({ where: { id }, data });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'estancia',
      entitatId: id,
      detall: { prorroga: body.accio },
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
