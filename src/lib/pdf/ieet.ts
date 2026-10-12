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
const CREMA = rgb(0.98, 0.96, 0.94);

const dataEs = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

interface Col { h: string; v: (f: FilaIeet) => string; dreta?: true; flex?: true }
// Les amplades es calculen amb el contingut (amplesColumnes): les columnes curtes
// (dates, CP, document, telèfon…) no salten mai de línia; les «flex» (nom,
// domicili, municipi, correu) es reparteixen l'espai que queda i, si cal, fan dues línies.
const COLS: Col[] = [
  { h: 'Contracte', v: (f) => f.contracte },
  { h: 'Hab.', v: (f) => f.habitacio },
  { h: 'Entrada', v: (f) => dataEs(f.entrada) },
  { h: 'Sortida', v: (f) => dataEs(f.sortida) },
  { h: 'Nits', v: (f) => String(f.nitsPaguen), dreta: true },
  { h: 'Cognoms i nom', v: (f) => f.nom, flex: true },
  { h: 'Doc.', v: (f) => (f.tipusDocument ? (TIPUS_DOCUMENT_LABELS[f.tipusDocument as keyof typeof TIPUS_DOCUMENT_LABELS] ?? f.tipusDocument).replace('Passaport', 'Pass.').replace('Altres documents', 'Altres') : '') },
  { h: 'Núm. doc.', v: (f) => f.numDocument },
  { h: 'Nacionalitat', v: (f) => f.nacionalitat },
  { h: 'Naixement', v: (f) => dataEs(f.dataNaixement) },
  { h: 'Edat', v: (f) => (f.edat == null ? '' : String(f.edat)), dreta: true },
  { h: 'Domicili', v: (f) => f.adreca, flex: true },
  { h: 'CP', v: (f) => f.codiPostal },
  { h: 'Municipi', v: (f) => f.municipi, flex: true },
  { h: 'País', v: (f) => f.pais },
  { h: 'Telèfon', v: (f) => f.telefon },
  { h: 'Correu electrònic', v: (f) => f.email, flex: true },
  { h: 'Import', v: (f) => (f.import ? eur(f.import) : '-'), dreta: true },
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

/** Parteix el text en línies que caben a l'amplada (per paraules; una paraula massa llarga, com un correu, es parteix per lletres). */
function linies(s: string, w: number, font: PDFFont, size: number): string[] {
  const cap = (t: string) => font.widthOfTextAtSize(t, size) <= w;
  const out: string[] = [];
  let actual = '';
  for (const paraula of s.split(/\s+/).filter(Boolean)) {
    const prova = actual ? `${actual} ${paraula}` : paraula;
    if (cap(prova)) { actual = prova; continue; }
    if (actual) out.push(actual);
    actual = '';
    let resta = paraula;
    while (!cap(resta)) {
      // Un correu es parteix just després de l'@ (nom@ / domini) si les dues parts hi caben.
      const arroba = resta.indexOf('@');
      if (arroba > 0 && cap(resta.slice(0, arroba + 1))) {
        out.push(resta.slice(0, arroba + 1));
        resta = resta.slice(arroba + 1);
        continue;
      }
      let n = resta.length - 1;
      while (n > 1 && !cap(resta.slice(0, n))) n--;
      out.push(resta.slice(0, n));
      resta = resta.slice(n);
    }
    actual = resta;
  }
  if (actual) out.push(actual);
  return out.length ? out : [''];
}

/**
 * Amplada de cada columna i mida de lletra perquè res es talli:
 * - columnes curtes (dates, CP, document, telèfon…): la seva amplada natural;
 * - «flex» (nom, domicili, municipi, correu): com a mínim la paraula més llarga
 *   (el correu, sencer), i l'espai que sobra es reparteix entre elles.
 * Si ni així hi cap, es redueix la lletra.
 */
function amplesColumnes(files: FilaIeet[], net: (s: string) => string, font: PDFFont, bold: PDFFont, total: number): { W: number[]; fs: number } {
  for (let size = 6.6; ; size -= 0.2) {
    const amp = (t: string, f = font) => f.widthOfTextAtSize(net(t), size);
    const nat = COLS.map((c) => Math.max(amp(c.h, bold), ...files.map((f) => amp(c.v(f)))) + 8);
    const min = COLS.map((c, i) => {
      if (!c.flex) return nat[i]!;
      if (c.h.startsWith('Correu')) return nat[i]!; // el correu no es parteix mai
      const paraules = files.flatMap((f) => net(c.v(f)).split(/\s+/));
      return Math.max(amp(c.h, bold), ...paraules.map((w) => amp(w))) + 8;
    });
    const sumMin = min.reduce((a, x) => a + x, 0);
    if (sumMin > total && size > 5.2) continue;
    // Espai sobrant: per a les flex, en proporció al que els falta per arribar a la natural.
    const sobra = Math.max(total - sumMin, 0);
    const falta = COLS.map((c, i) => (c.flex ? nat[i]! - min[i]! : 0));
    const sumFalta = falta.reduce((a, x) => a + x, 0);
    const W = min.map((m, i) => m + (sumFalta > 0 ? (sobra * falta[i]!) / sumFalta : COLS[i]!.flex ? sobra / 4 : 0));
    // Si totes les flex ja caben senceres, el que encara sobra va a l'última columna de text (correu).
    const usat = W.reduce((a, x) => a + x, 0);
    if (usat < total) W[COLS.findIndex((c) => c.h.startsWith('Correu'))]! += total - usat;
    return { W, fs: size };
  }
}

export async function buildIeetPdf(d: IeetPeriode, establiment: { nom: string; nif: string | null }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const net = netejador(font);
  const { W, fs } = amplesColumnes(d.files, net, font, bold, PAG.w - 2 * M);
  const p = d.periode;

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
  const LH = 8.2; // alçada de línia
  const PAD = 3;
  const capcalera = () => {
    const hH = LH + 2 * PAD;
    page.drawRectangle({ x: M, y: y - hH, width: PAG.w - 2 * M, height: hH, color: GRANAT });
    let cx = M;
    COLS.forEach((c, i) => {
      const s = net(c.h);
      const tx = c.dreta ? cx + W[i]! - 4 - bold.widthOfTextAtSize(s, fs) : cx + 2;
      text(s, tx, y - PAD - LH + 2, fs, bold, rgb(1, 1, 1));
      cx += W[i]!;
    });
    y -= hH;
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
    const cel = COLS.map((c, i) => linies(net(c.v(f)), W[i]! - 6, font, fs));
    const rowH = Math.max(...cel.map((l) => l.length)) * LH + 2 * PAD;
    if (y - rowH < M + 26) novaPagina();
    let cx = M;
    COLS.forEach((c, i) => {
      cel[i]!.forEach((l, j) => {
        const tx = c.dreta ? cx + W[i]! - 4 - font.widthOfTextAtSize(l, fs) : cx + 2;
        text(l, tx, y - PAD - LH * (j + 1) + 2, fs, font, INK);
      });
      cx += W[i]!;
    });
    page.drawLine({ start: { x: M, y: y - rowH }, end: { x: PAG.w - M, y: y - rowH }, thickness: 0.4, color: LINIA });
    y -= rowH;
  }

  // Total
  if (d.files.length > 0) {
    const tH = 15;
    if (y - tH < M + 26) novaPagina();
    page.drawRectangle({ x: M, y: y - tH, width: PAG.w - 2 * M, height: tH, color: CREMA });
    text('TOTAL A PAGAR', M + 4, y - tH + 4.5, 7.5, bold);
    const t = net(imp);
    text(t, PAG.w - M - 4 - bold.widthOfTextAtSize(t, 7.5), y - tH + 4.5, 7.5, bold);
    y -= tH + 8;
  }

  // Peu a totes les pàgines
  const pagines = doc.getPages();
  const nota = 'Només paga la primera estada (les continuacions i ampliacions no surten). Menors de l’edat mínima a 0 €. Nits: les que paguen (màxim de la primera estada).';
  pagines.forEach((pg, i) => {
    pg.drawText(net(nota), { x: M, y: 12, size: 6.5, font, color: GRIS });
    const n = net(`Pàgina ${i + 1} de ${pagines.length} · generat el ${dataEs(new Date().toISOString().slice(0, 10))}`);
    pg.drawText(n, { x: PAG.w - M - font.widthOfTextAtSize(n, 6.5), y: 12, size: 6.5, font, color: GRIS });
  });

  return doc.save();
}
