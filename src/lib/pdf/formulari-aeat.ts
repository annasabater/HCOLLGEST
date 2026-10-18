/**
 * Formularis OFICIALS de l'AEAT omplerts amb les caselles calculades a /impostos.
 * Els PDF són els annexos del BOE (303 i 390: Orden HAC/27/2026; 130: Orden
 * HAP/258/2015) i el JSON de cada model diu on cau cada casella (punts PDF, origen
 * a dalt a l'esquerra), extret del mateix PDF a partir dels números de casella.
 */
import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Caselles } from '../impostos';
import f303 from '../formularis-aeat/303.json';
import f130 from '../formularis-aeat/130.json';
import f390 from '../formularis-aeat/390.json';

export type ModelFormulari = '303' | '130' | '390';

/** [pàgina, x0, y0, x1, y1] */
type Caixa = [number, number, number, number, number];
interface Formulari {
  caselles: Record<string, number[]>;
  capcalera: { nif?: number[]; nom?: number[] }[];
}

const FORMULARIS: Record<ModelFormulari, Formulari> = { '303': f303, '130': f130, '390': f390 };

/** Caixes que no porten número de casella al costat (lletra C/D/I) o de capçalera. */
const EXTRA: Record<ModelFormulari, Record<string, Caixa>> = {
  '303': {
    exercici: [0, 408.3, 244.2, 442.0, 253.0],
    periode: [0, 471.3, 244.2, 488.4, 253.0],
    '65': [2, 200.6, 350.9, 228.0, 360.4], // el formulari ja porta el «%» imprès a la dreta
    '72': [5, 151.5, 184.6, 245.6, 196.5], // a compensar (després de la «C»)
    '73': [5, 195.0, 354.5, 289.3, 366.4], // a retornar (després de la «D»)
    ingres: [5, 159.5, 263.9, 253.6, 275.8], // import de l'ingrés (després de la «I»)
  },
  '130': {
    nom: [0, 93.9, 227.8, 201.4, 240.5],
    cognoms: [0, 93.9, 254.2, 328.3, 266.9],
    exercici: [0, 399.8, 202.1, 446.3, 214.5],
    periode: [0, 488.6, 202.1, 511.4, 214.5],
    ingres: [0, 210.0, 626.1, 291.8, 636.8],
  },
  '390': {
    exercici: [0, 339.3, 250.2, 373.0, 259.0],
    nom: [0, 102.4, 312.7, 493.5, 321.4],
    activitat: [0, 103.2, 444.6, 420.9, 454.6],
    clau: [0, 426.0, 444.7, 450.7, 454.4],
    epigraf: [0, 456.3, 444.7, 494.0, 454.2],
    // Totals de l'IVA deduïble interior corrent (caselles amb el tipus ombrejat).
    '48': [3, 247.0, 252.3, 354.0, 262.5],
    '49': [3, 397.0, 252.3, 505.0, 262.5],
  },
};

/** Caselles de percentatge del 303 (tipus d'IVA, % atribuïble), sense separador de milers. */
const PERCENT_303 = new Set(['02', '05', '08', '65']);

/** "5.517,00" (sempre amb punt de milers, també amb 4 xifres). */
function fmt(n: number): string {
  const [enter = '0', dec = '00'] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}${enter.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

function escriu(pages: PDFPage[], font: PDFFont, caixa: number[], text: string, opts: { esquerra?: boolean; mida?: number } = {}) {
  const [p, x0, y0, x1, y1] = caixa as Caixa;
  const page = pages[p];
  if (!page || !text) return;
  const H = page.getHeight();
  let mida = opts.mida ?? 8;
  const ample = x1 - x0 - 3;
  while (font.widthOfTextAtSize(text, mida) > ample && mida > 5) mida -= 0.5;
  const w = font.widthOfTextAtSize(text, mida);
  const x = opts.esquerra ? x0 + 2 : x1 - 2 - w;
  const y = H - (y0 + y1) / 2 - mida * 0.35;
  page.drawText(text, { x, y, size: mida, font, color: rgb(0.05, 0.1, 0.45) });
}

export interface DadesFormulari {
  model: ModelFormulari;
  any: number;
  /** 1–4 = trimestre (303, 130); 0 = anual (390). */
  periode: number;
  caselles: Caselles;
  titular: { nom: string; nif: string };
  /** 390: activitat, clau i epígraf IAE. */
  activitat?: { descripcio: string; clau: string; epigraf: string };
}

/** Separa "Elisabet Nualart Coll" en nom ("Elisabet") i cognoms ("Nualart Coll"). */
function nomICognoms(nom: string): { nom: string; cognoms: string } {
  const parts = nom.trim().split(/\s+/);
  return { nom: parts[0] ?? '', cognoms: parts.slice(1).join(' ') };
}

export async function formulariOmplert(d: DadesFormulari): Promise<Uint8Array> {
  const bytes = await fs.readFile(path.join(process.cwd(), 'src/lib/formularis-aeat', `${d.model}.pdf`));
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();
  const form = FORMULARIS[d.model];
  const extra = EXTRA[d.model];

  // Capçalera: NIF i nom a cada pàgina (el 130 separa nom i cognoms).
  const cognomsNom = (() => {
    const { nom, cognoms } = nomICognoms(d.titular.nom);
    return `${cognoms} ${nom}`.trim().toUpperCase();
  })();
  form.capcalera.forEach((c, i) => {
    if (c.nif) escriu(pages, font, [i, ...c.nif], d.titular.nif.toUpperCase(), { esquerra: true });
    if (c.nom) escriu(pages, font, [i, ...c.nom], cognomsNom, { esquerra: true });
  });
  if (d.model === '130') {
    const { nom, cognoms } = nomICognoms(d.titular.nom);
    escriu(pages, font, extra.nom!, nom.toUpperCase(), { esquerra: true });
    escriu(pages, font, extra.cognoms!, cognoms.toUpperCase(), { esquerra: true });
  }
  if (d.model === '390') {
    escriu(pages, font, extra.nom!, cognomsNom, { esquerra: true });
    if (d.activitat) {
      escriu(pages, font, extra.activitat!, d.activitat.descripcio, { esquerra: true });
      escriu(pages, font, extra.clau!, d.activitat.clau, { esquerra: true });
      escriu(pages, font, extra.epigraf!, d.activitat.epigraf, { esquerra: true });
    }
  }
  if (extra.exercici) escriu(pages, bold, extra.exercici, String(d.any), { esquerra: true });
  if (extra.periode && d.periode > 0) escriu(pages, bold, extra.periode, `${d.periode}T`, { esquerra: true });

  // Caselles.
  for (const [codi, valor] of Object.entries(d.caselles)) {
    if (valor === undefined || Number.isNaN(valor)) continue;
    const caixa = (extra[codi] ?? form.caselles[codi]) as number[] | undefined;
    if (!caixa) continue;
    const text = d.model === '303' && PERCENT_303.has(codi) ? valor.toFixed(2).replace('.', ',') : fmt(valor);
    escriu(pages, codi === '71' || codi === '19' ? bold : font, caixa, text);
  }
  // Import de l'ingrés (resultat positiu).
  const ingres = d.model === '303' ? d.caselles['71'] : d.model === '130' ? d.caselles['19'] : undefined;
  if (ingres !== undefined && ingres > 0 && extra.ingres) escriu(pages, bold, extra.ingres, fmt(ingres));

  pdf.setTitle(`Model ${d.model} ${d.any}${d.periode ? ` ${d.periode}T` : ''} — ${d.titular.nom}`);
  return pdf.save();
}
