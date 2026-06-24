/**
 * Còpia de seguretat completa en Excel (un full per taula). Versió llegible de
 * la còpia (la descàrrega JSON segueix sent la de recuperació tècnica).
 */
import 'server-only';
import ExcelJS from 'exceljs';
import { buildBackupPayload } from '../services/backup';

/** Converteix un valor de Prisma en una cel·la (Decimal→número, Date→ISO, etc.). */
function cell(v: unknown): string | number {
  if (v == null) return '';
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof v === 'object') {
    const dec = v as { toNumber?: () => number };
    if (typeof dec.toNumber === 'function') return dec.toNumber();
    return JSON.stringify(v);
  }
  return String(v);
}

export async function buildBackupXlsx(): Promise<Buffer> {
  const payload = await buildBackupPayload();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hostal Coll — Gestió';

  for (const [name, rows] of Object.entries(payload.tables)) {
    const ws = wb.addWorksheet(name.slice(0, 31));
    const list = rows as Record<string, unknown>[];
    if (list.length === 0) {
      ws.addRow(['(sense dades)']);
      continue;
    }
    const cols = Object.keys(list[0]!);
    ws.addRow(cols);
    ws.getRow(1).font = { bold: true };
    for (const r of list) {
      ws.addRow(cols.map((c) => cell(r[c])));
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function backupXlsxFilename(date = new Date()): string {
  return `backup-hostalcoll-${date.toISOString().slice(0, 10)}.xlsx`;
}
