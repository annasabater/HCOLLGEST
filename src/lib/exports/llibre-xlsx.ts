/**
 * Llibre de registre de viatgers en format Excel (.xlsx) amb TOTS els camps del
 * registre (els que demana la normativa d'allotjaments). Una fila per viatger i
 * estada. El fan servir tant la descàrrega manual (/api/llibre?format=xlsx) com
 * l'export mensual a Google Drive. Per a estades antigues s'usen les dades
 * congelades (no es reescriu el passat) via `viatgerEfectiu`.
 */
import 'server-only';
import ExcelJS from 'exceljs';
import type { Huesped, Parentesc } from '@prisma/client';
import { prisma } from '../db';
import { formatDate } from '../utils';
import { PARENTESC_LABELS, TIPUS_DOCUMENT_LABELS, SEXE_LABELS } from '../validation/enums';
import { viatgerEfectiu } from '../registre-snapshot';

export interface LlibreRow {
  nomCognoms: string;
  sexe: string;
  dataNaixement: string;
  nacionalitat: string;
  tipusDocument: string;
  numDocument: string;
  dataExpedicio: string;
  paisEmissor: string;
  adreca: string;
  codiPostal: string;
  localitatPais: string;
  telefon: string;
  email: string;
  dataEntrada: string;
  dataSortida: string;
  persones: number;
  parentesc: string;
}

type ViatgerLlibre = {
  esTitular: boolean;
  parentesc: Parentesc | null;
  dadesCongelades: unknown;
  huesped: Huesped;
};
export type EstanciaLlibre = {
  dataEntrada: Date | null;
  dataSortida: Date | null;
  numViatgers: number;
  viatgers: ViatgerLlibre[];
};

/** Mapa estades → files del llibre (una per viatger), amb les dades efectives. */
export function buildLlibreRows(estancies: EstanciaLlibre[]): LlibreRow[] {
  return estancies.flatMap((e) =>
    e.viatgers.map((ev) => {
      const h = viatgerEfectiu(ev.huesped, ev.dadesCongelades);
      return {
        nomCognoms: [h.nom, h.cognom1, h.cognom2].filter(Boolean).join(' '),
        sexe: h.sexe ? SEXE_LABELS[h.sexe] : '',
        dataNaixement: formatDate(h.dataNaixement),
        nacionalitat: h.nacionalitat ?? '',
        tipusDocument: h.tipusDocument ? TIPUS_DOCUMENT_LABELS[h.tipusDocument] : '',
        numDocument: h.numDocument ?? '',
        dataExpedicio: formatDate(h.dataExpedicio),
        paisEmissor: h.paisEmissor ?? '',
        adreca: h.adreca ?? '',
        codiPostal: h.codiPostal ?? '',
        localitatPais: [h.municipi || h.localitat, h.pais].filter(Boolean).join(', '),
        telefon: h.telefon ?? '',
        email: h.email ?? '',
        dataEntrada: formatDate(e.dataEntrada),
        dataSortida: formatDate(e.dataSortida),
        persones: e.numViatgers,
        parentesc: ev.parentesc ? PARENTESC_LABELS[ev.parentesc] : '',
      };
    }),
  );
}

const COLUMNS: { header: string; key: keyof LlibreRow; width: number }[] = [
  { header: 'Nom i cognoms', key: 'nomCognoms', width: 30 },
  { header: 'Sexe', key: 'sexe', width: 8 },
  { header: 'Data de naixement', key: 'dataNaixement', width: 16 },
  { header: 'Nacionalitat', key: 'nacionalitat', width: 14 },
  { header: 'Tipus de document', key: 'tipusDocument', width: 16 },
  { header: 'Número de document', key: 'numDocument', width: 18 },
  { header: "Data d'expedició", key: 'dataExpedicio', width: 16 },
  { header: 'País emissor del document', key: 'paisEmissor', width: 16 },
  { header: 'Adreça de residència habitual', key: 'adreca', width: 30 },
  { header: 'Codi postal', key: 'codiPostal', width: 12 },
  { header: 'Localitat i país de residència', key: 'localitatPais', width: 26 },
  { header: 'Telèfon', key: 'telefon', width: 16 },
  { header: 'Correu electrònic', key: 'email', width: 26 },
  { header: "Data i hora d'entrada", key: 'dataEntrada', width: 18 },
  { header: 'Data prevista de sortida', key: 'dataSortida', width: 18 },
  { header: 'Persones allotjades', key: 'persones', width: 12 },
  { header: 'Parentesc (menors)', key: 'parentesc', width: 16 },
];

export async function buildLlibreXlsxFromRows(rows: LlibreRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hostal Coll — Gestió';
  const ws = wb.addWorksheet('Llibre de registre');
  ws.columns = COLUMNS;
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const r of rows) ws.addRow(r);
  const lastCol = String.fromCharCode(64 + COLUMNS.length); // A=65 → fins a la darrera columna
  ws.autoFilter = { from: 'A1', to: `${lastCol}1` };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Genera l'Excel a partir d'estades ja consultades (amb viatgers i hostes). */
export async function buildLlibreXlsx(estancies: EstanciaLlibre[]): Promise<Buffer> {
  return buildLlibreXlsxFromRows(buildLlibreRows(estancies));
}

/**
 * Genera l'Excel del llibre per a un període (export a Drive). Sense filtre de
 * vista restringida: és l'arxiu legal complet. Si no es passa rang, tot l'històric.
 */
export async function buildLlibreXlsxMes(desde?: Date, fins?: Date): Promise<Buffer> {
  const estancies = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      ...(desde || fins ? { dataEntrada: { ...(desde ? { gte: desde } : {}), ...(fins ? { lte: fins } : {}) } } : {}),
    },
    orderBy: { dataEntrada: 'asc' },
    include: {
      viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } },
    },
  });
  return buildLlibreXlsx(estancies);
}
