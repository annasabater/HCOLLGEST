/**
 * Full de càlcul ACUMULATIU de tots els hostes (clients) del CRM, per a l'export
 * mensual a Drive. Conté tots els hostes (no esborrats), amb nombre de visites i
 * data de l'última estada. S'actualitza cada mes (es reescriu sencer).
 */
import 'server-only';
import ExcelJS from 'exceljs';
import { prisma } from './../db';

const TIPUS_DOC: Record<string, string> = {
  DNI_NIF: 'DNI/NIF',
  NIE: 'NIE',
  PASSAPORT: 'Passaport',
  ALTRES: 'Altres',
};

function fmt(d: Date | null): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('ca-ES').format(d);
}

export async function buildHostesXlsx(): Promise<Buffer> {
  const hostes = await prisma.huesped.findMany({
    where: { deletedAt: null },
    orderBy: [{ cognom1: 'asc' }, { nom: 'asc' }],
    include: {
      estancies: { select: { estancia: { select: { dataEntrada: true, deletedAt: true } } } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hostal Coll — Gestió';
  const ws = wb.addWorksheet('Hostes');

  ws.columns = [
    { header: 'Cognoms', key: 'cognoms', width: 26 },
    { header: 'Nom', key: 'nom', width: 18 },
    { header: 'Document', key: 'doc', width: 18 },
    { header: 'Telèfon', key: 'telefon', width: 16 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'Nacionalitat', key: 'nacionalitat', width: 14 },
    { header: 'Adreça', key: 'adreca', width: 28 },
    { header: 'Població', key: 'poblacio', width: 18 },
    { header: 'País', key: 'pais', width: 12 },
    { header: 'Visites', key: 'visites', width: 9 },
    { header: 'Última visita', key: 'ultima', width: 14 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const h of hostes) {
    const estades = h.estancies.map((v) => v.estancia).filter((e) => !e.deletedAt);
    const visites = estades.length;
    const ultima = estades.reduce<Date | null>((max, e) => {
      const d = e.dataEntrada;
      return !max || d > max ? d : max;
    }, null);
    const doc = h.numDocument
      ? `${TIPUS_DOC[h.tipusDocument ?? ''] ?? ''} ${h.numDocument}`.trim()
      : '';
    ws.addRow({
      cognoms: [h.cognom1, h.cognom2].filter(Boolean).join(' '),
      nom: h.nom,
      doc,
      telefon: h.telefon ?? '',
      email: h.email ?? '',
      nacionalitat: h.nacionalitat ?? '',
      adreca: h.adreca ?? '',
      poblacio: h.municipi || h.localitat || '',
      pais: h.pais ?? '',
      visites,
      ultima: fmt(ultima),
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
