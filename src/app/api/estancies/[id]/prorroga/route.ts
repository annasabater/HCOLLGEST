import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { inicDia } from '@/lib/prorroga';

type Ctx = { params: Promise<{ id: string }> };

const detall = z.string().trim().max(300).nullish();
const Schema = z.discriminatedUnion('accio', [
  z.object({ accio: z.literal('PREGUNTAT'), detall }), // missatge «vol allargar?» enviat
  z.object({ accio: z.literal('SI'), detall }),
  z.object({ accio: z.literal('NO'), detall }), // ha dit que no o «no ha contestat» enviat
  z.object({ accio: z.literal('NO_CONTESTA'), detall }), // missatge «no contesta» enviat (= marxa)
  z.object({ accio: z.literal('APLACA'), dies: z.coerce.number().int().min(1).max(60), detall }),
  z.object({ accio: z.literal('MOSTRA') }), // treu l'aplaçament
  z.object({ accio: z.literal('RECORDATORI'), detall }), // recordatori de sortida enviat
  z.object({ accio: z.literal('NOTA'), detall: z.string().trim().min(1, 'Escriu la nota').max(300) }),
]);

// POST /api/estancies/:id/prorroga — desa què s'ha fet amb la pròrroga/sortida i
// ho apunta a la línia del temps de l'estada. L'estat va lligat a la data de
// sortida actual (si canvia, es torna a preguntar).
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
      body.accio === 'NOTA'
        ? null
        : body.accio === 'RECORDATORI'
          ? { recordatoriSortida: e.dataSortida }
          : body.accio === 'APLACA'
            ? { ...base, prorrogaAplacatFins: new Date(inicDia(now).getTime() + body.dies * 86_400_000) }
            : body.accio === 'MOSTRA'
              ? { ...base, prorrogaAplacatFins: null }
              : body.accio === 'PREGUNTAT'
                ? { ...base, prorrogaEstat: 'PREGUNTAT', prorrogaPreguntatAt: now, prorrogaAplacatFins: null }
                : { ...base, prorrogaEstat: body.accio === 'NO_CONTESTA' ? 'NO' : body.accio, prorrogaAplacatFins: null };

    const tipus = body.accio === 'APLACA' ? 'APLACAT' : body.accio;
    await prisma.$transaction(async (tx) => {
      if (data) await tx.estancia.update({ where: { id }, data });
      if (body.accio !== 'MOSTRA') {
        await tx.prorrogaEvent.create({
          data: { estanciaId: id, tipus, detall: body.detall || null, usuariId: auth.id },
        });
      }
    });
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

// DELETE /api/estancies/:id/prorroga?event=… — treu un pas apuntat per error
// (només de la línia del temps; l'estat es canvia amb els botons).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const eventId = new URL(req.url).searchParams.get('event');
    if (!eventId) return notFound();
    const r = await prisma.prorrogaEvent.deleteMany({ where: { id: eventId, estanciaId: id } });
    if (r.count === 0) return notFound();
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'prorroga_event', entitatId: eventId, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
