/**
 * PDF "fidel a pantalla": la pàgina envia la seva maquetació (caixes, línies, paraules
 * i imatges amb coordenades ja en punts d'una pàgina A4) i aquí es dibuixa tal qual
 * amb pdf-lib. Serveix per a documents de taula com el llibre de registre, on el
 * navegador no hauria d'afegir URL/data/numeració. Vegeu `layout-script.ts`.
 */
import 'server-only';
import { z } from 'zod';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const n = z.number().finite();

const Item = z.discriminatedUnion('k', [
  z.object({ k: z.literal('b'), x: n, y: n, w: n, h: n, f: hex }),
  z.object({ k: z.literal('l'), x1: n, y1: n, x2: n, y2: n, lw: n, c: hex }),
  z.object({
    k: z.literal('t'),
    x: n,
    y: n,
    w: n,
    h: n,
    t: z.string().max(400),
    sz: n,
    b: z.boolean(),
    c: hex,
  }),
  z.object({ k: z.literal('i'), x: n, y: n, w: n, h: n, src: z.string().max(2_000_000) }),
]);

export const LayoutPdfSchema = z.object({
  ref: z.string().max(80).default(''),
  title: z.string().max(120).default('Document'),
  pages: z.array(z.object({ items: z.array(Item).max(20000) })).min(1).max(40),
});
export type LayoutPdf = z.infer<typeof LayoutPdfSchema>;

const PAGE_W = 595.28;
const PAGE_H = 841.89;

function clean(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\x7E¡-ÿ€]/g, '?');
}

function color(h: string) {
  const v = parseInt(h.slice(1), 16);
  return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
}

export async function buildLayoutPdf(d: LayoutPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const pg of d.pages) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    for (const it of pg.items) {
      if (it.k === 'b') {
        page.drawRectangle({ x: it.x, y: PAGE_H - it.y - it.h, width: it.w, height: it.h, color: color(it.f) });
      } else if (it.k === 'l') {
        page.drawLine({
          start: { x: it.x1, y: PAGE_H - it.y1 },
          end: { x: it.x2, y: PAGE_H - it.y2 },
          thickness: it.lw,
          color: color(it.c),
        });
      } else if (it.k === 't') {
        const t = clean(it.t);
        if (!t) continue;
        const font = it.b ? sansB : sans;
        const cy = it.y + it.h / 2;
        page.drawText(t, { x: it.x, y: PAGE_H - cy - it.sz * 0.35, size: it.sz, font, color: color(it.c) });
      } else {
        const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(it.src);
        if (!m) continue;
        try {
          const bytes = Buffer.from(m[2] ?? '', 'base64');
          const img = m[1] === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
          page.drawImage(img, { x: it.x, y: PAGE_H - it.y - it.h, width: it.w, height: it.h });
        } catch {
          // imatge il·legible: s'omet
        }
      }
    }
  }
  return pdf.save();
}
