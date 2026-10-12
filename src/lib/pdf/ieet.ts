/**
 * PDF de la taxa turística d'un període de declaració (A4 horitzontal), amb
 * l'estil de la factura impresa: fons paper, «Hostal Coll» en serif, regla fosca
 * amb el tros granat i el total dins la caixa rosada. Les persones van agrupades
 * per contracte (franja amb habitació, dates i nits) perquè no es repeteixin les
 * dades de l'estada a cada fila. Res es talla: el text llarg salta de línia.
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import { TIPUS_DOCUMENT_LABELS } from '../validation/enums';
import type { FilaIeet } from '../ieet';
import type { IeetPeriode } from '../services/ieet';

const PAG = { w: 841.89, h: 595.28 };
const MX = 34; // marge lateral
const MY = 30; // marge superior/inferior
const AMPLE = PAG.w - 2 * MX;

// Paleta de la factura impresa.
const PAPER = rgb(1, 0.988, 0.973);
const INK = rgb(0.173, 0.094, 0.063);
const SLATE = rgb(0.235, 0.157, 0.157);
const MUTED = rgb(0.478, 0.408, 0.408);
const LINE = rgb(0.898, 0.847, 0.835);
const ACCENT = rgb(0.478, 0.122, 0.169);
const TINT = rgb(0.961, 0.925, 0.925);

const dataEs = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const docLabel = (f: FilaIeet) => {
  if (!f.tipusDocument && !f.numDocument) return '';
  const t = f.tipusDocument ? (TIPUS_DOCUMENT_LABELS[f.tipusDocument as keyof typeof TIPUS_DOCUMENT_LABELS] ?? f.tipusDocument) : '';
  return [t.replace('Passaport', 'Pass.').replace('Altres documents', 'Doc.').replace('DNI/NIF', 'DNI'), f.numDocument].filter(Boolean).join(' ');
};

interface Col { h: string; v: (f: FilaIeet) => string; dreta?: true; flex?: true; nowrap?: true }
// Columnes de persona (les de l'estada van a la franja del contracte).
const COLS: Col[] = [
  { h: 'Cognoms i nom', v: (f) => f.nom, flex: true },
  { h: 'Document', v: docLabel },
  { h: 'Nacionalitat', v: (f) => f.nacionalitat },
  { h: 'Naixement', v: (f) => dataEs(f.dataNaixement) },
  { h: 'Edat', v: (f) => (f.edat == null ? '' : String(f.edat)), dreta: true },
  { h: 'Domicili', v: (f) => f.adreca, flex: true },
  { h: 'Municipi', v: (f) => [f.codiPostal, f.municipi].filter(Boolean).join(' '), flex: true },
  { h: 'País', v: (f) => f.pais },
  { h: 'Telèfon', v: (f) => f.telefon },
  { h: 'Correu electrònic', v: (f) => f.email, flex: true, nowrap: true },
  { h: 'Import', v: (f) => (f.import ? eur(f.import) : '–'), dreta: true },
];

/** Deixa només els caràcters que les fonts estàndard (WinAnsi) poden dibuixar. */
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

/** Parteix el text en línies que caben a l'amplada (per paraules; una paraula massa llarga es parteix per l'@ o per lletres). */
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
 * Amplades i mida de lletra perquè res es talli: les columnes curtes, la seva
 * amplada natural; les «flex», com a mínim la paraula més llarga (el correu
 * sencer) i el sobrant repartit entre elles. Si no hi cap, lletra més petita.
 */
function amplesColumnes(files: FilaIeet[], net: (s: string) => string, font: PDFFont, bold: PDFFont, total: number): { W: number[]; fs: number } {
  for (let size = 7.4; ; size -= 0.2) {
    const amp = (t: string, f = font) => f.widthOfTextAtSize(net(t), size);
    const capH = (c: Col) => amp(c.h.toUpperCase(), bold) + c.h.length * 0.6;
    const nat = COLS.map((c, i) => Math.max(capH(c), ...files.map((f) => amp(c.v(f), i === 0 ? bold : font))) + 12);
    // Primer es busca la lletra més gran (fins a 6,4 pt) amb què TOT cap en una
    // línia; l'espai que sobri es reparteix entre les columnes de text.
    const sumNat = nat.reduce((a, x) => a + x, 0);
    if (sumNat <= total) {
      const flex = COLS.map((c, i) => (c.flex ? i : -1)).filter((i) => i >= 0);
      const W = [...nat];
      for (const i of flex) W[i]! += (total - sumNat) / flex.length;
      return { W, fs: size };
    }
    if (size > 6.45) continue;
    const min = COLS.map((c, i) => {
      if (!c.flex || c.nowrap) return nat[i]!;
      const paraules = files.flatMap((f) => net(c.v(f)).split(/\s+/));
      // Una «paraula» enganxada molt llarga (p. ex. «C/SARDANA,39.PISO…») no ha de
      // fer gegant la columna: a partir de 100 pt es parteix per lletres.
      return Math.min(100, Math.max(capH(c), ...paraules.map((w) => amp(w, i === 0 ? bold : font))) + 12);
    });
    const sumMin = min.reduce((a, x) => a + x, 0);
    if (sumMin > total && size > 5.6) continue;
    const W = [...min];
    let sobra = Math.max(total - sumMin, 0);
    // L'espai sobrant va primer al nom i al municipi (perquè càpiguen en una
    // línia), després al domicili; i el que encara quedi, a parts iguals.
    for (const h of ['Cognoms i nom', 'Municipi', 'Domicili']) {
      const i = COLS.findIndex((c) => c.h === h);
      const dona = Math.min(sobra, nat[i]! - W[i]!);
      if (dona > 0) { W[i]! += dona; sobra -= dona; }
    }
    const flex = COLS.map((c, i) => (c.flex ? i : -1)).filter((i) => i >= 0);
    for (const i of flex) W[i]! += sobra / flex.length;
    return { W, fs: size };
  }
}

export async function buildIeetPdf(
  d: IeetPeriode,
  establiment: { nom: string; nif: string | null; poblacio: string | null },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const net = netejador(font);
  const p = d.periode;
  const { W, fs } = amplesColumnes(d.files, net, font, bold, AMPLE);
  const LH = fs + 2.6; // alçada de línia
  const PAD = 4;

  let page!: PDFPage;
  let y = 0;

  const text = (s: string, x: number, yy: number, size: number, f: PDFFont = font, color: RGB = INK) =>
    page.drawText(net(s), { x, y: yy, size, font: f, color });
  /** Text amb espaiat entre lletres (com les etiquetes en majúscules de la factura). */
  const espaiat = (s: string, x: number, yy: number, size: number, sp: number, f: PDFFont = font, color: RGB = MUTED) => {
    let cx = x;
    for (const c of net(s)) {
      page.drawText(c, { x: cx, y: yy, size, font: f, color });
      cx += f.widthOfTextAtSize(c, size) + sp;
    }
  };
  const ampleEspaiat = (s: string, size: number, sp: number, f: PDFFont = font) =>
    [...net(s)].reduce((a, c) => a + f.widthOfTextAtSize(c, size) + sp, 0) - sp;
  const dreta = (s: string, xDreta: number, yy: number, size: number, f: PDFFont = font, color: RGB = INK) =>
    text(s, xDreta - f.widthOfTextAtSize(net(s), size), yy, size, f, color);

  const regla = () => {
    page.drawLine({ start: { x: MX, y }, end: { x: PAG.w - MX, y }, thickness: 1.1, color: INK });
    page.drawLine({ start: { x: MX, y: y - 4 }, end: { x: MX + 54, y: y - 4 }, thickness: 2.6, color: ACCENT });
  };

  const capcaleraTaula = () => {
    let cx = MX;
    COLS.forEach((c, i) => {
      const h = c.h.toUpperCase();
      const w = ampleEspaiat(h, fs - 1, 0.6, bold);
      const x = c.dreta ? cx + W[i]! - 6 - w : cx + (i === 0 ? 10 : 0);
      espaiat(h, x, y - (fs - 1), fs - 1, 0.6, bold, MUTED);
      cx += W[i]!;
    });
    y -= fs + 5;
    page.drawLine({ start: { x: MX, y }, end: { x: PAG.w - MX, y }, thickness: 1.1, color: INK });
  };

  const novaPagina = (primera: boolean) => {
    page = doc.addPage([PAG.w, PAG.h]);
    page.drawRectangle({ x: 0, y: 0, width: PAG.w, height: PAG.h, color: PAPER });
    y = PAG.h - MY;
    if (primera) {
      // Esquerra: marca, com a la factura.
      text('Hostal Coll', MX, y - 30, 34, serif, INK);
      espaiat(`Casa de Hostes · ${establiment.poblacio || 'Calella'}`.toUpperCase(), MX + 1, y - 46, 7.2, 2.4, font, ACCENT);
      // Dreta: document i dates.
      const xr = PAG.w - MX;
      dreta('Taxa turística', xr, y - 22, 22, serif, INK);
      const badge = `IEET · ${p.etiqueta}`.toUpperCase();
      espaiat(badge, xr - ampleEspaiat(badge, 7, 1.8), y - 36, 7, 1.8, font, ACCENT);
      const meta: [string, string][] = [
        ['Estades amb entrada', `${dataEs(p.inici)} – ${dataEs(p.fi)}`],
        ['Termini de pagament', `${dataEs(p.pagamentDes)} – ${dataEs(p.pagamentFins)}`],
        ...(establiment.nif ? ([['NIF', establiment.nif]] as [string, string][]) : []),
      ];
      let my = y - 52;
      for (const [k, v] of meta) {
        const vw = bold.widthOfTextAtSize(net(v), 8.4);
        text(v, xr - vw, my, 8.4, bold, SLATE);
        const kw = ampleEspaiat(k.toUpperCase(), 6.4, 1);
        espaiat(k.toUpperCase(), xr - vw - 10 - kw, my + 0.6, 6.4, 1, font, MUTED);
        my -= 12;
      }
      y = Math.min(y - 60, my + 2);
    } else {
      text('Hostal Coll', MX, y - 16, 17, serif, INK);
      dreta(`Taxa turística · ${p.etiqueta} (continuació)`, PAG.w - MX, y - 14, 10, serif, INK);
      y -= 24;
    }
    regla();
    y -= 14;
    capcaleraTaula();
  };

  // Línies de cada cel·la d'una persona i alçada de la fila.
  const celes = (f: FilaIeet) =>
    COLS.map((c, i) => (c.nowrap ? [net(c.v(f))] : linies(net(c.v(f)), W[i]! - (i === 0 ? 16 : 8), i === 0 ? bold : font, fs)));
  const altFila = (cel: string[][]) => Math.max(...cel.map((l) => l.length)) * LH + 2 * PAD;
  const ALT_GRUP = fs + 2 * PAD + 6;

  novaPagina(true);

  if (d.files.length === 0) {
    text('Encara no hi ha cap estada acabada amb contracte en aquest període.', MX + 10, y - 18, 9, font, MUTED);
    y -= 28;
  }

  // Grups per contracte (les files ja venen per data d'entrada).
  const grups: { estadaId: string; files: FilaIeet[] }[] = [];
  for (const f of d.files) {
    const g = grups.at(-1);
    if (g && g.estadaId === f.estadaId) g.files.push(f);
    else grups.push({ estadaId: f.estadaId, files: [f] });
  }

  for (const g of grups) {
    const f0 = g.files[0]!;
    const cel0 = celes(f0);
    // La franja del contracte no es queda mai sola al peu de la pàgina.
    if (y - 4 - ALT_GRUP - altFila(cel0) < MY) novaPagina(false);
    y -= 4;
    page.drawRectangle({ x: MX, y: y - ALT_GRUP + 4, width: AMPLE, height: ALT_GRUP - 4, color: TINT });
    const ty = y - ALT_GRUP + 4 + PAD + 1;
    const ctr = `Contracte ${f0.contracte}`;
    text(ctr, MX + 8, ty, fs + 2.2, serif, ACCENT);
    const dades = [
      f0.habitacio ? `Habitació ${f0.habitacio}` : null,
      `del ${dataEs(f0.entrada)} al ${dataEs(f0.sortida)}`,
      `${f0.nitsPaguen} ${f0.nitsPaguen === 1 ? 'nit' : 'nits'}`,
    ].filter(Boolean).join('  ·  ');
    text(`·  ${dades}`, MX + 8 + serif.widthOfTextAtSize(net(ctr), fs + 2.2) + 7, ty + 0.4, fs, font, SLATE);
    y -= ALT_GRUP;

    for (const f of g.files) {
      const cel = f === f0 ? cel0 : celes(f);
      const h = altFila(cel);
      if (y - h < MY) novaPagina(false);
      const color = f.menor ? MUTED : SLATE;
      let cx = MX;
      COLS.forEach((c, i) => {
        const f2 = i === 0 ? bold : font;
        cel[i]!.forEach((l, j) => {
          const x = c.dreta ? cx + W[i]! - 6 - f2.widthOfTextAtSize(l, fs) : cx + (i === 0 ? 10 : 0);
          text(l, x, y - PAD - LH * (j + 1) + 2.4, fs, f2, i === 0 && !f.menor ? INK : color);
        });
        cx += W[i]!;
      });
      y -= h;
      page.drawLine({ start: { x: MX, y }, end: { x: PAG.w - MX, y }, thickness: 0.5, color: LINE });
    }
  }

  // ── Resum i total, com la factura ──
  const resum: [string, string][] = [
    ['Persones que paguen', `${d.resum.personesPaguen} de ${d.resum.persones}`],
    ['Nits que paguen', String(d.resum.nitsPaguen)],
    ['Tarifa', `${eur(d.config.tarifa)} per persona i nit`],
  ];
  const altResum = resum.length * 15 + 40;
  if (y - 16 - altResum < MY) novaPagina(false);
  y -= 16;
  const bw = 250;
  const bx = PAG.w - MX - bw;
  for (const [k, v] of resum) {
    text(k, bx + 10, y - 10, 8.4, font, MUTED);
    dreta(v, bx + bw - 10, y - 10, 8.4, bold, SLATE);
    y -= 15;
  }
  y -= 4;
  page.drawRectangle({ x: bx, y: y - 30, width: bw, height: 30, color: TINT });
  page.drawLine({ start: { x: bx, y }, end: { x: bx + bw, y }, thickness: 1.8, color: ACCENT });
  text('Import a pagar', bx + 10, y - 20, 13, serif, INK);
  dreta(eur(d.resum.import), bx + bw - 10, y - 21, 15, bold, INK);

  return doc.save();
}
