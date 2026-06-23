import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { handleApiError, notFound } from '@/lib/http';
import { buildReportPdf, type ReportSection } from '@/lib/pdf/report';
import { formatDate } from '@/lib/utils';
import { ESTAT_ENVIAMENT_LABELS, TIPUS_DOCUMENT_LABELS } from '@/lib/validation/enums';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/enviaments/:id/justificant — comprovant PDF de la comunicació a Mossos
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

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
              ? `${TIPUS_DOCUMENT_LABELS[ev.huesped.tipusDocument]} ${ev.huesped.numDocument ?? ''}`.trim()
              : '—',
          ]),
        },
      },
    ];

    const pdf = await buildReportPdf(
      'Comprovant de comunicació a Mossos',
      `Hostal Coll · ${env.fitxerNom}`,
      sections,
    );

    await audit({
      usuariId: auth.id,
      accio: 'IMPRESSIO',
      entitat: 'enviament_mossos',
      entitatId: id,
      ip: clientIp(req),
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="comprovant-mossos-${env.fitxerNom.replace(/\.txt$/, '')}.pdf"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
