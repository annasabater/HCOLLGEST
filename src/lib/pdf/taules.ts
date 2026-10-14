/**
 * PDF de documents de TAULES (p. ex. el llibre d'IVA del trimestre) en A4
 * HORITZONTAL, amb la taula estirada a TOT l'ample del full. La pàgina envia les
 * taules tal com es veuen a pantalla (columnes visibles, valors editats, totals i
 * resums) i aquí es dibuixen amb pdf-lib: cada full comença pàgina, i si una
 * taula no hi cap continua a la següent repetint la capçalera de columnes.
 * Vegeu `taules-script.ts`.
 */
import 'server-only';
import { z } from 'zod';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const txt = z.string().max(300);

export const TaulesPdfSchema = z.object({
  titol: z.string().max(120).default('Document'),
  fulls: z
    .array(
      z.object({
        titol: txt,
        periode: txt.default(''),
        cols: z.array(z.object({ label: txt, num: z.boolean(), w: z.number().positive().max(2000) })).min(1).max(24),
        files: z.array(z.array(txt).max(24)).max(3000),
        peu: z.array(z.object({ t: txt, span: z.number().int().min(1).max(24), num: z.boolean() })).max(24).default([]),
        resum: z.array(z.object({ k: txt, v: txt, grand: z.boolean() })).max(12).default([]),
      }),
    )
    .min(1)
    .max(12),
});
export type TaulesPdf = z.infer<typeof TaulesPdfSchema>;

const PW = 841.89;
const PH = 595.28;
const M = 28;
const UTIL = PW - 2 * M;

const INK = rgb(0.173, 0.094, 0.063); // #2C1810
const SLATE = rgb(0.235, 0.157, 0.157); // #3C2828
const MUTED = rgb(0.478, 0.408, 0.408); // #7A6868
const LINE = rgb(0.898, 0.847, 0.835); // #E5D8D5
const ACCENT = rgb(0.478, 0.122, 0.169); // #7A1F2B
const ACCENT_SOFT = rgb(0.969, 0.933, 0.925); // #F7EEEC

const COS = 8.5; // mida del text de les files
const COS_MIN = 6.5;
const COS_CAP = 7;
const ALT_FILA = 15;
const PAD = 3;

/** Només caràcters que les fonts estàndard (WinAnsi) saben dibuixar. */
function net(s: string): string {
  return s
    .replace(/[​-‍﻿]/g, '')
    .replace(/[→]/g, '->')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF€…–—‘’“”•ŒœŠšŸŽžƒˆ˜†‡‰‹›™]/g, '')
    .trim();
}

/** Text que cap a `w`: primer redueix la mida (fins a COS_MIN) i, si no, el talla amb «…». */
function encaixa(t: string, f: PDFFont, cos: number, w: number): { t: string; cos: number } {
  if (f.widthOfTextAtSize(t, cos) <= w) return { t, cos };
  const c = Math.max(COS_MIN, (cos * w) / f.widthOfTextAtSize(t, cos));
  if (f.widthOfTextAtSize(t, c) <= w) return { t, cos: c };
  let s = t;
  while (s.length > 1 && f.widthOfTextAtSize(`${s}…`, COS_MIN) > w) s = s.slice(0, -1);
  return { t: `${s}…`, cos: COS_MIN };
}

/** Parteix una etiqueta de capçalera en línies que càpiguen a `w` (màx. 3). */
function linies(t: string, f: PDFFont, cos: number, w: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const p of t.split(' ')) {
    const prova = cur ? `${cur} ${p}` : p;
    if (!cur || f.widthOfTextAtSize(prova, cos) <= w) cur = prova;
    else {
      out.push(cur);
      cur = p;
    }
  }
  if (cur) out.push(cur);
  return out.slice(0, 3);
}

export async function buildTaulesPdf(d: TaulesPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(net(d.titol));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const peusPagina: { page: PDFPage; full: string; periode: string }[] = [];

  for (const full of d.fulls) {
    const titol = net(full.titol);
    const periode = net(full.periode);
    const totalW = full.cols.reduce((a, c) => a + c.w, 0);
    const ws = full.cols.map((c) => (c.w / totalW) * UTIL);
    const xs = ws.map((_, i) => M + ws.slice(0, i).reduce((a, b) => a + b, 0));
    const caps = full.cols.map((c, i) => linies(net(c.label), bold, COS_CAP, ws[i]! - 2 * PAD));
    const altCap = Math.max(...caps.map((l) => l.length)) * (COS_CAP + 1.5) + 6;

    let page!: PDFPage;
    let y = 0;

    const text = (t: string, x: number, yy: number, w: number, num: boolean, f: PDFFont, cos: number, color = SLATE) => {
      if (!t) return;
      const e = encaixa(t, f, cos, w - 2 * PAD);
      const tw = f.widthOfTextAtSize(e.t, e.cos);
      page.drawText(e.t, { x: num ? x + w - PAD - tw : x + PAD, y: yy, size: e.cos, font: f, color });
    };
    const centrat = (t: string, yy: number, f: PDFFont, cos: number, color: typeof INK) => {
      const tw = f.widthOfTextAtSize(t, cos);
      page.drawText(t, { x: (PW - tw) / 2, y: yy, size: cos, font: f, color });
    };

    const capcalera = () => {
      for (let i = 0; i < full.cols.length; i++) {
        const c = full.cols[i]!;
        caps[i]!.forEach((l, j) => {
          const yy = y - altCap + 6 + (caps[i]!.length - 1 - j) * (COS_CAP + 1.5);
          const tw = bold.widthOfTextAtSize(l, COS_CAP);
          page.drawText(l, { x: c.num ? xs[i]! + ws[i]! - PAD - tw : xs[i]! + PAD, y: yy, size: COS_CAP, font: bold, color: MUTED });
        });
      }
      y -= altCap;
      page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 1.1, color: INK });
    };

    const novaPagina = (primera: boolean) => {
      page = doc.addPage([PW, PH]);
      peusPagina.push({ page, full: titol, periode });
      y = PH - M;
      if (primera) {
        page.drawText('HOSTAL COLL', { x: M, y: y - 20, size: 20, font: serif, color: INK });
        page.drawText('C A S A   D E   H O S T E S   ·   C A L E L L A', { x: M, y: y - 32, size: 6.5, font, color: ACCENT });
        y -= 42;
        page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 1.1, color: INK });
        page.drawLine({ start: { x: M, y: y - 3 }, end: { x: M + 40, y: y - 3 }, thickness: 2.5, color: ACCENT });
        y -= 20;
        if (periode) centrat(periode.toUpperCase(), y, bold, 9, INK);
        y -= 15;
        centrat(titol.toUpperCase(), y, bold, 10.5, ACCENT);
        y -= 14;
      } else {
        page.drawText(`${titol}${periode ? ` · ${periode}` : ''} (continuació)`, { x: M, y: y - 9, size: 9, font: bold, color: ACCENT });
        y -= 18;
      }
      capcalera();
    };

    novaPagina(true);

    const limit = M + 18;
    for (const fila of full.files) {
      if (y - ALT_FILA < limit) novaPagina(false);
      const base = y - ALT_FILA + 4.5;
      fila.forEach((v, i) => {
        if (i < full.cols.length) text(net(v), xs[i]!, base, ws[i]!, full.cols[i]!.num, font, COS);
      });
      y -= ALT_FILA;
      page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.4, color: LINE });
    }

    if (full.peu.length > 0) {
      if (y - ALT_FILA - 6 < limit) novaPagina(false);
      page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 1.1, color: INK });
      y -= 4;
      const base = y - ALT_FILA + 4.5;
      let col = 0;
      for (const p of full.peu) {
        const x = xs[col] ?? M;
        const w = ws.slice(col, col + p.span).reduce((a, b) => a + b, 0);
        const t = net(p.t);
        // L'etiqueta («Total…») s'alinea a la dreta del seu tram, com a pantalla.
        text(p.num ? t : t.toUpperCase(), x, base, w, p.num || p.span > 1, bold, p.num ? COS : 7.5, INK);
        col += p.span;
      }
      y -= ALT_FILA;
    }

    if (full.resum.length > 0) {
      const RW = 250;
      const RX = PW - M - RW;
      y -= 10;
      for (const r of full.resum) {
        const h = r.grand ? 20 : 16;
        if (y - h < limit) novaPagina(false);
        if (r.grand) {
          page.drawRectangle({ x: RX, y: y - h, width: RW, height: h, color: ACCENT_SOFT });
          page.drawLine({ start: { x: RX, y }, end: { x: RX + RW, y }, thickness: 1.6, color: ACCENT });
        }
        const f = r.grand ? bold : font;
        const cos = r.grand ? 10 : 8.5;
        const base = y - h / 2 - cos / 3;
        page.drawText(net(r.k), { x: RX + 8, y: base, size: cos, font: f, color: r.grand ? INK : SLATE });
        const v = net(r.v);
        page.drawText(v, { x: RX + RW - 8 - f.widthOfTextAtSize(v, cos), y: base, size: cos, font: f, color: INK });
        y -= h;
      }
    }
  }

  // Peu de pàgina: document i número de pàgina.
  const n = peusPagina.length;
  peusPagina.forEach(({ page, full, periode }, i) => {
    page.drawText(`Hostal Coll · ${full}${periode ? ` · ${periode}` : ''}`, { x: M, y: M - 12, size: 7, font, color: MUTED });
    const t = `Pàgina ${i + 1} de ${n}`;
    page.drawText(t, { x: PW - M - font.widthOfTextAtSize(t, 7), y: M - 12, size: 7, font, color: MUTED });
  });

  return doc.save();
}
