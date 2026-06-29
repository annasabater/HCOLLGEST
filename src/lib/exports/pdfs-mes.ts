/**
 * PDFs d'un mes per a l'arxiu a Drive: fitxes de registre (Mossos), comprovants
 * de comunicació a Mossos i factures (amb i sense fiança). Reaprofiten els
 * generadors existents (`buildFitxaPdf`, `buildReportPdf`).
 */
import 'server-only';
import { prisma } from './../db';
import { buildFitxaPdf } from '../pdf/fitxa';
import { buildReportPdf, type ReportSection } from '../pdf/report';
import { readUpload } from '../storage';
import { formatDate } from '../utils';
import {
  METODE_COBRAMENT_LABELS,
  CONCEPTE_LINIA_LABELS,
  TIPUS_DOCUMENT_LABELS,
  ESTAT_ENVIAMENT_LABELS,
} from '../validation/enums';

export interface PdfFitxer {
  name: string;
  data: Buffer;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const eur = (n: number) => `${n.toFixed(2)} EUR`;
/** Neteja un text per fer-lo servir com a nom de fitxer a Drive. */
const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').trim();

/** Fitxes oficials "Registre de persones allotjades" de les estades del mes. */
export async function buildFitxesPdfs(monthStart: Date, monthEnd: Date): Promise<PdfFitxer[]> {
  const establiment = await prisma.establiment.findFirst();
  if (!establiment) return [];
  const estancies = await prisma.estancia.findMany({
    where: { deletedAt: null, dataEntrada: { gte: monthStart, lte: monthEnd } },
    include: {
      viatgers: { include: { huesped: true, signatura: true }, orderBy: { esTitular: 'desc' } },
    },
    orderBy: { dataEntrada: 'asc' },
  });

  const out: PdfFitxer[] = [];
  for (const est of estancies) {
    const pdf = await buildFitxaPdf(establiment, est, est.viatgers);
    out.push({ name: `Fitxa ${safe(`${est.numContracte}-${est.anyContracte}`)}.pdf`, data: Buffer.from(pdf) });
  }
  return out;
}

/** Comprovants de les comunicacions a Mossos enviades durant el mes. */
export async function buildComprovantsPdfs(monthStart: Date, monthEnd: Date): Promise<PdfFitxer[]> {
  const establiment = await prisma.establiment.findFirst();
  const enviaments = await prisma.enviamentMossos.findMany({
    where: {
      estat: { in: ['ENVIAT', 'ACCEPTAT'] },
      dataEnviament: { gte: monthStart, lte: monthEnd },
    },
    include: {
      estancia: {
        include: {
          habitacio: true,
          viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } },
        },
      },
    },
    orderBy: { dataEnviament: 'asc' },
  });

  const out: PdfFitxer[] = [];
  for (const env of enviaments) {
    // Si tenim el comprovant oficial descarregat del portal, l'usem directament.
    if (env.justificantPath) {
      try {
        const pdf = await readUpload(env.justificantPath);
        out.push({ name: `Comprovant ${safe(env.fitxerNom.replace(/\.txt$/, ''))}.pdf`, data: Buffer.from(pdf) });
        continue;
      } catch {
        // Si no es pot llegir, generem el resum
      }
    }

    const sections: ReportSection[] = [
      {
        heading: 'Dades de la comunicació',
        kv: [
          ['Establiment', establiment?.nom ?? '-'],
          ['Id policial', establiment?.idPolicial ?? '-'],
          ['Fitxer', env.fitxerNom],
          ['Estat', ESTAT_ENVIAMENT_LABELS[env.estat]],
          ['Codi de validació', env.codiValidacio ?? '-'],
          ['Número de registre', env.numRegistre ?? '-'],
          ['Data d\'enviament', env.dataEnviament ? formatDate(env.dataEnviament) : '-'],
        ],
      },
      {
        heading: 'Estada',
        kv: [
          ['Contracte', `${env.estancia.numContracte}/${env.estancia.anyContracte}`],
          ['Entrada', formatDate(env.estancia.dataEntrada)],
          ['Sortida', formatDate(env.estancia.dataSortida)],
          ['Habitació', env.estancia.habitacio?.nom ?? '-'],
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
              : '-',
          ]),
        },
      },
    ];
    const pdf = await buildReportPdf(
      'Comprovant de comunicació a Mossos',
      `Hostal Coll · ${env.fitxerNom}`,
      sections,
    );
    out.push({ name: `Comprovant ${safe(env.fitxerNom.replace(/\.txt$/, ''))}.pdf`, data: Buffer.from(pdf) });
  }
  return out;
}

/**
 * Factures del mes en PDF. Amb `ambFianca`, hi afegeix un bloc amb les fiances
 * en custòdia de l'estada (separades, no formen part de la base ni l'ingrés).
 */
export async function buildFacturesPdfs(
  monthStart: Date,
  monthEnd: Date,
  ambFianca: boolean,
): Promise<PdfFitxer[]> {
  const establiment = await prisma.establiment.findFirst();
  const factures = await prisma.factura.findMany({
    where: { deletedAt: null, data: { gte: monthStart, lte: monthEnd } },
    include: {
      linies: true,
      estancia: {
        include: {
          viatgers: { where: { esTitular: true }, include: { huesped: true } },
          diposits: { where: { estat: 'EN_CUSTODIA' }, orderBy: { data: 'asc' } },
        },
      },
    },
    orderBy: { data: 'asc' },
  });

  const out: PdfFitxer[] = [];
  for (const f of factures) {
    const base = Number(f.base);
    const iva = Number(f.iva);
    const total = Number(f.total);
    const tassa = r2(total - base - iva);
    const ivaPercent = base > 0 ? r2((iva / base) * 100) : 0;
    const titular = f.estancia.viatgers[0]?.huesped ?? null;

    const sections: ReportSection[] = [
      {
        heading: 'Emissor',
        kv: [
          ['Nom', establiment?.raoSocial || establiment?.nom || 'Hostal Coll'],
          ['NIF', establiment?.cif ?? '-'],
          ['Adreça', [establiment?.adreca, establiment?.codiPostal, establiment?.poblacio].filter(Boolean).join(', ') || '-'],
        ],
      },
      {
        heading: 'Client',
        kv: [
          ['Nom', titular ? [titular.nom, titular.cognom1, titular.cognom2].filter(Boolean).join(' ') : '-'],
          ['NIF', titular?.numDocument ?? '-'],
        ],
      },
      {
        heading: `Factura ${f.numero} · ${formatDate(f.data)}`,
        table: {
          headers: ['Concepte', 'Descripció', 'Import'],
          rows: f.linies.map((l) => [
            CONCEPTE_LINIA_LABELS[l.concepte],
            l.descripcio,
            eur(Number(l.import)),
          ]),
        },
      },
      {
        heading: 'Totals',
        kv: [
          ['Base imposable', eur(base)],
          [`IVA (${ivaPercent}%)`, eur(iva)],
          ...(tassa > 0 ? ([['Tassa turística', eur(tassa)]] as [string, string][]) : []),
          ['Total', eur(total)],
        ],
      },
    ];

    let suffix = '';
    const fiances = f.estancia.diposits;
    if (ambFianca && fiances.length > 0) {
      const totalFianca = fiances.reduce((a, d) => a + Number(d.import), 0);
      sections.push({
        heading: 'Fiança en custòdia (no és ingrés)',
        kv: [
          ...fiances.map(
            (d) => [`Fiança · ${METODE_COBRAMENT_LABELS[d.metode]}`, eur(Number(d.import))] as [string, string],
          ),
          ['Total lliurat amb fiança', eur(r2(total + totalFianca))],
        ],
      });
      suffix = ' (amb fianca)';
    }

    const pdf = await buildReportPdf(
      ambFianca ? `Factura ${f.numero} (amb fiança)` : `Factura ${f.numero}`,
      establiment?.nom ?? 'Hostal Coll',
      sections,
    );
    out.push({ name: `Factura ${safe(f.numero)}${suffix}.pdf`, data: Buffer.from(pdf) });
  }
  return out;
}
