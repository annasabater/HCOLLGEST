/**
 * Generador PDF (pdf-lib) del "Reglamento Interno de Hospedaje" + clàusula LOPD
 * pròpia del hostal (docs/Hostal Coll-NOU LOPD Reglamento interno de Hospedaje.doc),
 * amb l'estil visual de la marca (granat #7A1F2B, ink càlid) per fer-lo llegible
 * i coherent amb la resta de documents de l'app.
 * Es genera UN document per cada viatger ADULT de l'estada (els menors no firmen,
 * però surten llistats com a acompanyants al document del seu adult acompanyant),
 * reutilitzant la MATEIXA firma ja capturada per al Registre de persones allotjades
 * (no es demana cap firma nova).
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Establiment, Estancia, EstanciaViatger, Huesped, Signatura } from '@prisma/client';
import { formatDate } from '../utils';
import { viatgerEfectiu } from '../registre-snapshot';

type ViatgerRow = EstanciaViatger & { huesped: Huesped; signatura: Signatura | null };

const A4 = { w: 595.28, h: 841.89 };
const M = 50;

// Paleta de marca (mateixos tons que factura-simple / web: granat + ink càlid).
const INK = rgb(0.173, 0.094, 0.063); // #2C1810
const ACCENT = rgb(0.478, 0.122, 0.169); // #7A1F2B
const MUTED = rgb(0.478, 0.408, 0.408); // #7A6868
const LINE = rgb(0.898, 0.847, 0.835); // #E5D8D5
const FIELD_BG = rgb(0.969, 0.933, 0.925); // #F7EEEC

function sanitize(s: string): string {
  return (s ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');
}

const NORMES: string[] = [
  'El pago de la habitación debe hacerse por adelantado, a la hora de registrarse. El pago debe realizarse mediante efectivo. No podemos garantizar una habitación específica pero sí podemos mantener una con características similares. Si usted decide alargar su estancia, no le podemos garantizar que el hostal tenga habitación disponible; en caso de no haber disponibilidad, deberá dejar la habitación libre.',
  'Si el cliente no paga por adelantado, pierde el derecho al uso de la habitación.',
  'Los pagos realizados en el momento de la reserva irán a cuenta del precio total de la estancia acordada y no son reembolsables en caso de cancelación; el no presentarse el día acordado supone perder la reserva y el derecho al uso de la habitación.',
  'Debe llevar sus llaves en todo momento. Si pierde el juego de llaves, se le cobrará el coste de 2 cerraduras y sus juegos de llaves (90 euros).',
  'Toda persona que se hospede en este establecimiento está obligada a registrarse y deberá exhibir identificación oficial con fotografía vigente. Si algún ocupante llega más tarde, debe registrarse (Check-in) igualmente; de lo contrario, no puede estar hospedado en el Hostal.',
  'No se admiten visitas.',
  'La hora de salida (Check-out) debe realizarse antes de las 11:00 h y devolver las llaves de la habitación. Si algún huésped permanece más tiempo, se le cobrará un día más de estancia.',
  'En estancias de menos de una semana no se realizará limpieza durante la ocupación; en estancias más prolongadas se hará una limpieza semanal.',
  'Solo está permitido utilizar el enchufe para: secador de pelo, máquina de afeitar, cargador móvil y ordenador portátil.',
  'No se pueden utilizar aparatos de gas u otros que no sean los propios de la habitación.',
  'Está completamente prohibido fumar, consumir bebidas alcohólicas y/o estupefacientes dentro del Hostal.',
  'Prohibido hacer ruido durante las horas de descanso, de 23:00 a 7:00 horas.',
  'Si tiene niños, por favor manténgalos en silencio por respeto a los demás: sus ruidos pueden ser muy molestos.',
  'Los niños deben estar acompañados de sus padres en todo momento. No nos hacemos responsables de los accidentes que puedan suceder.',
  'El uso de muebles, ropa y demás objetos de servicio será racional y moderado. Si el huésped daña dichos objetos, deberá reportarlo a la administración; en caso de sustracción se cargará el precio de mercado del bien. Al salir de la habitación, debe dejar cerradas las puertas y apagadas las luces y la calefacción.',
  'No le abra la puerta a NADIE.',
  'El Hostal no se hace responsable de la pérdida de dinero u objetos de cualquier índole.',
  'Toda queja, sugerencia o felicitación deberá anotarse en los formatos que la administración pone a disposición, conforme a los lineamientos de la Secretaría de Turismo.',
  'Se permiten ciertas mascotas, siempre con conocimiento y consentimiento del Hostal, quedando reflejado en el recibo entregado.',
  'He leído y comprendo todas las regulaciones indicadas y las acepto. Soy consciente de que cualquier indicio de consumo de tabaco, abuso de alcohol o posesión de narcóticos ilegales, u otro incumplimiento de las normas, supondrá mi expulsión inmediata.',
  'Soy conocedor/a de que solo tengo garantizada la habitación por la(s) noche(s) especificada(s) en el recibo.',
];

const INTRO =
  'Por favor, lea cuidadosamente nuestras normas y firme la hoja si está de acuerdo. Esta información es importante para que su estancia con nosotros sea lo más placentera posible.';

const CLOSING =
  'El incumplimiento de este Reglamento Interno de Hospedaje por parte del huésped será causa de rescisión del contrato de hospedaje, sin responsabilidad jurídica para la empresa.';

function lopdParagraph(adreca: string): string {
  return `ELISABETH NUALART COLL es la responsable del tratamiento de sus datos personales y le informa de que estos datos serán tratados de conformidad con el Reglamento (UE) 2016/679, de 27 de abril (GDPR), y la Ley Orgánica 3/2018, de 5 de diciembre (LOPDGDD), con la finalidad de mantener la relación comercial que nos une (en base a una relación contractual, obligación legal o interés legítimo), conservándolos durante no más tiempo del necesario para dicho fin o mientras existan prescripciones legales que dictaminen su custodia. No se comunicarán los datos a terceros, salvo obligación legal. Puede ejercer sus derechos de acceso, rectificación, portabilidad y supresión, así como los de limitación y oposición al tratamiento, dirigiéndose a ELISABETH NUALART COLL en ${adreca}. E-mail: hostalcoll@gmail.com. Derecho de reclamación: www.aepd.es.`;
}

const ADRECA_FALLBACK = 'C/ Sant Isidre, 54 - 08370 Calella (Barcelona)';

// ---------- Utilitats de maquetació (paginació automàtica) ----------

interface Cur {
  page: PDFPage;
  y: number;
}

function newPage(doc: PDFDocument): Cur {
  return { page: doc.addPage([A4.w, A4.h]), y: A4.h - M };
}

function ensure(doc: PDFDocument, cur: Cur, needed: number): Cur {
  return cur.y - needed < M ? newPage(doc) : cur;
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
  return lines;
}

function drawParagraph(
  doc: PDFDocument,
  cur: Cur,
  text: string,
  font: PDFFont,
  size: number,
  lineH: number,
  indent = 0,
  color = INK,
): Cur {
  const maxW = A4.w - M * 2 - indent;
  for (const l of wrap(font, text, size, maxW)) {
    cur = ensure(doc, cur, lineH);
    cur.page.drawText(l, { x: M + indent, y: cur.y - size, size, font, color });
    cur.y -= lineH;
  }
  return cur;
}

/** Marca "HOSTAL COLL" + títol del document + regle de color (granat). */
function drawMasthead(doc: PDFDocument, cur: Cur, bold: PDFFont, title: string): Cur {
  cur = ensure(doc, cur, 52);
  cur.page.drawText('HOSTAL COLL', { x: M, y: cur.y - 16, size: 16, font: bold, color: INK });
  cur.y -= 24;
  cur.page.drawText(title.toUpperCase(), { x: M, y: cur.y - 8, size: 8, font: bold, color: ACCENT });
  cur.y -= 12;
  cur.page.drawLine({ start: { x: M, y: cur.y }, end: { x: A4.w - M, y: cur.y }, thickness: 1.2, color: INK });
  cur.page.drawLine({ start: { x: M, y: cur.y }, end: { x: M + 46, y: cur.y }, thickness: 2.6, color: ACCENT });
  cur.y -= 16;
  return cur;
}

/** Petita etiqueta de secció en granat, amb un traç curt a sota (amb espai, no tocant el text). */
function drawEyebrow(doc: PDFDocument, cur: Cur, text: string, bold: PDFFont): Cur {
  cur = ensure(doc, cur, 26);
  const baseline = cur.y - 9;
  cur.page.drawText(text.toUpperCase(), { x: M, y: baseline, size: 9.5, font: bold, color: ACCENT });
  const lineY = baseline - 5;
  cur.page.drawLine({ start: { x: M, y: lineY }, end: { x: M + 28, y: lineY }, thickness: 1.6, color: ACCENT });
  cur.y = lineY - 12;
  return cur;
}

/** Punt de llista en granat + text envoltat amb sagnia penjant. */
function drawBullet(doc: PDFDocument, cur: Cur, text: string, font: PDFFont): Cur {
  const size = 7;
  const lineH = 8.3;
  const indent = 12;
  const lines = wrap(font, text, size, A4.w - M * 2 - indent);
  lines.forEach((l, i) => {
    cur = ensure(doc, cur, lineH);
    if (i === 0) cur.page.drawText('•', { x: M, y: cur.y - size, size, font, color: ACCENT });
    cur.page.drawText(l, { x: M + indent, y: cur.y - size, size, font, color: INK });
    cur.y -= lineH;
  });
  cur.y -= 2.5;
  return cur;
}

/** Targeta amb fons suau: label (majúscula, gris) + valor, en graella de 2 columnes. */
function drawCampsClient(
  doc: PDFDocument,
  cur: Cur,
  bold: PDFFont,
  font: PDFFont,
  data: {
    nom: string;
    cognoms: string;
    nacionalitat: string;
    doc: string;
    expedicio: string;
    naixement: string;
    acompanyants: string;
  },
): Cur {
  const rowH = 24;
  const padX = 14;
  const padY = 9;
  // 4 files (Nombre/Apellidos · Nacionalidad/Documento · Expedición/Nacimiento ·
  // Acompañantes) → l'última fila també queda dins de la caixa marcada.
  const boxH = rowH * 4 + padY * 2;
  cur = ensure(doc, cur, boxH + 16);
  const top = cur.y;
  const w = A4.w - M * 2;
  cur.page.drawRectangle({ x: M, y: top - boxH, width: w, height: boxH, color: FIELD_BG, borderColor: LINE, borderWidth: 0.8 });

  const half = (w - padX * 3) / 2;
  const field = (x: number, colW: number, rowTop: number, label: string, value: string) => {
    cur.page.drawText(label.toUpperCase(), { x, y: rowTop - 9, size: 6.5, font: bold, color: MUTED });
    const v = sanitize(value) || '—';
    const fitted = font.widthOfTextAtSize(v, 9.5) > colW ? `${v.slice(0, Math.floor((colW / font.widthOfTextAtSize(v, 9.5)) * v.length))}…` : v;
    cur.page.drawText(fitted, { x, y: rowTop - 22, size: 9.5, font, color: INK });
  };

  let rowTop = top - padY;
  field(M + padX, half, rowTop, 'Nombre', data.nom);
  field(M + padX * 2 + half, half, rowTop, 'Apellidos', data.cognoms);
  rowTop -= rowH;
  field(M + padX, half, rowTop, 'Nacionalidad', data.nacionalitat);
  field(M + padX * 2 + half, half, rowTop, 'Nº de DNI o pasaporte', data.doc);
  rowTop -= rowH;
  field(M + padX, half, rowTop, 'Fecha de expedición', data.expedicio);
  field(M + padX * 2 + half, half, rowTop, 'Fecha de nacimiento', data.naixement);
  rowTop -= rowH;
  field(M + padX, w - padX * 2, rowTop, 'Acompañantes (menores)', data.acompanyants);

  cur.y = top - boxH - 12;
  return cur;
}

/** Bloc de signatura: caixa amb vora granat + nom imprès + lloc i data. */
async function drawSignatura(
  doc: PDFDocument,
  cur: Cur,
  font: PDFFont,
  bold: PDFFont,
  v: ViatgerRow | null,
  nomComplet: string,
  lloc: string,
): Promise<Cur> {
  const boxH = 86;
  cur = ensure(doc, cur, boxH);
  cur.page.drawLine({ start: { x: M, y: cur.y }, end: { x: A4.w - M, y: cur.y }, thickness: 0.8, color: LINE });
  cur.y -= 14;

  const sigW = 230;
  const sigH = 46;
  const sigX = M;
  const sigY = cur.y - 8 - sigH;

  cur.page.drawText('FIRMA DEL HUÉSPED', { x: M, y: cur.y - 7, size: 7, font: bold, color: MUTED });
  cur.page.drawRectangle({ x: sigX, y: sigY, width: sigW, height: sigH, borderColor: ACCENT, borderWidth: 1 });
  if (v?.signatura?.imatge?.startsWith('data:image')) {
    try {
      const b64 = v.signatura.imatge.split(',')[1] ?? '';
      const png = await doc.embedPng(Buffer.from(b64, 'base64'));
      const scale = Math.min((sigW - 8) / png.width, (sigH - 8) / png.height);
      cur.page.drawImage(png, { x: sigX + 4, y: sigY + 4, width: png.width * scale, height: png.height * scale });
    } catch {
      /* signatura no incrustable: es deixa l'espai en blanc */
    }
  }
  if (nomComplet.trim()) {
    cur.page.drawText(sanitize(nomComplet), { x: sigX, y: sigY - 12, size: 8, font, color: MUTED });
  }

  const metaX = sigX + sigW + 30;
  cur.page.drawText('LUGAR Y FECHA', { x: metaX, y: cur.y - 7, size: 7, font: bold, color: MUTED });
  cur.page.drawText(sanitize(lloc) || '—', { x: metaX, y: sigY + sigH - 14, size: 9.5, font, color: INK });

  cur.y = sigY - 22;
  return cur;
}

/** Peu de pàgina discret amb el número de pàgina (aplicat un cop generat tot el document). */
function addFooters(doc: PDFDocument, font: PDFFont): void {
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `Hostal Coll · Reglamento interno de hospedaje — Página ${i + 1} de ${pages.length}`;
    const w = font.widthOfTextAtSize(label, 7.5);
    p.drawText(label, { x: (A4.w - w) / 2, y: 26, size: 7.5, font, color: MUTED });
  });
}

async function renderReglamentDoc(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  establiment: Establiment,
  estancia: Estancia | null,
  v: ViatgerRow | null,
  allViatgers: ViatgerRow[],
): Promise<void> {
  let cur = newPage(doc);
  cur = drawMasthead(doc, cur, bold, 'Reglamento interno de hospedaje');

  const h = v ? viatgerEfectiu(v.huesped, v.dadesCongelades) : null;
  const nomComplet = h ? [h.nom, h.cognom1, h.cognom2].filter(Boolean).join(' ') : '';
  const acompanyants = v
    ? allViatgers
        .filter((x) => x.id !== v.id && x.esMenor)
        .map((x) => {
          const hh = viatgerEfectiu(x.huesped, x.dadesCongelades);
          return `${hh.nom} ${hh.cognom1}`;
        })
        .join(', ')
    : '';

  cur = drawCampsClient(doc, cur, bold, font, {
    nom: h?.nom ?? '',
    cognoms: [h?.cognom1, h?.cognom2].filter(Boolean).join(' '),
    nacionalitat: h?.nacionalitat ?? '',
    doc: h?.numDocument ?? '',
    expedicio: h?.dataExpedicio ? formatDate(h.dataExpedicio) : '',
    naixement: h?.dataNaixement ? formatDate(h.dataNaixement) : '',
    acompanyants,
  });

  cur = drawParagraph(doc, cur, INTRO, font, 7.5, 9.5, 0, MUTED);
  cur.y -= 4;

  cur = drawEyebrow(doc, cur, 'Normas de la casa', bold);
  for (const n of NORMES) cur = drawBullet(doc, cur, n, font);
  cur.y -= 4;

  cur = drawEyebrow(doc, cur, 'Protección de datos', bold);
  const adreca =
    [establiment.adreca, establiment.codiPostal, establiment.poblacio].filter(Boolean).join(', ') || ADRECA_FALLBACK;
  cur = drawParagraph(doc, cur, lopdParagraph(adreca), font, 6.3, 8.2);
  cur.y -= 5;
  cur = drawParagraph(doc, cur, CLOSING, bold, 7, 9);
  cur.y -= 6;

  const lloc = estancia
    ? [v?.signatura?.llocSignatura || establiment.poblacio || 'Calella', formatDate(v?.signatura?.data ?? estancia.dataEntrada)]
        .filter(Boolean)
        .join(', ')
    : '';
  await drawSignatura(doc, cur, font, bold, v, nomComplet, lloc);
}

/**
 * Genera UN document per cada viatger ADULT (esMenor=false) de l'estada, amb les
 * seves dades i la firma ja capturada per al Registre de persones allotjades.
 */
export async function buildReglamentPdf(
  establiment: Establiment,
  estancia: Estancia,
  viatgers: ViatgerRow[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(sanitize(`Reglament intern — ${estancia.numContracte}/${estancia.anyContracte}`), {
    showInWindowTitleBar: true,
  });

  const adults = viatgers.filter((v) => !v.esMenor);
  const rows = adults.length > 0 ? adults : viatgers.length > 0 ? [viatgers[0]!] : [null];
  for (const v of rows) await renderReglamentDoc(doc, font, bold, establiment, estancia, v, viatgers);

  addFooters(doc, font);
  return doc.save();
}

/** Plantilla en blanc (per imprimir i omplir/firmar a mà). */
export async function buildReglamentBlank(establiment: Establiment): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle('Reglamento interno de hospedaje (en blanco)', { showInWindowTitleBar: true });
  await renderReglamentDoc(doc, font, bold, establiment, null, null, []);
  addFooters(doc, font);
  return doc.save();
}

/**
 * Cartell informatiu (per penjar a paret): normes + LOPD, sense dades ni firma.
 * Maquetat COMPACTE i en 2 COLUMNES perquè totes les normes càpiguen en UNA pàgina.
 */
export async function buildCartellPdf(establiment: Establiment): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle('Cartell — Reglamento interno de hospedaje', { showInWindowTitleBar: true });

  const page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;
  const W = A4.w - 2 * M;

  // Paràgraf a amplada completa (mou la `y` externa). No pagina: el cartell és 1 pàgina.
  const para = (f: PDFFont, text: string, size: number, lineH: number, color = INK) => {
    for (const l of wrap(f, text, size, W)) {
      page.drawText(l, { x: M, y: y - size, size, font: f, color });
      y -= lineH;
    }
  };

  // Capçalera compacta.
  page.drawText('HOSTAL COLL', { x: M, y: y - 18, size: 18, font: bold, color: INK });
  y -= 24;
  page.drawText('REGLAMENTO INTERNO DE HOSPEDAJE', { x: M, y: y - 8, size: 8.5, font: bold, color: ACCENT });
  y -= 12;
  page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 1, color: INK });
  page.drawLine({ start: { x: M, y }, end: { x: M + 40, y }, thickness: 2.4, color: ACCENT });
  y -= 13;

  para(font, INTRO, 8, 10, MUTED);
  y -= 6;

  page.drawText('NORMAS DE LA CASA', { x: M, y: y - 8, size: 8.5, font: bold, color: ACCENT });
  y -= 13;

  // Normes en UNA columna, lletra 9pt.
  const indent = 12;
  for (const t of NORMES) {
    wrap(font, t, 9, W - indent).forEach((l, i) => {
      if (i === 0) page.drawText('•', { x: M, y: y - 9, size: 9, font, color: ACCENT });
      page.drawText(l, { x: M + indent, y: y - 9, size: 9, font, color: INK });
      y -= 11;
    });
    y -= 2;
  }
  y -= 4;

  page.drawText('PROTECCIÓN DE DATOS', { x: M, y: y - 8, size: 8.5, font: bold, color: ACCENT });
  y -= 13;
  const adreca =
    [establiment.adreca, establiment.codiPostal, establiment.poblacio].filter(Boolean).join(', ') || ADRECA_FALLBACK;
  para(font, lopdParagraph(adreca), 7, 8.6, MUTED);
  y -= 6;
  para(bold, CLOSING, 7.5, 9.5);

  const label = 'Hostal Coll · Reglamento interno de hospedaje';
  const lw = font.widthOfTextAtSize(label, 7.5);
  page.drawText(label, { x: (A4.w - lw) / 2, y: 26, size: 7.5, font, color: MUTED });

  return doc.save();
}
