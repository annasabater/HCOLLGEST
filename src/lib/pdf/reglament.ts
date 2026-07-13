/**
 * Generador PDF (pdf-lib) del "Reglamento Interno de Hospedaje" + clàusula LOPD
 * pròpia del hostal (docs/Hostal Coll-NOU LOPD Reglamento interno de Hospedaje.doc).
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
const M = 48;
const INK = rgb(0.08, 0.08, 0.1);
const GREY = rgb(0.42, 0.42, 0.42);

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
): Cur {
  const maxW = A4.w - M * 2 - indent;
  for (const l of wrap(font, text, size, maxW)) {
    cur = ensure(doc, cur, lineH);
    cur.page.drawText(l, { x: M + indent, y: cur.y - size, size, font, color: INK });
    cur.y -= lineH;
  }
  return cur;
}

function drawTitle(doc: PDFDocument, cur: Cur, text: string, bold: PDFFont, size = 13): Cur {
  cur = ensure(doc, cur, size + 14);
  const w = bold.widthOfTextAtSize(text, size);
  cur.page.drawText(text, { x: (A4.w - w) / 2, y: cur.y - size, size, font: bold, color: INK });
  cur.y -= size + 14;
  return cur;
}

function drawSubtitle(doc: PDFDocument, cur: Cur, text: string, bold: PDFFont): Cur {
  cur = ensure(doc, cur, 16);
  cur.page.drawText(text, { x: M, y: cur.y - 10, size: 10, font: bold, color: INK });
  cur.y -= 16;
  return cur;
}

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
  const size = 9.5;
  const rowH = 16;
  const fields: [string, string][] = [
    ['Nombre', data.nom],
    ['Apellidos', data.cognoms],
    ['Nacionalidad', data.nacionalitat],
    ['Nº de DNI o Pasaporte', data.doc],
    ['Fecha de expedición', data.expedicio],
    ['Fecha de nacimiento', data.naixement],
    ['Acompañantes (menores)', data.acompanyants],
  ];
  for (const [label, value] of fields) {
    cur = ensure(doc, cur, rowH);
    cur.page.drawText(`${label}:`, { x: M, y: cur.y - size, size, font: bold, color: GREY });
    cur.page.drawText(sanitize(value) || '—', { x: M + 155, y: cur.y - size, size, font, color: INK });
    cur.y -= rowH;
  }
  cur.y -= 6;
  return cur;
}

async function drawSignatura(
  doc: PDFDocument,
  cur: Cur,
  font: PDFFont,
  bold: PDFFont,
  v: ViatgerRow | null,
  lloc: string,
): Promise<Cur> {
  cur = ensure(doc, cur, 90);
  cur.page.drawText('Firma:', { x: M, y: cur.y - 9, size: 9.5, font: bold, color: GREY });
  const sigX = M + 55;
  const sigY = cur.y - 46;
  const sigW = 220;
  const sigH = 40;
  cur.page.drawRectangle({ x: sigX, y: sigY, width: sigW, height: sigH, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.7 });
  if (v?.signatura?.imatge?.startsWith('data:image')) {
    try {
      const b64 = v.signatura.imatge.split(',')[1] ?? '';
      const png = await doc.embedPng(Buffer.from(b64, 'base64'));
      const scale = Math.min((sigW - 6) / png.width, (sigH - 6) / png.height);
      cur.page.drawImage(png, { x: sigX + 3, y: sigY + 3, width: png.width * scale, height: png.height * scale });
    } catch {
      /* signatura no incrustable: es deixa l'espai en blanc */
    }
  }
  cur.y -= 54;
  cur.page.drawText(`Lugar y fecha: ${lloc}`, { x: M, y: cur.y - 9, size: 8.5, font, color: INK });
  cur.y -= 20;
  return cur;
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
  cur = drawTitle(doc, cur, 'REGLAMENTO INTERNO DE HOSPEDAJE', bold, 13);

  const h = v ? viatgerEfectiu(v.huesped, v.dadesCongelades) : null;
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

  cur = drawParagraph(doc, cur, INTRO, font, 9, 12);
  cur.y -= 6;

  for (const n of NORMES) cur = drawParagraph(doc, cur, `•  ${n}`, font, 8.3, 11.2, 10);
  cur.y -= 4;

  cur = drawSubtitle(doc, cur, 'Protección de datos', bold);
  const adreca =
    [establiment.adreca, establiment.codiPostal, establiment.poblacio].filter(Boolean).join(', ') || ADRECA_FALLBACK;
  cur = drawParagraph(doc, cur, lopdParagraph(adreca), font, 8.3, 11.2);
  cur.y -= 8;
  cur = drawParagraph(doc, cur, CLOSING, bold, 8.6, 12);
  cur.y -= 14;

  const lloc = estancia
    ? [v?.signatura?.llocSignatura || establiment.poblacio || 'Calella', formatDate(v?.signatura?.data ?? estancia.dataEntrada)]
        .filter(Boolean)
        .join(', ')
    : '';
  await drawSignatura(doc, cur, font, bold, v, lloc);
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

  return doc.save();
}

/** Plantilla en blanc (per imprimir i omplir/firmar a mà). */
export async function buildReglamentBlank(establiment: Establiment): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle('Reglamento interno de hospedaje (en blanco)', { showInWindowTitleBar: true });
  await renderReglamentDoc(doc, font, bold, establiment, null, null, []);
  return doc.save();
}

/** Cartell informatiu (per penjar a paret): normes + LOPD, sense dades ni firma. */
export async function buildCartellPdf(establiment: Establiment): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle('Cartell — Reglamento interno de hospedaje', { showInWindowTitleBar: true });

  let cur = newPage(doc);
  cur = drawTitle(doc, cur, 'REGLAMENTO INTERNO DE HOSPEDAJE', bold, 13);
  cur = drawParagraph(doc, cur, INTRO, font, 9, 12);
  cur.y -= 6;
  for (const n of NORMES) cur = drawParagraph(doc, cur, `•  ${n}`, font, 8.3, 11.2, 10);
  cur.y -= 4;
  cur = drawSubtitle(doc, cur, 'Protección de datos', bold);
  const adreca =
    [establiment.adreca, establiment.codiPostal, establiment.poblacio].filter(Boolean).join(', ') || ADRECA_FALLBACK;
  cur = drawParagraph(doc, cur, lopdParagraph(adreca), font, 8.3, 11.2);
  cur.y -= 8;
  drawParagraph(doc, cur, CLOSING, bold, 8.6, 12);

  return doc.save();
}
