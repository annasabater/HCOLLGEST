import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { buildFitxaPdf } from '@/lib/pdf/fitxa';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const ESTABLIMENT_ID = 'hostal-coll';
type Ctx = { params: Promise<{ id: string }> };

const BodySchema = z.object({ to: z.string().email() });

// POST /api/estancies/:id/fitxa-email — envia la fitxa PDF de registre per correu
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const { to } = BodySchema.parse(body);

    const estancia = await prisma.estancia.findFirst({ where: { id, deletedAt: null } });
    if (!estancia) return notFound();

    const [establiment, viatgers] = await Promise.all([
      prisma.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID } }),
      prisma.estanciaViatger.findMany({
        where: { estanciaId: id },
        include: { huesped: true, signatura: true },
        orderBy: { esTitular: 'desc' },
      }),
    ]);

    const pdf = await buildFitxaPdf(establiment, estancia, viatgers);
    const base64 = Buffer.from(pdf).toString('base64');
    const filename = `fitxa-${estancia.numContracte}-${estancia.anyContracte}.pdf`;
    const titular = viatgers[0]?.huesped;
    const nom = titular ? `${titular.nom} ${titular.cognom1}` : '—';

    const result = await sendEmail({
      to,
      subject: `Fitxa de registre — ${nom} · Contracte ${estancia.numContracte}/${estancia.anyContracte}`,
      html: `<p>Hola,</p><p>Adjuntem la fitxa de registre de persones allotjades per a l'estada de <strong>${nom}</strong> (contracte ${estancia.numContracte}/${estancia.anyContracte}).</p><p>Hostal Coll</p>`,
      attachments: [{ filename, content: base64 }],
    });

    if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: 502, headers: { 'Content-Type': 'application/json' } });

    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'estancia', entitatId: id, detall: { accio: 'fitxa-email', to }, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
