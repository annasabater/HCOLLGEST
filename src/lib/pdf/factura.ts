/**
 * Generador PDF (pdf-lib) de la factura (simplificada o fiscal) amb l'estil de la
 * marca (granat, ink càlid), coherent amb la impressió HTML /imprimir/factura*.
 * Serveix per adjuntar la factura als correus (com els justificants). Usa els
 * imports i les sobreescriptures de client/emissor tal com estan desats a la
 * factura; el total és el de la base de dades (font de veritat).
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Establiment, Estancia, Factura, LiniaFactura, EstanciaViatger, Huesped } from '@prisma/client';
import { formatDate } from '../utils';

type FacturaAmb = Factura & {
  linies: LiniaFactura[];
  estancia: Estancia & {
    habitacio: { nom: string | null } | null;
    viatgers: (EstanciaViatger & { huesped: Huesped | null })[];
  };
};

const A4 = { w: 595.28, h: 841.89 };
const M = 50;
const INK = rgb(0.17, 0.09, 0.06);
const SLATE = rgb(0.24, 0.16, 0.16);
const ACCENT = rgb(0.478, 0.122, 0.169);
const MUTED = rgb(0.478, 0.408, 0.408);
const LINE = rgb(0.898, 0.847, 0.835);
const TINT = rgb(0.961, 0.925, 0.925);

function sanitize(s: string): string {
  // pdf-lib WinAnsi no admet alguns caràcters; substituïm els problemàtics.
  return (s ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/•/g, '·')
    .replace(/ /g, ' ');
}

function money(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function plain(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** Text alineat a la dreta acabant a `xRight`. */
function drawRight(page: PDFPage, text: string, xRight: number, y: number, size: number, font: PDFFont, color = INK) {
  const t = sanitize(text);
  page.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y, size, font, color });
}

export async function buildFacturaPdf(factura: FacturaAmb, establiment: Establiment | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);

  const esFiscal = factura.tipusDocument === 'FACTURA';
  const esRebut = factura.tipusDocument === 'RECIBO';

  // Emissor (amb sobreescriptures de la factura o config de l'establiment).
  const emNom = establiment?.raoSocial || establiment?.nom || 'Hostal Coll';
  const emDescriptor = establiment?.poblacio ? `Casa de Hostes · ${establiment.poblacio}` : 'Casa de Hostes · Calella';
  const emTitular = factura.emissorTitular || establiment?.facturaTitular || 'Elisabet Nualart Coll';
  const emNif = factura.emissorNif || `NIF ${establiment?.facturaNif || '38835174L'}`;
  const emAdreca = factura.emissorAdreca || establiment?.adreca || 'C/ Sant Isidre, 54';
  const emLocalitat =
    factura.emissorLocalitat ||
    [establiment?.codiPostal, establiment?.poblacio, establiment?.provincia ? `(${establiment.provincia})` : null]
      .filter(Boolean)
      .join(' ') ||
    '08370 Calella (Barcelona)';

  // Client (sobreescriptura o titular de l'estada).
  const titular = factura.estancia.viatgers.find((v) => v.esTitular)?.huesped ?? factura.estancia.viatgers[0]?.huesped ?? null;
  const clientNom = factura.clientNom ?? (titular ? [titular.nom, titular.cognom1, titular.cognom2].filter(Boolean).join(' ') : '');
  const clientNif = factura.clientNif ?? (titular?.numDocument ? `${titular.tipusDocument ?? 'DNI'} ${titular.numDocument}` : '');
  const clientAdreca = factura.clientAdreca ?? titular?.adreca ?? '';
  const clientLocalitat =
    factura.clientLocalitat ?? [titular?.codiPostal, titular?.municipi || titular?.localitat].filter(Boolean).join(' ');

  const numeroDisplay = factura.numero.replace(/^\d{4}-/, '');
  const habDates =
    factura.estancia.dataEntrada && factura.estancia.dataSortida
      ? `Del ${formatDate(factura.estancia.dataEntrada)} al ${formatDate(factura.estancia.dataSortida)}`
      : '';

  const page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;
  const right = A4.w - M;

  // ── Masthead
  page.drawText('HOSTAL COLL', { x: M, y: y - 26, size: 30, font: serif, color: INK });
  page.drawText(sanitize(emDescriptor.toUpperCase()), { x: M, y: y - 42, size: 8, font, color: ACCENT });
  // Emissor a la dreta
  let ey = y - 4;
  drawRight(page, emTitular, right, ey, 9.5, bold, SLATE); ey -= 14;
  for (const l of [emNif, emAdreca, emLocalitat].filter(Boolean)) {
    drawRight(page, l, right, ey, 9, font, MUTED); ey -= 13;
  }
  y -= 78;

  // ── Regle
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 1.5, color: INK });
  page.drawLine({ start: { x: M, y }, end: { x: M + 66, y }, thickness: 3, color: ACCENT });
  y -= 28;

  // ── Client (esq.) + Factura/meta (dreta)
  const topBloc = y;
  page.drawText('CLIENT', { x: M, y: topBloc - 9, size: 9, font, color: MUTED });
  page.drawText(sanitize(clientNom || '—'), { x: M, y: topBloc - 26, size: 13, font: bold, color: SLATE });
  let cy = topBloc - 42;
  for (const l of [clientNif, clientAdreca, clientLocalitat].filter(Boolean)) {
    page.drawText(sanitize(l), { x: M, y: cy, size: 9.5, font, color: MUTED }); cy -= 14;
  }

  // Bloc meta a la dreta
  const metaTitle = esRebut ? 'Rebut' : 'Factura';
  page.drawText(metaTitle, { x: right - serif.widthOfTextAtSize(metaTitle, 26), y: topBloc - 22, size: 26, font: serif, color: INK });
  const badge = esFiscal ? 'FACTURA FISCAL' : esRebut ? 'REBUT' : 'SIMPLIFICADA';
  drawRight(page, badge, right, topBloc - 36, 8.5, bold, ACCENT);
  let my = topBloc - 56;
  const metaRow = (k: string, v: string) => {
    drawRight(page, v, right, my, 10, bold, SLATE);
    drawRight(page, k.toUpperCase(), right - 110, my, 8.5, font, MUTED);
    my -= 16;
  };
  metaRow('Número', numeroDisplay);
  metaRow('Data', formatDate(factura.data));
  if (factura.estancia.habitacio?.nom) metaRow('Habitació', factura.estancia.habitacio.nom);

  y = Math.min(cy, my) - 18;

  // ── Capçalera de la taula
  // Columnes amb separació clara: el concepte s'ajusta fins a `conceptRight`,
  // deixant espai suficient abans del número de la columna PREU (evita que el
  // text del concepte es solapi amb l'import).
  const colConcept = M + 46;
  const colImport = right;
  const colPreu = right - 92;
  const conceptRight = colPreu - 60;
  page.drawText('CANT.', { x: M, y: y - 9, size: 8.5, font, color: MUTED });
  page.drawText('CONCEPTE', { x: colConcept, y: y - 9, size: 8.5, font, color: MUTED });
  drawRight(page, 'PREU (€)', colPreu, y - 9, 8.5, font, MUTED);
  drawRight(page, 'IMPORT (€)', colImport, y - 9, 8.5, font, MUTED);
  y -= 15;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 1.2, color: INK });
  y -= 6;

  // ── Línies
  for (const l of factura.linies) {
    let desc = sanitize(l.descripcio ?? l.concepte);
    if (l.concepte === 'ALLOTJAMENT' && habDates && !desc.includes('Del ')) desc = `${desc} · ${habDates}`;
    const lines = wrap(font, desc, 10, conceptRight - colConcept);
    const rowH = Math.max(lines.length * 13 + 8, 22);
    page.drawText('1', { x: M + 6, y: y - 12, size: 10, font, color: SLATE });
    lines.forEach((ln, i) => page.drawText(ln, { x: colConcept, y: y - 12 - i * 13, size: 10, font, color: SLATE }));
    drawRight(page, plain(Number(l.import)), colPreu, y - 12, 10, font, SLATE);
    drawRight(page, plain(Number(l.import)), colImport, y - 12, 10, font, SLATE);
    y -= rowH;
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: right, y: y + 4 }, thickness: 0.6, color: LINE });
  }

  // ── Total
  y -= 16;
  const boxX = right - 300;
  page.drawRectangle({ x: boxX, y: y - 30, width: 300, height: 42, color: TINT });
  page.drawLine({ start: { x: boxX, y: y + 12 }, end: { x: right, y: y + 12 }, thickness: 2, color: ACCENT });
  page.drawText('Total', { x: boxX + 16, y: y - 12, size: 15, font: serif, color: INK });
  drawRight(page, money(Number(factura.total)), right - 16, y - 14, 17, bold, INK);
  y -= 48;

  if (esFiscal && Number(factura.iva) > 0) {
    drawRight(page, `Base ${plain(Number(factura.base))} € · IVA ${plain(Number(factura.iva))} €`, right, y, 9, font, MUTED);
    y -= 16;
  }

  // ── Peu
  const label = `${emNom} · ${emNif}`;
  page.drawText(sanitize(label), { x: M, y: 40, size: 8, font, color: MUTED });

  return doc.save();
}
