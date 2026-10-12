/**
 * Excel de la taxa turística d'un any (es reescriu sencer a Drive cada dia):
 * pestanya «Resum» amb els paràmetres i el total per trimestre, i una pestanya
 * per trimestre amb una fila per persona. Cel·les taronja = dada que falta.
 */
import 'server-only';
import ExcelJS from 'exceljs';
import { TIPUS_DOCUMENT_LABELS } from '../validation/enums';
import type { FilaIeet } from '../ieet';
import type { IeetAny } from '../services/ieet';

const GRANAT = 'FF7A1F2B';
const TARONJA = 'FFFCE4D6';
const GRIS = 'FFEFEAE4';
const EUR = '#,##0.00 "€";-#,##0.00 "€";"-"';

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
  { header: 'Trimestre', width: 9, valor: (f) => f.trimestre },
];

const NOM_TRIM = ['1r trimestre', '2n trimestre', '3r trimestre', '4t trimestre'];

function capcalera(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRANAT } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 30;
}

export async function buildIeetXlsx(d: IeetAny): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hostal Coll — Gestió';

  // ── Resum ──
  const r = wb.addWorksheet('Resum', { views: [{ showGridLines: false }] });
  r.columns = [{ width: 44 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 16 }];
  r.getCell('A1').value = `HOSTAL COLL · Taxa turística (IEET) ${d.any}`;
  r.getCell('A1').font = { bold: true, size: 16, color: { argb: GRANAT }, name: 'Arial' };
  r.getCell('A2').value = 'Per estades (entrada i sortida), no per factures. Només paga la primera estada; les continuacions no surten. Generat per l’app: no l’editis aquí, s’actualitza sol cada dia.';
  r.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF666666' }, name: 'Arial' };
  const params: [string, number, string?][] = [
    ['Import per persona i nit', d.config.tarifa, EUR],
    ['Màxim de nits que paguen (primera estada)', d.config.maxNits],
    ['Edat a partir de la qual es paga', d.config.edatMinima],
  ];
  params.forEach(([k, v, fmt], i) => {
    r.getCell(`A${4 + i}`).value = k;
    const c = r.getCell(`B${4 + i}`);
    c.value = v;
    if (fmt) c.numFmt = fmt;
  });
  const hdr = r.getRow(8);
  hdr.values = ['Trimestre', 'Persones', 'Persones que paguen', 'Nits que paguen', 'Import IEET (€)'];
  capcalera(hdr);
  let fila = 9;
  for (let t = 1; t <= 4; t++) {
    const x = d.resum.find((s) => s.trimestre === `${d.any}-T${t}`);
    const row = r.getRow(fila++);
    row.values = [NOM_TRIM[t - 1]!, x?.persones ?? 0, x?.personesPaguen ?? 0, x?.nitsPaguen ?? 0, x?.import ?? 0];
    row.getCell(5).numFmt = EUR;
  }
  const tot = r.getRow(fila);
  // Fórmules amb el resultat ja calculat (la vista prèvia de Drive no recalcula).
  const suma = (k: 'persones' | 'personesPaguen' | 'nitsPaguen' | 'import') =>
    Math.round(d.resum.reduce((a, x) => a + x[k], 0) * 100) / 100;
  tot.values = [
    'TOTAL',
    { formula: 'SUM(B9:B12)', result: suma('persones') },
    { formula: 'SUM(C9:C12)', result: suma('personesPaguen') },
    { formula: 'SUM(D9:D12)', result: suma('nitsPaguen') },
    { formula: 'SUM(E9:E12)', result: suma('import') },
  ];
  tot.font = { bold: true, name: 'Arial', size: 10 };
  tot.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } }; });
  tot.getCell(5).numFmt = EUR;

  // ── Una pestanya per trimestre ──
  for (let t = 1; t <= 4; t++) {
    const files = d.files.filter((f) => f.trimestre === `${d.any}-T${t}`);
    const ws = wb.addWorksheet(NOM_TRIM[t - 1]!, { views: [{ state: 'frozen', xSplit: 7, ySplit: 1 }] });
    ws.columns = COLUMNES.map((c) => ({ header: c.header, width: c.width }));
    capcalera(ws.getRow(1));
    files.forEach((f, i) => {
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
    if (files.length === 0) {
      ws.getCell('A2').value = 'Encara no hi ha cap estada acabada en aquest trimestre.';
      continue;
    }
    const last = files.length + 1;
    const totRow = ws.getRow(last + 1);
    totRow.getCell(7).value = 'TOTAL';
    totRow.getCell(6).value = { formula: `SUM(F2:F${last})`, result: files.reduce((a, f) => a + f.nitsPaguen, 0) };
    totRow.getCell(19).value = { formula: `SUM(S2:S${last})`, result: Math.round(files.reduce((a, f) => a + f.import, 0) * 100) / 100 };
    totRow.getCell(19).numFmt = EUR;
    totRow.font = { bold: true, name: 'Arial', size: 10 };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
