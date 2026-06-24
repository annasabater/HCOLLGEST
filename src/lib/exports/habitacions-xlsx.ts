/** Full de càlcul de les habitacions (acumulatiu, es reescriu cada mes). */
import 'server-only';
import ExcelJS from 'exceljs';
import { prisma } from './../db';

export async function buildHabitacionsXlsx(): Promise<Buffer> {
  const habitacions = await prisma.habitacio.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hostal Coll — Gestió';
  const ws = wb.addWorksheet('Habitacions');
  ws.columns = [
    { header: 'Habitació', key: 'nom', width: 16 },
    { header: 'Tipus', key: 'tipus', width: 18 },
    { header: 'Capacitat', key: 'capacitat', width: 12 },
    { header: 'Estat', key: 'estat', width: 16 },
    { header: 'Descripció', key: 'descripcio', width: 34 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const h of habitacions) {
    ws.addRow({
      nom: h.nom,
      tipus: h.tipus ?? '',
      capacitat: h.capacitat ?? '',
      estat: h.estat ?? '',
      descripcio: h.descripcio ?? '',
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
