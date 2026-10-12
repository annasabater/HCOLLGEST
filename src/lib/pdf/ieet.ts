/**
 * PDF de la taxa turística d'un període de declaració (A4 horitzontal): capçalera
 * amb el període i el termini de pagament, resum amb l'import a pagar i la taula
 * de persones (les mateixes columnes que l'Excel; les dades que falten en taronja).
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { TIPUS_DOCUMENT_LABELS } from '../validation/enums';
import type { FilaIeet } from '../ieet';
import type { IeetPeriode } from '../services/ieet';

const PAG = { w: 841.89, h: 595.28 };
const M = 20;
const GRANAT = rgb(0.478, 0.122, 0.169);
const INK = rgb(0.1, 0.1, 0.12);
const GRIS = rgb(0.45, 0.45, 0.48);
const LINIA = rgb(0.87, 0.85, 0.83);
const TARONJA = rgb(0.99, 0.89, 0.84);
const CREMA = rgb(0.98, 0.96, 0.94);

const dataEs = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

interface Col { h: string; w: number; v: (f: FilaIeet) => string; falta?: string; dreta?: true }
const COLS: Col[] = [
  { h: 'Contracte', w: 38, v: (f) => f.contracte },
  { h: 'Hab.', w: 20, v: (f) => f.habitacio, falta: 'habitació' },
  { h: 'Entrada', w: 40, v: (f) => dataEs(f.entrada) },
  { h: 'Sortida', w: 40, v: (f) => dataEs(f.sortida) },
  { h: 'Nits', w: 20, v: (f) => String(f.nitsEstada), dreta: true },
  { h: 'Pag.', w: 24, v: (f) => String(f.nitsPaguen), dreta: true },
  { h: 'Cognoms i nom', w: 95, v: (f) => f.nom },
  { h: 'Doc.', w: 28, v: (f) => (f.tipusDocument ? (TIPUS_DOCUMENT_LABELS[f.tipusDocument as keyof typeof TIPUS_DOCUMENT_LABELS] ?? f.tipusDocument).replace('Passaport', 'Pass.').replace('Altres documents', 'Altres') : ''), falta: 'document' },
  { h: 'Núm. doc.', w: 50, v: (f) => f.numDocument, falta: 'document' },
  { h: 'Nacionalitat', w: 42, v: (f) => f.nacionalitat, falta: 'nacionalitat' },
  { h: 'Naixement', w: 40, v: (f) => dataEs(f.dataNaixement), falta: 'data de naixement' },
  { h: 'Edat', w: 22, v: (f) => (f.edat == null ? '' : String(f.edat)), dreta: true },
  { h: 'Domicili', w: 73, v: (f) => f.adreca, falta: 'domicili' },
  { h: 'CP', w: 24, v: (f) => f.codiPostal },
  { h: 'Municipi', w: 52, v: (f) => f.municipi, falta: 'municipi' },
  { h: 'País', w: 40, v: (f) => f.pais, falta: 'país' },
  { h: 'Telèfon', w: 50, v: (f) => f.telefon, falta: 'telèfon' },
  { h: 'Correu electrònic', w: 70, v: (f) => f.email, falta: 'correu' },
  { h: 'Import', w: 34, v: (f) => (f.import ? eur(f.import) : '-'), dreta: true },
];

/** Deixa només els caràcters que la font estàndard (WinAnsi) pot dibuixar. */
function netejador(font: PDFFont) {
  const ok = new Set(font.getCharacterSet());
  return (s: string) =>
    [...(s ?? '')]
      .map((c) => {
        if (ok.has(c.codePointAt(0)!)) return c;
        const base = c.normalize('NFD')[0] ?? ''; // lletra sense l'accent (p. ex. ă → a)
        return base && ok.has(base.codePointAt(0)!) ? base : '?';
      })
      .join('');
}

/** Retalla el text amb «…» perquè càpiga a l'amplada. */
function retalla(s: string, w: number, font: PDFFont, size: number): string {
  if (font.widthOfTextAtSize(s, size) <= w) return s;
  let t = s;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > w) t = t.slice(0, -1);
  return `${t}…`;
}

export async function buildIeetPdf(d: IeetPeriode, establiment: { nom: string; nif: string | null }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const net = netejador(font);
  const p = d.periode;
  const fs = 6.6;
  const rowH = 13;

  let page: PDFPage = doc.addPage([PAG.w, PAG.h]);
  let y = PAG.h;
  const text = (s: string, x: number, yy: number, size: number, f = font, color = INK) =>
    page.drawText(net(s), { x, y: yy, size, font: f, color });

  // ── Capçalera ──
  page.drawRectangle({ x: 0, y: PAG.h - 58, width: PAG.w, height: 58, color: GRANAT });
  text(`Taxa turística (IEET) · ${p.etiqueta}`, M, PAG.h - 30, 17, bold, rgb(1, 1, 1));
  text(
    `${establiment.nom}${establiment.nif ? ` · NIF ${establiment.nif}` : ''} · estades amb entrada del ${dataEs(p.inici)} al ${dataEs(p.fi)} · termini de pagament: del ${dataEs(p.pagamentDes)} al ${dataEs(p.pagamentFins)}`,
    M, PAG.h - 47, 8.5, font, rgb(0.95, 0.87, 0.88),
  );
  y = PAG.h - 72;

  // ── Resum ──
  const resum: [string, string][] = [
    ['Persones', String(d.resum.persones)],
    ['Persones que paguen', String(d.resum.personesPaguen)],
    ['Nits que paguen', String(d.resum.nitsPaguen)],
    ['Tarifa', `${eur(d.config.tarifa)} / persona i nit`],
    ['Màxim', `${d.config.maxNits} nits (primera estada)`],
    ['Paguen a partir de', `${d.config.edatMinima} anys`],
  ];
  page.drawRectangle({ x: M, y: y - 34, width: PAG.w - 2 * M, height: 34, color: CREMA });
  let x = M + 10;
  for (const [k, v] of resum) {
    text(k, x, y - 13, 6.8, font, GRIS);
    text(v, x, y - 26, 9, bold);
    x += Math.max(font.widthOfTextAtSize(k, 6.8), bold.widthOfTextAtSize(v, 9)) + 22;
  }
  const imp = eur(d.resum.import);
  const iw = bold.widthOfTextAtSize(imp, 15);
  text('IMPORT A PAGAR', PAG.w - M - 10 - Math.max(iw, font.widthOfTextAtSize('IMPORT A PAGAR', 6.8)), y - 13, 6.8, font, GRIS);
  text(imp, PAG.w - M - 10 - iw, y - 29, 15, bold, GRANAT);
  y -= 48;

  // ── Taula ──
  const capcalera = () => {
    page.drawRectangle({ x: M, y: y - rowH, width: PAG.w - 2 * M, height: rowH, color: GRANAT });
    let cx = M;
    for (const c of COLS) {
      const s = retalla(net(c.h), c.w - 4, bold, fs);
      const tx = c.dreta ? cx + c.w - 6 - bold.widthOfTextAtSize(s, fs) : cx + 2;
      text(s, tx, y - rowH + 4, fs, bold, rgb(1, 1, 1));
      cx += c.w;
    }
    y -= rowH;
  };
  const novaPagina = () => {
    page = doc.addPage([PAG.w, PAG.h]);
    y = PAG.h - M;
    text(`Taxa turística (IEET) · ${p.etiqueta} (continuació)`, M, y - 9, 9, bold, GRANAT);
    y -= 18;
    capcalera();
  };

  capcalera();
  if (d.files.length === 0) {
    text('Encara no hi ha cap estada acabada amb contracte en aquest període.', M + 2, y - 14, 9, font, GRIS);
    y -= 20;
  }
  for (const f of d.files) {
    if (y - rowH < M + 26) novaPagina();
    let cx = M;
    for (const c of COLS) {
      const falta = !!c.falta && f.falten.includes(c.falta);
      if (falta) page.drawRectangle({ x: cx, y: y - rowH, width: c.w, height: rowH, color: TARONJA });
      const s = retalla(net(falta ? 'falta' : c.v(f)), c.w - 4, font, fs);
      const tx = c.dreta ? cx + c.w - 6 - font.widthOfTextAtSize(s, fs) : cx + 2;
      text(s, tx, y - rowH + 4, fs, font, falta ? rgb(0.6, 0.3, 0.1) : INK);
      cx += c.w;
    }
    page.drawLine({ start: { x: M, y: y - rowH }, end: { x: PAG.w - M, y: y - rowH }, thickness: 0.4, color: LINIA });
    y -= rowH;
  }

  // Total
  if (d.files.length > 0) {
    if (y - rowH < M + 26) novaPagina();
    page.drawRectangle({ x: M, y: y - rowH - 2, width: PAG.w - 2 * M, height: rowH + 2, color: CREMA });
    text('TOTAL A PAGAR', M + 4, y - rowH + 3, 7.5, bold);
    const t = net(imp);
    text(t, PAG.w - M - 2 - bold.widthOfTextAtSize(t, 7.5), y - rowH + 3, 7.5, bold);
    y -= rowH + 8;
  }

  // Peu a totes les pàgines
  const pagines = doc.getPages();
  const nota = 'Només paga la primera estada (les continuacions i ampliacions no surten). Menors de l’edat mínima a 0 €. Cel·les taronja: dada que falta a la fitxa.';
  pagines.forEach((pg, i) => {
    pg.drawText(net(nota), { x: M, y: 12, size: 6.5, font, color: GRIS });
    const n = net(`Pàgina ${i + 1} de ${pagines.length} · generat el ${dataEs(new Date().toISOString().slice(0, 10))}`);
    pg.drawText(n, { x: PAG.w - M - font.widthOfTextAtSize(n, 6.5), y: 12, size: 6.5, font, color: GRIS });
  });

  return doc.save();
}
