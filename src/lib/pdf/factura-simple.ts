/**
 * Genera la factura simplificada en PDF al servidor (pdf-lib). A diferència
 * d'imprimir des del navegador, el PDF no porta capçalera ni peu del navegador
 * (URL, data, "Pàgina 1 de 1").
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type FacturaPdfLinia = { descripcio: string; detall?: string; import: number };

export type FacturaPdfDades = {
  emissor: { titular: string; nif: string; adreca: string; localitat: string; descriptor: string };
  client: { nom: string; nif: string; adreca: string; localitat: string };
  numero: string;
  data: string;
  habitacio: string;
  linies: FacturaPdfLinia[];
  total: number;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const INK = rgb(0.17, 0.09, 0.06);
const MUTED = rgb(0.48, 0.41, 0.41);
const BRAND = rgb(0.478, 0.122, 0.169);
const BRAND_SOFT = rgb(0.96, 0.9, 0.91);
const RULE = rgb(0.88, 0.85, 0.84);

// Helvetica/Times (WinAnsi) no codifiquen tots els caràcters: substitueix els dubtosos.
function sanitize(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\n\x20-\x7E -ÿ€]/g, '?');
}

function euros(n: number): string {
  return (
    n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }) + ' €'
  );
}
function plain(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of sanitize(text).split('\n')) {
    let cur = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = cur ? `${cur} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxW) {
        cur = test;
      } else {
        if (cur) out.push(cur);
        cur = word;
      }
    }
    out.push(cur);
  }
  return out;
}

function right(page: PDFPage, text: string, xRight: number, y: number, font: PDFFont, size: number, color = INK) {
  const t = sanitize(text);
  page.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y, size, font, color });
}

export async function buildFacturaSimplePdf(d: FacturaPdfDades): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  const xR = PAGE_W - MARGIN;

  // Capçalera: marca a l'esquerra, emissor a la dreta.
  let y = PAGE_H - MARGIN - 26;
  page.drawText('HOSTAL COLL', { x: MARGIN, y, size: 30, font: serif, color: INK });
  page.drawText(sanitize(d.emissor.descriptor.toUpperCase().split('').join(' ')), {
    x: MARGIN,
    y: y - 20,
    size: 7.5,
    font: sans,
    color: BRAND,
  });
  let ey = PAGE_H - MARGIN - 8;
  right(page, d.emissor.titular, xR, ey, sansB, 9.5);
  for (const l of [d.emissor.nif, d.emissor.adreca, d.emissor.localitat]) {
    ey -= 14;
    right(page, l, xR, ey, sans, 9.5, MUTED);
  }

  y -= 62;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: xR, y }, thickness: 1.2, color: INK });
  page.drawLine({ start: { x: MARGIN, y: y - 3 }, end: { x: MARGIN + 50, y: y - 3 }, thickness: 2, color: BRAND });

  // Client (esquerra) i capçalera del document (dreta).
  y -= 30;
  page.drawText('CLIENT', { x: MARGIN, y, size: 7.5, font: sans, color: MUTED });
  let cy = y - 18;
  if (d.client.nom) {
    page.drawText(sanitize(d.client.nom), { x: MARGIN, y: cy, size: 12, font: sansB, color: INK });
    cy -= 15;
  }
  for (const l of [d.client.nif, d.client.adreca, d.client.localitat]) {
    if (!l) continue;
    for (const w of wrap(l, sans, 10, 250)) {
      page.drawText(w, { x: MARGIN, y: cy, size: 10, font: sans, color: INK });
      cy -= 13;
    }
  }

  right(page, 'Factura', xR, y - 8, serif, 24);
  right(page, 'S I M P L I F I C A D A', xR, y - 24, sans, 7.5, BRAND);
  const meta: Array<[string, string]> = [
    ['NÚMERO', d.numero],
    ['DATA', d.data],
  ];
  if (d.habitacio) meta.push(['HABITACIÓ', d.habitacio]);
  let my = y - 52;
  for (const [k, v] of meta) {
    right(page, k, xR - 110, my, sans, 7.5, MUTED);
    right(page, v, xR, my, sansB, 10.5);
    my -= 15;
  }

  y = Math.min(cy, my) - 26;

  // Taula de línies.
  const colQty = MARGIN + 4;
  const colConcept = MARGIN + 44;
  const colPriceR = xR - 90;
  const colAmtR = xR - 4;
  const conceptW = colPriceR - 70 - colConcept;
  const header = () => {
    page.drawText('CANT.', { x: colQty, y, size: 7.5, font: sansB, color: MUTED });
    page.drawText('CONCEPTE', { x: colConcept, y, size: 7.5, font: sansB, color: MUTED });
    right(page, 'PREU (€)', colPriceR, y, sansB, 7.5, MUTED);
    right(page, 'IMPORT (€)', colAmtR, y, sansB, 7.5, MUTED);
    page.drawLine({ start: { x: MARGIN, y: y - 8 }, end: { x: xR, y: y - 8 }, thickness: 1, color: INK });
    y -= 26;
  };
  header();

  for (const l of d.linies) {
    const concept = wrap(l.descripcio, sansB, 10.5, conceptW);
    const detail = l.detall ? wrap(l.detall, sans, 9.5, conceptW) : [];
    const h = concept.length * 14 + detail.length * 13 + 12;
    if (y - h < MARGIN + 120) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN - 10;
      header();
    }
    const top = y;
    page.drawText('1', { x: colQty + 6, y: top, size: 10.5, font: sans, color: INK });
    let ty = top;
    for (const w of concept) {
      page.drawText(w, { x: colConcept, y: ty, size: 10.5, font: sansB, color: INK });
      ty -= 14;
    }
    for (const w of detail) {
      page.drawText(w, { x: colConcept, y: ty, size: 9.5, font: sans, color: MUTED });
      ty -= 13;
    }
    right(page, plain(l.import), colPriceR, top, sans, 10.5);
    right(page, plain(l.import), colAmtR, top, sans, 10.5);
    y = ty - 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: xR, y }, thickness: 0.6, color: RULE });
    y -= 18;
  }

  // Total.
  if (y - 60 < MARGIN) {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN - 10;
  }
  const boxW = 230;
  const boxH = 44;
  const boxX = xR - boxW;
  const boxY = y - boxH - 6;
  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: BRAND_SOFT });
  page.drawRectangle({ x: boxX, y: boxY + boxH - 2, width: boxW, height: 2, color: BRAND });
  page.drawText('Total', { x: boxX + 14, y: boxY + 16, size: 12, font: serif, color: INK });
  right(page, euros(d.total), boxX + boxW - 14, boxY + 14, sansB, 16);

  return pdf.save();
}
