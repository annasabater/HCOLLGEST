/**
 * Excel de la taxa turística d'un PERÍODE de declaració (abril–setembre o
 * octubre–març), que es reescriu sencer a Drive cada dia: pestanya «Resum» amb
 * les dates, el termini de pagament, els paràmetres i el total, i pestanya
 * «Persones» amb una fila per persona. Cel·les taronja = dada que falta.
 */
import 'server-only';
import ExcelJS from 'exceljs';
import { TIPUS_DOCUMENT_LABELS } from '../validation/enums';
import type { FilaIeet } from '../ieet';
import type { IeetPeriode } from '../services/ieet';

const GRANAT = 'FF7A1F2B';
const TARONJA = 'FFFCE4D6';
const GRIS = 'FFEFEAE4';
const EUR = '#,##0.00 "€";-#,##0.00 "€";"-"';

const dataEs = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

// Columna → dada que, si falta, pinta la cel·la de taronja.
const COLUMNES: { header: string; width: number; valor: (f: FilaIeet) => string | number | Date | null; falta?: string; data?: true; eur?: true }[] = [
  { header: 'Contracte', width: 10, valor: (f) => f.contracte },
  { header: 'Habitació', width: 9, valor: (f) => f.habitacio, falta: 'habitació' },
  { header: 'Entrada', width: 11, valor: (f) => new Date(`${f.entrada}T00:00:00Z`), data: true },
  { header: 'Sortida', width: 11, valor: (f) => new Date(`${f.sortida}T00:00:00Z`), data: true },
  { header: 'Nits estada', width: 8, valor: (f) => f.nitsEstada },
  { header: 'Nits que paguen', width: 9, valor: (f) => f.nitsPaguen },
  { header: 'Cognoms i nom', width: 30, valor: (f) => f.nom },
  { header: 'Tipus document', width: 11, valor: (f) => (f.tipusDocument ? TIPUS_DOCUMENT_LABELS[f.tipusDocument as keyof typeof TIPUS_DOCUMENT_LABELS] ?? f.tipusDocument : ''), falta: 'document' },
  { header: 'Núm. document', width: 14, valor: (f) => f.numDocument, falta: 'document' },
  { header: 'Nacionalitat', width: 13, valor: (f) => f.nacionalitat, falta: 'nacionalitat' },
  { header: 'Data naixement', width: 11, valor: (f) => (f.dataNaixement ? new Date(`${f.dataNaixement}T00:00:00Z`) : null), falta: 'data de naixement', data: true },
  { header: 'Edat', width: 6, valor: (f) => f.edat },
  { header: 'Domicili', width: 28, valor: (f) => f.adreca, falta: 'domicili' },
  { header: 'CP', width: 7, valor: (f) => f.codiPostal },
  { header: 'Municipi', width: 18, valor: (f) => f.municipi, falta: 'municipi' },
  { header: 'País', width: 12, valor: (f) => f.pais, falta: 'país' },
  { header: 'Telèfon', width: 14, valor: (f) => f.telefon, falta: 'telèfon' },
  { header: 'Correu electrònic', width: 26, valor: (f) => f.email, falta: 'correu' },
  { header: 'Import IEET (€)', width: 11, valor: (f) => f.import, eur: true },
];

function capcalera(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRANAT } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 30;
}

export async function buildIeetXlsx(d: IeetPeriode): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hostal Coll — Gestió';
  const p = d.periode;

  // ── Resum ──
  const r = wb.addWorksheet('Resum', { views: [{ showGridLines: false }] });
  r.columns = [{ width: 44 }, { width: 22 }];
  r.getCell('A1').value = `HOSTAL COLL · Taxa turística (IEET) · ${p.etiqueta}`;
  r.getCell('A1').font = { bold: true, size: 16, color: { argb: GRANAT }, name: 'Arial' };
  r.getCell('A2').value = 'Per estades (entrada i sortida), no per factures. Només paga la primera estada; les continuacions no surten. Generat per l’app: no l’editis aquí, s’actualitza sol cada dia.';
  r.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF666666' }, name: 'Arial' };

  const linies: [string, string | number, string?][] = [
    ['Període (data d’entrada)', `${dataEs(p.inici)} – ${dataEs(p.fi)}`],
    ['Termini de pagament', `${dataEs(p.pagamentDes)} – ${dataEs(p.pagamentFins)}`],
    ['Import per persona i nit', d.config.tarifa, EUR],
    ['Màxim de nits que paguen (primera estada)', d.config.maxNits],
    ['Paguen a partir de (anys)', d.config.edatMinima],
    ['Persones', d.resum.persones],
    ['Persones que paguen', d.resum.personesPaguen],
    ['Nits que paguen', d.resum.nitsPaguen],
    ['IMPORT A PAGAR', d.resum.import, EUR],
  ];
  linies.forEach(([k, v, fmt], i) => {
    const row = r.getRow(4 + i);
    row.getCell(1).value = k;
    row.getCell(2).value = v;
    row.font = { name: 'Arial', size: 10 };
    if (fmt) row.getCell(2).numFmt = fmt;
  });
  const total = r.getRow(4 + linies.length - 1);
  total.font = { bold: true, name: 'Arial', size: 12 };
  total.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } }; });

  // ── Persones ──
  const ws = wb.addWorksheet('Persones', { views: [{ state: 'frozen', xSplit: 7, ySplit: 1 }] });
  ws.columns = COLUMNES.map((c) => ({ header: c.header, width: c.width }));
  capcalera(ws.getRow(1));
  if (d.files.length === 0) {
    ws.getCell('A2').value = 'Encara no hi ha cap estada acabada en aquest període.';
  } else {
    d.files.forEach((f, i) => {
      const row = ws.getRow(i + 2);
      COLUMNES.forEach((c, j) => {
        const cell = row.getCell(j + 1);
        cell.value = c.valor(f);
        cell.font = { name: 'Arial', size: 10 };
        if (c.data) cell.numFmt = 'dd/mm/yyyy';
        if (c.eur) cell.numFmt = EUR;
        if (c.falta && f.falten.includes(c.falta)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TARONJA } };
      });
    });
    const last = d.files.length + 1;
    const totRow = ws.getRow(last + 1);
    totRow.getCell(7).value = 'TOTAL';
    // Fórmules amb el resultat ja calculat (la vista prèvia de Drive no recalcula).
    totRow.getCell(19).value = { formula: `SUM(S2:S${last})`, result: d.resum.import };
    totRow.getCell(19).numFmt = EUR;
    totRow.font = { bold: true, name: 'Arial', size: 10 };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
