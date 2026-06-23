/**
 * Generador genèric d'informes PDF (pdf-lib): títol, subtítol i seccions amb
 * llistes clau-valor o taules. Reutilitzable (p. ex. balanç comptable).
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const A4 = { w: 595.28, h: 841.89 };
const M = 50;
const GRANATE = rgb(0.478, 0.122, 0.169);
const INK = rgb(0.1, 0.1, 0.12);

function sanitize(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/€/g, ' EUR')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

export interface ReportSection {
  heading: string;
  kv?: [string, string][];
  table?: { headers: string[]; rows: string[][]; total?: string[] };
}

export async function buildReportPdf(
  title: string,
  subtitle: string,
  sections: ReportSection[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const usable = A4.w - M * 2;

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;

  const ensure = (need: number) => {
    if (y - need < M) {
      page = doc.addPage([A4.w, A4.h]);
      y = A4.h - M;
    }
  };
  const draw = (s: string, x: number, size: number, f = font, color = INK) =>
    page.drawText(sanitize(s), { x, y: y - size, size, font: f, color });

  // Capçalera
  page.drawRectangle({ x: 0, y: A4.h - 70, width: A4.w, height: 70, color: GRANATE });
  page.drawText(sanitize(title), { x: M, y: A4.h - 40, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText(sanitize(subtitle), { x: M, y: A4.h - 58, size: 10, font, color: rgb(0.93, 0.85, 0.86) });
  y = A4.h - 92;

  for (const sec of sections) {
    ensure(28);
    draw(sec.heading, M, 12, bold, GRANATE);
    y -= 20;

    if (sec.kv) {
      for (const [label, value] of sec.kv) {
        ensure(16);
        draw(label, M, 10);
        const vw = font.widthOfTextAtSize(sanitize(value), 10);
        draw(value, A4.w - M - vw, 10, bold);
        y -= 16;
      }
    }

    if (sec.table) {
      const { headers, rows, total } = sec.table;
      const n = headers.length;
      const col0 = usable * 0.18;
      const colW = (usable - col0) / (n - 1);
      const xOf = (i: number) => (i === 0 ? M : M + col0 + colW * (i - 1));
      const size = 8.5;

      const drawRow = (cells: string[], f = font, color = INK) => {
        ensure(15);
        cells.forEach((c, i) => {
          if (i === 0) {
            page.drawText(sanitize(c), { x: M, y: y - size, size, font: f, color });
          } else {
            const w = f.widthOfTextAtSize(sanitize(c), size);
            page.drawText(sanitize(c), { x: xOf(i) + colW - 4 - w, y: y - size, size, font: f, color });
          }
        });
        y -= 14;
      };

      drawRow(headers, bold, rgb(0.4, 0.4, 0.4));
      page.drawLine({ start: { x: M, y: y + 2 }, end: { x: A4.w - M, y: y + 2 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
      y -= 2;
      for (const r of rows) drawRow(r);
      if (total) {
        page.drawLine({ start: { x: M, y: y + 4 }, end: { x: A4.w - M, y: y + 4 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
        drawRow(total, bold);
      }
    }

    y -= 12;
  }

  return doc.save();
}
