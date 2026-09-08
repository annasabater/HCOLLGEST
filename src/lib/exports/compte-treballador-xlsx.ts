/** Full de càlcul del compte d'un treballador: neteja i bugaderia d'un període. */
import 'server-only';
import ExcelJS from 'exceljs';
import type { MovimentCompte } from '../services/compte-treballador';

const EUR = '#,##0.00 €';
/** `YYYY-MM-DD` → `dd/mm/aaaa` sense passar per Date (evita salts de zona horària). */
const fmtDia = (dia: string) => {
  const [y, m, d] = dia.split('-');
  return `${d}/${m}/${y}`;
};

export async function buildCompteXlsx(
  nom: string,
  desde: string,
  fins: string,
  moviments: MovimentCompte[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hostal Coll — Gestió';
  const ws = wb.addWorksheet('Compte');

  ws.columns = [
    { header: 'Dia', key: 'dia', width: 12 },
    { header: 'Concepte', key: 'tipus', width: 12 },
    { header: 'Detall', key: 'detall', width: 60 },
    { header: 'Import', key: 'import', width: 12, style: { numFmt: EUR } },
    { header: 'Estat', key: 'estat', width: 10 },
    { header: 'Pagat el', key: 'pagatEl', width: 12 },
  ];
  // `columns` deixa la capçalera a la fila 1: hi encaixem el títol al davant.
  ws.spliceRows(1, 0, [`${nom} · del ${fmtDia(desde)} al ${fmtDia(fins)}`], []);
  ws.mergeCells('A1:F1');
  ws.getCell('A1').font = { bold: true, size: 13 };
  ws.getRow(3).font = { bold: true };

  // Del més antic al més recent: es llegeix millor en un full de comptes.
  const files = [...moviments].sort((a, b) => a.dia.localeCompare(b.dia));
  for (const m of files) {
    ws.addRow({
      dia: fmtDia(m.dia),
      tipus: m.tipus === 'NETEJA' ? 'Neteja' : 'Bugaderia',
      detall: m.concepte,
      import: m.import,
      estat: m.pagat ? 'Pagat' : 'Pendent',
      pagatEl: m.pagatEl ? fmtDia(m.pagatEl) : '',
    });
  }

  const suma = (fn: (m: MovimentCompte) => boolean) =>
    Math.round(files.filter(fn).reduce((s, m) => s + m.import, 0) * 100) / 100;

  ws.addRow({});
  const resum: [string, number][] = [
    ['TOTAL', suma(() => true)],
    ['Neteja', suma((m) => m.tipus === 'NETEJA')],
    ['Bugaderia', suma((m) => m.tipus === 'BUGADERIA')],
    ['Pagat', suma((m) => m.pagat)],
    ['Pendent', suma((m) => !m.pagat)],
  ];
  for (const [etiqueta, valor] of resum) {
    const fila = ws.addRow({ detall: etiqueta, import: valor });
    if (etiqueta === 'TOTAL' || etiqueta === 'Pendent') fila.font = { bold: true };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
