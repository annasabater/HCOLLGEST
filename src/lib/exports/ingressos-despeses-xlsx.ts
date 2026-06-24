/**
 * Full de càlcul d'ingressos i despeses d'un mes: un resum (net i amb custòdia)
 * i el detall de cobraments i despeses. Els totals quadren amb el Balanç.
 */
import 'server-only';
import ExcelJS from 'exceljs';
import { prisma } from './../db';
import { getBalanc } from '../services/dashboard';
import { METODE_COBRAMENT_LABELS, CONCEPTE_LINIA_LABELS } from '../validation/enums';

const EUR = '#,##0.00 €';
const fmtData = (d: Date) => new Intl.DateTimeFormat('ca-ES').format(d);

export async function buildIngressosDespesesXlsx(
  monthStart: Date,
  monthEnd: Date,
): Promise<Buffer> {
  const [bal, cobraments, gastos] = await Promise.all([
    getBalanc(monthStart, monthEnd),
    prisma.cobrament.findMany({
      where: {
        data: { gte: monthStart, lte: monthEnd },
        estancia: { deletedAt: null },
        OR: [{ facturaId: null }, { factura: { deletedAt: null } }],
      },
      include: { factura: { select: { numero: true } } },
      orderBy: { data: 'asc' },
    }),
    prisma.gasto.findMany({
      where: { data: { gte: monthStart, lte: monthEnd } },
      include: { categoria: { select: { nom: true } }, proveidor: { select: { nom: true } } },
      orderBy: { data: 'asc' },
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hostal Coll — Gestió';

  // --- Resum ---
  const resum = wb.addWorksheet('Resum');
  resum.columns = [
    { header: 'Concepte', key: 'k', width: 32 },
    { header: 'Import', key: 'v', width: 16, style: { numFmt: EUR } },
  ];
  resum.getRow(1).font = { bold: true };
  const fila = (k: string, v: number, bold = false) => {
    const r = resum.addRow({ k, v });
    if (bold) r.font = { bold: true };
  };
  fila('Ingressos (net)', bal.ingressos, true);
  fila('Despeses', bal.despeses);
  fila('Personal', bal.personal);
  fila('Benefici (net)', bal.benefici, true);
  resum.addRow({});
  fila('Dipòsits en custòdia', bal.retencions);
  fila('Ingressos + custòdia', bal.ingressosAmbRetencions, true);

  // --- Ingressos (cobraments) ---
  const ing = wb.addWorksheet('Ingressos');
  ing.columns = [
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Import', key: 'import', width: 14, style: { numFmt: EUR } },
    { header: 'Concepte', key: 'concepte', width: 16 },
    { header: 'Descripció', key: 'descripcio', width: 28 },
    { header: 'Mètode', key: 'metode', width: 14 },
    { header: 'Factura', key: 'factura', width: 12 },
  ];
  ing.getRow(1).font = { bold: true };
  for (const c of cobraments) {
    ing.addRow({
      data: fmtData(c.data),
      import: Number(c.import),
      concepte: CONCEPTE_LINIA_LABELS[c.concepte],
      descripcio: c.descripcio ?? '',
      metode: METODE_COBRAMENT_LABELS[c.metode],
      factura: c.factura?.numero ?? '',
    });
  }

  // --- Despeses ---
  const desp = wb.addWorksheet('Despeses');
  desp.columns = [
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Import', key: 'import', width: 14, style: { numFmt: EUR } },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Proveïdor', key: 'proveidor', width: 22 },
    { header: 'Descripció', key: 'descripcio', width: 28 },
    { header: 'Mètode', key: 'metode', width: 14 },
  ];
  desp.getRow(1).font = { bold: true };
  for (const g of gastos) {
    desp.addRow({
      data: fmtData(g.data),
      import: Number(g.import),
      categoria: g.categoria?.nom ?? '',
      proveidor: g.proveidor?.nom ?? '',
      descripcio: g.descripcio,
      metode: METODE_COBRAMENT_LABELS[g.metodePagament],
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
