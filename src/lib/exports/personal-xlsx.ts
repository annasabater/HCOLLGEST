/** Full de càlcul del personal: jornades del mes (hores i import per treballador). */
import 'server-only';
import ExcelJS from 'exceljs';
import { prisma } from './../db';

const EUR = '#,##0.00 €';
const fmtData = (d: Date) => new Intl.DateTimeFormat('ca-ES').format(d);

export async function buildPersonalXlsx(monthStart: Date, monthEnd: Date): Promise<Buffer> {
  const jornades = await prisma.jornada.findMany({
    where: { data: { gte: monthStart, lte: monthEnd } },
    include: { treballador: { select: { nom: true } } },
    orderBy: [{ data: 'asc' }],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hostal Coll — Gestió';
  const ws = wb.addWorksheet('Jornades');
  ws.columns = [
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Treballador', key: 'treballador', width: 22 },
    { header: 'Hores', key: 'hores', width: 10, style: { numFmt: '#,##0.00' } },
    { header: 'Preu/hora', key: 'preu', width: 12, style: { numFmt: EUR } },
    { header: 'Import', key: 'import', width: 12, style: { numFmt: EUR } },
    { header: 'Pagada', key: 'pagada', width: 10 },
  ];
  ws.getRow(1).font = { bold: true };

  let totalHores = 0;
  let totalImport = 0;
  for (const j of jornades) {
    totalHores += Number(j.hores);
    totalImport += Number(j.import);
    ws.addRow({
      data: fmtData(j.data),
      treballador: j.treballador.nom,
      hores: Number(j.hores),
      preu: Number(j.preuHora),
      import: Number(j.import),
      pagada: j.pagada ? 'Sí' : 'No',
    });
  }
  ws.addRow({});
  const total = ws.addRow({ treballador: 'TOTAL', hores: totalHores, import: totalImport });
  total.font = { bold: true };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
