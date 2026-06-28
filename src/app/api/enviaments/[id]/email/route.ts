import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { buildReportPdf, type ReportSection } from '@/lib/pdf/report';
import { readUpload } from '@/lib/storage';
import { sendEmail } from '@/lib/email';
import { formatDate } from '@/lib/utils';
import { ESTAT_ENVIAMENT_LABELS, TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';
import { z } from 'zod';

type Ctx = { params: Promise<{ id: string }> };

const BodySchema = z.object({ to: z.string().email() });

// POST /api/enviaments/:id/email — envia el comprovant PDF de Mossos per correu
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const { to } = BodySchema.parse(body);

    const env = await prisma.enviamentMossos.findUnique({
      where: { id },
      include: {
        estancia: {
          include: {
            habitacio: true,
            viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } },
          },
        },
      },
    });
    if (!env) return notFound();

    const establiment = await prisma.establiment.findFirst();

    // Genera PDF (igual que el GET justificant)
    let pdfBytes: Uint8Array;
    const generarPdf = async () => {
      const sections: ReportSection[] = [
        {
          heading: 'Dades de la comunicació',
          kv: [
            ['Establiment', establiment?.nom ?? '—'],
            ['Id policial', establiment?.idPolicial ?? '—'],
            ['Fitxer', env.fitxerNom],
            ['Estat', ESTAT_ENVIAMENT_LABELS[env.estat]],
            ['Codi de validació', env.codiValidacio ?? '—'],
            ['Número de registre', env.numRegistre ?? '—'],
            ['Data d\'enviament', env.dataEnviament ? formatDate(env.dataEnviament) : '—'],
          ],
        },
        {
          heading: 'Estada',
          kv: [
            ['Contracte', `${env.estancia.numContracte}/${env.estancia.anyContracte}`],
            ['Entrada', formatDate(env.estancia.dataEntrada)],
            ['Sortida', formatDate(env.estancia.dataSortida)],
            ['Habitació', env.estancia.habitacio?.nom ?? '—'],
          ],
        },
        {
          heading: `Viatgers (${env.estancia.viatgers.length})`,
          table: {
            headers: ['Nom', 'Cognoms', 'Document'],
            rows: env.estancia.viatgers.map((ev) => [
              ev.huesped.nom,
              `${ev.huesped.cognom1} ${ev.huesped.cognom2 ?? ''}`.trim(),
              ev.huesped.tipusDocument
                ? `${TIPUS_DOCUMENT_LABELS[ev.huesped.tipusDocument as keyof typeof TIPUS_DOCUMENT_LABELS] ?? ev.huesped.tipusDocument} ${ev.huesped.numDocument ?? ''}`.trim()
                : '—',
            ]),
          },
        },
      ];
      const bytes = await buildReportPdf('Comprovant de comunicació a Mossos', `Hostal Coll · ${env.fitxerNom}`, sections);
      return new Uint8Array(bytes);
    };

    if (env.justificantPath) {
      try {
        const buf = await readUpload(env.justificantPath);
        pdfBytes = new Uint8Array(buf);
      } catch {
        pdfBytes = await generarPdf();
      }
    } else {
      pdfBytes = await generarPdf();
    }

    const base64 = Buffer.from(pdfBytes).toString('base64');
    const nom = `${env.estancia.viatgers[0]?.huesped.nom ?? ''} ${env.estancia.viatgers[0]?.huesped.cognom1 ?? ''}`.trim() || '—';
    const filename = `comprovant-mossos-${env.fitxerNom.replace(/\.txt$/, '')}.pdf`;

    const result = await sendEmail({
      to,
      subject: `Comprovant Mossos — ${env.fitxerNom} · ${nom}`,
      html: `<p>Hola,</p><p>Adjuntem el comprovant de comunicació a Mossos d'Esquadra per a l'estada de <strong>${nom}</strong> (fitxer: <code>${env.fitxerNom}</code>).</p><p>Hostal Coll</p>`,
      attachments: [{ filename, content: base64 }],
    });

    if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: 502, headers: { 'Content-Type': 'application/json' } });

    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'enviament_mossos', entitatId: id, detall: { accio: 'email', to }, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
