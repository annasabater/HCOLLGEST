/**
 * Renderitza al servidor (pdf-lib) qualsevol document imprimible (factura simple,
 * factura fiscal, rebut de fiança, pressupost) a partir del que hi ha A PANTALLA.
 * La pàgina envia el seu contingut (veure `client-script.ts`) i aquí es dibuixa un
 * PDF net: sense capçalera ni peu del navegador (URL, data, "Pàgina 1 de 1").
 */
import 'server-only';
import { z } from 'zod';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';

const str = (max: number) => z.string().max(max);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const DocPdfSchema = z.object({
  ref: str(80).default(''),
  title: str(120).default('Document'),
  accent: hex.default('#7A1F2B'),
  ink: hex.default('#2C1810'),
  brand: str(120).default('HOSTAL COLL'),
  brandSub: str(160).default(''),
  issuer: z.array(str(200)).max(12).default([]),
  billLabel: str(60).default('Client'),
  bill: z.array(str(300)).max(12).default([]),
  docTitle: str(60).default(''),
  badge: str(80).default(''),
  meta: z.array(z.object({ k: str(60), v: str(120) })).max(10).default([]),
  cols: z
    .array(z.object({ label: str(60), kind: z.enum(['qty', 'text', 'amt']) }))
    .min(1)
    .max(6),
  rows: z
    .array(z.object({ cells: z.array(str(1000)).max(6), detail: str(1000).optional() }))
    .max(200),
  summary: z.array(z.object({ label: str(120), value: str(60), grand: z.boolean().default(false) })).max(10).default([]),
  extra: z
    .object({
      title: str(120),
      rows: z.array(z.object({ k: str(200), v: str(60) })).max(20),
      total: z.object({ k: str(120), v: str(60) }).optional(),
    })
    .optional(),
  notes: z.object({ label: str(80), text: str(3000) }).optional(),
  pay: z.object({ label: str(40), value: str(120) }).optional(),
  qr: z
    .object({ png: str(400_000), lines: z.array(str(400)).max(6) })
    .optional(),
});
export type DocPdf = z.infer<typeof DocPdfSchema>;

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 50;
const MUTED = rgb(0.48, 0.41, 0.41);
const RULE = rgb(0.88, 0.85, 0.84);

function color(h: string) {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Helvetica/Times (WinAnsi) no codifiquen tots els caràcters.
function clean(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\n\x20-\x7E¡-ÿ€]/g, '?');
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split('\n')) {
    let cur = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = cur ? `${cur} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxW) cur = test;
      else {
        if (cur) out.push(cur);
        cur = word;
      }
    }
    out.push(cur);
  }
  return out;
}

export async function buildDocPdf(d: DocPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const INK = color(d.ink);
  const ACC = color(d.accent);
  const SOFT = rgb(
    1 - (1 - ACC.red) * 0.12,
    1 - (1 - ACC.green) * 0.12,
    1 - (1 - ACC.blue) * 0.12,
  );
  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  const xR = PAGE_W - M;

  const right = (text: string, x: number, y: number, font: PDFFont, size: number, col = INK) => {
    const t = clean(text);
    page.drawText(t, { x: x - font.widthOfTextAtSize(t, size), y, size, font, color: col });
  };
  const spaced = (s: string) => clean(s.toUpperCase()).split('').join(' ');

  // ── Capçalera ───────────────────────────────────────────────────────────
  let y = PAGE_H - M - 26;
  page.drawText(clean(d.brand), { x: M, y, size: 30, font: serif, color: INK });
  if (d.brandSub) page.drawText(spaced(d.brandSub), { x: M, y: y - 20, size: 7, font: sans, color: ACC });
  let ey = PAGE_H - M - 8;
  d.issuer.forEach((l, i) => {
    right(l, xR, ey, i === 0 ? sansB : sans, 9.5, i === 0 ? INK : MUTED);
    ey -= 14;
  });

  y -= 62;
  page.drawLine({ start: { x: M, y }, end: { x: xR, y }, thickness: 1.2, color: INK });
  page.drawLine({ start: { x: M, y: y - 3 }, end: { x: M + 50, y: y - 3 }, thickness: 2, color: ACC });

  // ── Client + dades del document ────────────────────────────────────────
  y -= 30;
  if (d.billLabel) page.drawText(spaced(d.billLabel), { x: M, y, size: 7, font: sans, color: MUTED });
  let cy = y - 18;
  d.bill.forEach((l, i) => {
    for (const w of wrap(l, i === 0 ? sansB : sans, i === 0 ? 12 : 10, 250)) {
      if (!w) continue;
      page.drawText(w, { x: M, y: cy, size: i === 0 ? 12 : 10, font: i === 0 ? sansB : sans, color: INK });
      cy -= i === 0 ? 15 : 13;
    }
  });

  if (d.docTitle) right(d.docTitle, xR, y - 8, serif, 24);
  if (d.badge) right(spaced(d.badge), xR, y - 24, sans, 7, ACC);
  let my = y - 52;
  for (const m of d.meta) {
    right(m.k.toUpperCase(), xR - 120, my, sans, 7, MUTED);
    right(m.v, xR, my, sansB, 10.5);
    my -= 15;
  }
  y = Math.min(cy, my) - 26;

  // ── Taula ──────────────────────────────────────────────────────────────
  const AMT_W = 85;
  const QTY_W = 38;
  const nAmt = d.cols.filter((c) => c.kind === 'amt').length;
  const nQty = d.cols.filter((c) => c.kind === 'qty').length;
  const textW = xR - M - nAmt * AMT_W - nQty * QTY_W - 10;
  // x d'inici de cada columna (les d'import s'alineen a la dreta de la seva cel·la).
  const colX: number[] = [];
  let x = M + 4;
  for (const c of d.cols) {
    colX.push(x);
    x += c.kind === 'qty' ? QTY_W : c.kind === 'amt' ? AMT_W : textW;
  }
  const amtRight = (i: number) => (colX[i] ?? 0) + AMT_W - 6;
  const tIdx = d.cols.findIndex((c) => c.kind === 'text');

  const header = () => {
    d.cols.forEach((c, i) => {
      if (c.kind === 'amt') right(c.label.toUpperCase(), amtRight(i), y, sansB, 7, MUTED);
      else page.drawText(clean(c.label.toUpperCase()), { x: colX[i], y, size: 7, font: sansB, color: MUTED });
    });
    page.drawLine({ start: { x: M, y: y - 8 }, end: { x: xR, y: y - 8 }, thickness: 1, color: INK });
    y -= 26;
  };
  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - M - 10;
  };
  header();

  for (const r of d.rows) {
    const concept = tIdx >= 0 ? wrap(r.cells[tIdx] ?? '', sansB, 10.5, textW - 8) : [];
    const detail = r.detail ? wrap(r.detail, sans, 9.5, textW - 8) : [];
    const h = Math.max(1, concept.length) * 14 + detail.length * 13 + 12;
    if (y - h < M + 110) {
      newPage();
      header();
    }
    const top = y;
    let ty = top;
    d.cols.forEach((c, i) => {
      const v = r.cells[i] ?? '';
      if (c.kind === 'amt') right(v, amtRight(i), top, sans, 10.5);
      else if (c.kind === 'qty') page.drawText(clean(v), { x: (colX[i] ?? 0) + 6, y: top, size: 10.5, font: sans, color: INK });
    });
    for (const w of concept) {
      page.drawText(w, { x: colX[tIdx], y: ty, size: 10.5, font: sansB, color: INK });
      ty -= 14;
    }
    if (concept.length === 0) ty -= 14;
    for (const w of detail) {
      page.drawText(w, { x: colX[tIdx], y: ty, size: 9.5, font: sans, color: MUTED });
      ty -= 13;
    }
    y = ty - 6;
    page.drawLine({ start: { x: M, y }, end: { x: xR, y }, thickness: 0.6, color: RULE });
    y -= 18;
  }

  // ── Resum (base, IVA, total…) ──────────────────────────────────────────
  const boxW = 230;
  const boxX = xR - boxW;
  const need = d.summary.reduce((a, s) => a + (s.grand ? 52 : 18), 0) + 10;
  if (y - need < M) newPage();
  for (const s of d.summary) {
    if (s.grand) {
      const bh = 40;
      y -= bh + 4;
      page.drawRectangle({ x: boxX, y, width: boxW, height: bh, color: SOFT });
      page.drawRectangle({ x: boxX, y: y + bh - 2, width: boxW, height: 2, color: ACC });
      page.drawText(clean(s.label), { x: boxX + 14, y: y + 14, size: 12, font: serif, color: INK });
      right(s.value, boxX + boxW - 14, y + 13, sansB, 15);
      y -= 10;
    } else {
      page.drawText(clean(s.label), { x: boxX + 14, y, size: 9.5, font: sans, color: MUTED });
      right(s.value, boxX + boxW - 14, y, sans, 10);
      y -= 18;
    }
  }

  // ── Blocs extra: fiança en custòdia, notes, IBAN, QR ───────────────────
  if (d.extra) {
    const need2 = 40 + d.extra.rows.length * 16;
    if (y - need2 < M) newPage();
    y -= 14;
    page.drawText(spaced(d.extra.title), { x: M, y, size: 7, font: sansB, color: ACC });
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: xR, y }, thickness: 0.6, color: RULE });
    for (const r of d.extra.rows) {
      y -= 16;
      page.drawText(clean(r.k), { x: M, y, size: 9.5, font: sans, color: INK });
      right(r.v, xR, y, sans, 10);
    }
    if (d.extra.total) {
      y -= 18;
      page.drawText(clean(d.extra.total.k), { x: M, y, size: 10, font: sansB, color: INK });
      right(d.extra.total.v, xR, y, sansB, 11);
    }
    y -= 10;
  }

  if (d.notes?.text.trim()) {
    const lines = wrap(d.notes.text, sans, 9.5, xR - M);
    if (y - (lines.length * 13 + 30) < M) newPage();
    y -= 22;
    page.drawText(spaced(d.notes.label), { x: M, y, size: 7, font: sans, color: MUTED });
    for (const l of lines) {
      y -= 13;
      page.drawText(l, { x: M, y, size: 9.5, font: sans, color: INK });
    }
    y -= 6;
  }

  if (d.pay) {
    if (y - 40 < M) newPage();
    y -= 28;
    page.drawText(spaced(d.pay.label), { x: M, y, size: 7, font: sans, color: MUTED });
    page.drawText(clean(d.pay.value), { x: M + 50, y, size: 10, font: sans, color: INK });
  }

  if (d.qr) {
    let img: PDFImage | null = null;
    try {
      const b64 = d.qr.png.replace(/^data:image\/png;base64,/, '');
      img = await pdf.embedPng(Buffer.from(b64, 'base64'));
    } catch {
      img = null;
    }
    if (img) {
      const size = 78;
      if (y - size - 20 < M) newPage();
      y -= size + 22;
      page.drawImage(img, { x: M, y, width: size, height: size });
      let qy = y + size - 10;
      for (const l of d.qr.lines) {
        for (const w of wrap(l, sans, 8, xR - M - size - 16)) {
          page.drawText(w, { x: M + size + 14, y: qy, size: 8, font: sans, color: MUTED });
          qy -= 11;
        }
      }
    }
  }

  return pdf.save();
}
