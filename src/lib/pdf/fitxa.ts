/**
 * Genera la fitxa oficial "Registro de personas alojadas" (Mossos d'Esquadra)
 * d'una estada SUPERPOSANT les dades sobre el formulari oficial real
 * (docs/mossos/fitxaViatger.pdf, incrustat a `fitxa-template.ts`). No es recrea
 * el document: s'agafa el PDF oficial i s'hi "calquen" els valors a sobre.
 *
 * Genera UNA pàgina (fitxa) per CADA persona allotjada amb la seva SIGNATURA
 * incrustada, i afegeix al final la pàgina d'informació de protecció de dades.
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib';
import type { Establiment, Estancia, EstanciaViatger, Huesped, Signatura } from '@prisma/client';
import { formatDate } from '../utils';
import { FITXA_TEMPLATE_B64 } from './fitxa-template';
import { viatgerEfectiu } from '../registre-snapshot';

type ViatgerRow = EstanciaViatger & { huesped: Huesped; signatura: Signatura | null };

const templateBytes = Buffer.from(FITXA_TEMPLATE_B64, 'base64');

const VAL_SIZE = 9;
const VAL_DY = 12; // distància del valor sota la línia base de l'etiqueta
const INK = rgb(0.05, 0.07, 0.12);

// Etiquetes en castellà dels valors d'enum, per coincidir amb el formulari oficial.
const TIPUS_CONTRACTE: Record<string, string> = {
  CONTRACTE_EN_CURS: 'Contrato en curso',
  RESERVA: 'Reserva',
};
const TIPUS_DOC: Record<string, string> = {
  DNI_NIF: 'DNI/NIF',
  NIE: 'NIE',
  PASSAPORT: 'Pasaporte',
  ALTRES: 'Otros',
};
const TIPUS_PAG: Record<string, string> = {
  DESTINACIO: 'Pago en destino',
  EFECTIU: 'Efectivo',
  MOBIL: 'Pago por móvil',
  PLATAFORMA: 'Plataforma de pago',
  TARGETA_CREDIT: 'Tarjeta de crédito',
  TRANSFERENCIA: 'Transferencia',
  TARGETA_REGAL: 'Tarjeta regalo',
};
const SEXE: Record<string, string> = { HOME: 'Hombre', DONA: 'Mujer' };
const PARENTESC: Record<string, string> = {
  AVI_AVIA: 'Abuelo/abuela',
  BESAVI_BESAVIA: 'Bisabuelo/bisabuela',
  BESNET_BESNETA: 'Bisnieto/bisnieta',
  CUNYAT_CUNYADA: 'Cuñado/cuñada',
  CONJUGE: 'Cónyuge',
  FILL_FILLA: 'Hijo/hija',
  GERMA_GERMANA: 'Hermano/hermana',
  NET_NETA: 'Nieto/nieta',
  PARE_MARE: 'Padre o madre',
  NEBOT_NEBODA: 'Sobrino/sobrina',
  SOGRE_SOGRA: 'Suegro/suegra',
  ONCLE_TIA: 'Tío/tía',
  TUTOR_TUTORA: 'Tutor/tutora',
  GENDRE_NORA: 'Yerno o nuera',
  ALTRES: 'Otros',
};

// pdf-lib (Helvetica WinAnsi) no codifica algunes cometes/guions "tipogràfics".
function sanitize(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');
}

export async function buildFitxaPdf(
  establiment: Establiment,
  estancia: Estancia,
  viatgers: ViatgerRow[],
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const template = await PDFDocument.load(templateBytes);

  // Títol del document (el navegador el mostra a la pestanya en obrir el PDF):
  // "Registre de persones allotjades — NOM COGNOM, …" en comptes de "fitxa-pdf".
  const noms = viatgers
    .map((r) => `${r.huesped.nom} ${r.huesped.cognom1}`.trim())
    .filter(Boolean);
  out.setTitle(
    sanitize(
      noms.length
        ? `Registre de persones allotjades — ${noms.join(', ')}`
        : `Registre de persones allotjades — ${estancia.numContracte}/${estancia.anyContracte}`,
    ),
    { showInWindowTitleBar: true },
  );

  /** Trunca un text perquè càpiga a maxW. */
  const fit = (s: string, maxW: number): string => {
    if (font.widthOfTextAtSize(s, VAL_SIZE) <= maxW) return s;
    let t = s;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, VAL_SIZE) > maxW) t = t.slice(0, -1);
    return `${t}...`;
  };

  /** Escriu un valor sota l'etiqueta de coordenada (x, labelY) del formulari. */
  const put = (page: PDFPage, x: number, labelY: number, value: string | null | undefined, w: number) => {
    const v = value != null ? String(value).trim() : '';
    if (!v) return; // camp buit → es deixa en blanc, com a la fitxa oficial
    page.drawText(sanitize(fit(v, w)), { x: x + 1, y: labelY - VAL_DY, size: VAL_SIZE, font, color: INK });
  };

  const fmtInternet = (b: boolean | null) => (b == null ? '' : b ? 'SÍ' : 'NO');

  async function renderFitxa(v: ViatgerRow | null) {
    // Copia la pàgina del formulari oficial (índex 0) i hi superposa les dades.
    const page = (await out.copyPages(template, [0]))[0];
    if (!page) return;
    out.addPage(page);
    const h = v ? viatgerEfectiu(v.huesped, v.dadesCongelades) : null;

    // --- Datos del contrato ---
    put(page, 52, 719, establiment.idPolicial, 158);
    put(page, 215.35, 719, establiment.nom, 158);
    put(page, 378.7, 719, TIPUS_CONTRACTE[estancia.tipusRegistre] ?? estancia.tipusRegistre, 160);
    put(page, 52, 692, `${estancia.numContracte}/${estancia.anyContracte}`, 158);
    put(page, 215.35, 692, formatNoDash(formatDate(estancia.dataFormalitzacio)), 158);
    put(page, 378.7, 692, formatNoDash(formatDate(estancia.dataEntrada)), 160);
    put(page, 52, 665, formatNoDash(formatDate(estancia.dataSortida)), 158);
    put(page, 215.35, 665, String(estancia.numViatgers), 158);
    put(page, 378.7, 665, TIPUS_PAG[estancia.tipusPagament] ?? estancia.tipusPagament, 160);
    put(page, 52, 638, estancia.numHabitacions != null ? String(estancia.numHabitacions) : '', 158);
    put(page, 215.35, 638, fmtInternet(estancia.teInternet), 320);

    // --- Datos identificativos ---
    put(page, 52, 591, h?.tipusDocument ? TIPUS_DOC[h.tipusDocument] ?? h.tipusDocument : '', 242);
    put(page, 299.5, 591, h?.numDocument, 240);
    put(page, 52, 564, h?.numSuport, 242);
    put(page, 299.5, 564, formatNoDash(formatDate(h?.dataExpedicio)), 240);

    // --- Datos personales ---
    put(page, 52, 517, h?.nom, 158);
    put(page, 215.35, 517, h?.cognom1, 158);
    put(page, 378.7, 517, h?.cognom2, 160);
    put(page, 52, 490, h?.sexe ? SEXE[h.sexe] ?? h.sexe : '', 158);
    put(page, 215.35, 490, formatNoDash(formatDate(h?.dataNaixement)), 158);
    put(page, 378.7, 490, h?.nacionalitat, 160);
    put(page, 52, 463, h?.email, 158);
    put(page, 215.35, 463, v?.parentesc ? PARENTESC[v.parentesc] ?? v.parentesc : '', 158);
    put(page, 378.7, 463, h?.telefon, 160);

    // --- Dirección postal ---
    put(page, 52, 416, h?.adreca, 158);
    put(page, 215.35, 416, h?.pais, 158);
    put(page, 378.7, 416, h?.provincia, 160);
    put(page, 52, 389, h?.municipi, 158);
    put(page, 215.35, 389, h?.localitat, 158);
    put(page, 378.7, 389, h?.codiPostal, 160);

    // --- Firma + Localidad y fecha ---
    await drawSignatura(page, v);
    // Si encara no s'ha signat digitalment, hi posem el poble de l'establiment i
    // la data d'entrada perquè ja surtin impresos (després signen a mà).
    const lloc = v?.signatura?.llocSignatura || establiment.poblacio || '';
    const dataSign = v?.signatura?.data ?? estancia.dataEntrada;
    const llocData = [lloc, dataSign ? formatDate(dataSign) : null].filter(Boolean).join(', ');
    put(page, 299.5, 362, llocData, 240);
  }

  async function drawSignatura(page: PDFPage, v: ViatgerRow | null) {
    if (!v?.signatura?.imatge?.startsWith('data:image')) return; // queda l'espai per signar a mà
    try {
      const b64 = v.signatura.imatge.split(',')[1] ?? '';
      const png = await out.embedPng(Buffer.from(b64, 'base64'));
      const scale = Math.min(230 / png.width, 30 / png.height);
      page.drawImage(png, { x: 54, y: 328, width: png.width * scale, height: png.height * scale });
    } catch {
      /* signatura no incrustable (p. ex. JPEG): es deixa l'espai en blanc */
    }
  }

  const rows: (ViatgerRow | null)[] = viatgers.length > 0 ? viatgers : [null];
  for (const v of rows) await renderFitxa(v);

  // Pàgina d'informació de protecció de dades del formulari oficial (un cop, al final).
  const infoPage = (await out.copyPages(template, [1]))[0];
  if (infoPage) out.addPage(infoPage);

  return out.save();
}

// La data buida la retorna formatDate com '—'; al formulari oficial volem blanc.
function formatNoDash(s: string): string {
  return s === '—' ? '' : s;
}
