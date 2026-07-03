/**
 * Genera (o recupera) el comprovant de comunicació a Mossos en PDF per a un
 * enviament. Si tenim el comprovant OFICIAL descarregat del portal, el retornem
 * tal qual; si no, en generem un resum. Reutilitzable per la descàrrega i el correu.
 */
import 'server-only';
import { prisma } from '../db';
import { buildReportPdf, type ReportSection } from './report';
import { readUpload } from '../storage';
import { formatDate } from '../utils';
import { ESTAT_ENVIAMENT_LABELS, TIPUS_DOCUMENT_LABELS } from '../validation/enums';

export async function getComprovantMossosPdf(
  enviamentId: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  const env = await prisma.enviamentMossos.findUnique({
    where: { id: enviamentId },
    include: {
      estancia: {
        include: {
          habitacio: true,
          viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } },
        },
      },
    },
  });
  if (!env) return null;

  const filename = `comprovant-mossos-${env.fitxerNom.replace(/\.txt$/, '')}.pdf`;

  // Comprovant oficial del portal (pujada automàtica): el servim tal qual.
  if (env.justificantPath) {
    try {
      const pdf = await readUpload(env.justificantPath);
      return { buffer: Buffer.from(pdf), filename };
    } catch {
      /* si no es pot llegir, caiem al resum generat */
    }
  }

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
  return { buffer: Buffer.from(pdf), filename };
}
