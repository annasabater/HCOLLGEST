/**
 * Generador PDF (pdf-lib) del "Libro de Registro de Alojamiento" (NRA/NRUA)
 * per a una estada: dades de l'establiment, viatgers (fins a 4 per full),
 * contracte, pagament i signatures. Reutilitzable per a descàrrega i export a Drive.
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from 'pdf-lib';
import { PARENTESC_LABELS } from '../validation/enums';

const A4 = { w: 595.28, h: 841.89 };
const M = 28;
const LINE = rgb(0.17, 0.17, 0.17);
const LBLBG = rgb(0.95, 0.94, 0.93);
const INK = rgb(0.1, 0.1, 0.1);

const MESOS_DOC: Record<string, 'NIF' | 'Pas' | 'TIE' | ''> = {
  DNI_NIF: 'NIF', PASSAPORT: 'Pas', NIE: 'TIE', ALTRES: '',
};

function sanitize(s: string): string {
  return (s ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}
function fmtDate(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}
function fmtHora(d: Date | null | undefined): string {
  if (!d) return '';
  const h = d.getHours(), m = d.getMinutes();
  return h === 0 && m === 0 ? '' : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface HuespedLite {
  nom: string; cognom1: string; cognom2: string | null; sexe: string | null;
  tipusDocument: string | null; numDocument: string | null; numSuport: string | null;
  nacionalitat: string | null; dataNaixement: Date | null; adreca: string | null;
  municipi: string | null; localitat: string | null; pais: string | null;
  telefon: string | null; email: string | null;
}
interface ViatgerLite {
  parentesc: string | null;
  huesped: HuespedLite;
  signatura: { imatge: string } | null;
}
interface EstanciaLite {
  numContracte: string; anyContracte: number;
  dataFormalitzacio: Date; dataEntrada: Date | null; dataSortida: Date | null;
  numHabitacions: number | null; teInternet: boolean | null;
  habitacio: { nom: string } | null;
  viatgers: ViatgerLite[];
  cobraments: { metode: string }[];
}
interface EstablimentLite {
  nom: string; raoSocial: string | null; cif: string | null;
  poblacio: string | null; adreca: string | null; codiPostal: string | null;
  fileIdentifier: string | null;
}

export async function buildRegistrePdf(
  est: EstablimentLite | null,
  estancia: EstanciaLite,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const emNom = est?.raoSocial || est?.nom || 'Hostal Coll';
  const emCif = est?.cif ?? '';
  const emMunicipi = est?.poblacio ?? '';
  const emAdreca = [est?.adreca, est?.codiPostal, est?.poblacio].filter(Boolean).join(', ');
  const nra = est?.fileIdentifier ?? '';

  const metodes = new Set(estancia.cobraments.map((c) => c.metode));
  const numRef = `${estancia.numContracte}/${estancia.anyContracte}`;

  // Viatgers en grups de 4.
  const grups: ViatgerLite[][] = [];
  for (let i = 0; i < estancia.viatgers.length; i += 4) grups.push(estancia.viatgers.slice(i, i + 4));
  if (grups.length === 0) grups.push([]);

  // Precarrega les imatges de signatura.
  const sigCache = new Map<string, PDFImage>();
  for (const v of estancia.viatgers) {
    const img = v.signatura?.imatge;
    if (!img || sigCache.has(img)) continue;
    try {
      const b64 = img.includes(',') ? (img.split(',')[1] ?? '') : img;
      const bytes = Buffer.from(b64, 'base64');
      const embedded = img.includes('image/jpeg') || img.includes('jpg')
        ? await doc.embedJpg(bytes)
        : await doc.embedPng(bytes);
      sigCache.set(img, embedded);
    } catch { /* signatura no vàlida, s'ignora */ }
  }

  for (let gi = 0; gi < grups.length; gi++) {
    const grup = grups[gi] ?? [];
    const page = doc.addPage([A4.w, A4.h]);
    let y = A4.h - M;

    const text = (s: string, x: number, size: number, f: PDFFont = font, color = INK) =>
      page.drawText(sanitize(s), { x, y: y - size + 2, size, font: f, color });

    // Cel·la amb vora + text (retallat si sobra).
    const cell = (x: number, w: number, h: number, label: string, value: string, opts: { lblCol?: boolean } = {}) => {
      page.drawRectangle({ x, y: y - h, width: w, height: h, borderColor: LINE, borderWidth: 0.7, color: opts.lblCol ? LBLBG : undefined });
      const pad = 3;
      const size = 6.5;
      let out = sanitize(value);
      while (out && font.widthOfTextAtSize(out, size) > w - pad * 2) out = out.slice(0, -1);
      page.drawText(sanitize(label), { x: x + pad, y: y - 8, size: 6, font: bold, color: rgb(0.35, 0.35, 0.35) });
      page.drawText(out, { x: x + pad, y: y - h + 4, size, font, color: INK });
    };

    // Títol.
    text(`Número de Registro de Alquiler (NRA o NRUA): ${nra}`, M, 9, bold);
    y -= 16;

    // ── Establiment (Ejercicio Profesional) ──
    text('Ejercicio Profesional', M, 8, bold);
    y -= 12;
    const colW = (A4.w - M * 2) / 2;
    const rowsEmpr: [string, string][] = [
      ['Nombre/Razón social', emNom],
      ['NIF o CIF', emCif],
      ['Municipio', emMunicipi],
      ['Provincia', 'Barcelona'],
      ['Tel. Fijo y/o Móvil', '+34 687 55 82 48'],
      ['Email', 'hostalcoll@gmail.com'],
      ['Web', 'hostalcoll.com'],
    ];
    for (const [l, v] of rowsEmpr) {
      cell(M, colW, 16, l, v);
      y -= 16;
    }

    // ── Viatgers ──
    y -= 6;
    text('Viajeros', M, 8, bold);
    y -= 12;
    const lblW = 90;
    const vW = (A4.w - M * 2 - lblW) / 4;
    const rowH = 15;
    const drawViatgerRow = (label: string, cellFn: (v: ViatgerLite | undefined, idx: number) => string) => {
      page.drawRectangle({ x: M, y: y - rowH, width: lblW, height: rowH, borderColor: LINE, borderWidth: 0.7, color: LBLBG });
      page.drawText(sanitize(label), { x: M + 3, y: y - rowH + 4.5, size: 6.5, font: bold, color: rgb(0.3, 0.3, 0.3) });
      for (let i = 0; i < 4; i++) {
        const x = M + lblW + vW * i;
        page.drawRectangle({ x, y: y - rowH, width: vW, height: rowH, borderColor: LINE, borderWidth: 0.7 });
        let out = sanitize(cellFn(grup[i], i));
        while (out && font.widthOfTextAtSize(out, 6.5) > vW - 6) out = out.slice(0, -1);
        page.drawText(out, { x: x + 3, y: y - rowH + 4.5, size: 6.5, font, color: INK });
      }
      y -= rowH;
    };

    // Capçalera Nº viajeros
    drawViatgerRow('Nº viajeros', (v, i) => `${i + 1}${v ? '  [X]' : '  [ ]'}`);
    drawViatgerRow('Nombre', (v) => v?.huesped.nom ?? '');
    drawViatgerRow('1er apellido', (v) => v?.huesped.cognom1 ?? '');
    drawViatgerRow('2do apellido', (v) => v?.huesped.cognom2 ?? '');
    drawViatgerRow('Sexo', (v) => v ? (v.huesped.sexe === 'HOME' ? 'Masc.' : v.huesped.sexe === 'DONA' ? 'Fem.' : '') : '');
    drawViatgerRow('Tipo documento', (v) => v?.huesped.tipusDocument ? (MESOS_DOC[v.huesped.tipusDocument] || '') : '');
    drawViatgerRow('Nº documento', (v) => v?.huesped.numDocument ?? '');
    drawViatgerRow('Nº Soporte', (v) => v?.huesped.numSuport ?? '');
    drawViatgerRow('Nacionalidad', (v) => v?.huesped.nacionalitat ?? '');
    drawViatgerRow('F. nacimiento', (v) => fmtDate(v?.huesped.dataNaixement));
    drawViatgerRow('Domicilio', (v) => v?.huesped.adreca ?? '');
    drawViatgerRow('Localidad/País', (v) => v ? [v.huesped.municipi ?? v.huesped.localitat, v.huesped.pais].filter(Boolean).join(', ') : '');
    drawViatgerRow('Tel. Móvil', (v) => v?.huesped.telefon ?? '');
    drawViatgerRow('Email', (v) => v?.huesped.email ?? '');
    drawViatgerRow('Parentesco', (v) => v?.parentesc ? PARENTESC_LABELS[v.parentesc as keyof typeof PARENTESC_LABELS] : '');

    // ── Contracte ──
    y -= 8;
    text('Contrato', M, 8, bold);
    y -= 12;
    const w2 = (A4.w - M * 2) / 2;
    cell(M, w2, 16, 'Nº Referencia', numRef); cell(M + w2, w2, 16, 'Fecha', fmtDate(estancia.dataFormalitzacio)); y -= 16;
    cell(M, A4.w - M * 2, 16, 'Fecha y hora de entrada', `${fmtDate(estancia.dataEntrada)} ${fmtHora(estancia.dataEntrada)}`.trim()); y -= 16;
    cell(M, A4.w - M * 2, 16, 'Fecha y hora de salida', `${fmtDate(estancia.dataSortida)} ${fmtHora(estancia.dataSortida)}`.trim()); y -= 16;
    cell(M, A4.w - M * 2, 16, 'Dirección del inmueble', emAdreca); y -= 16;
    cell(M, w2, 16, 'Nº habitaciones', estancia.numHabitacions != null ? String(estancia.numHabitacions) : (estancia.habitacio?.nom ?? ''));
    cell(M + w2, w2, 16, 'Conexión a Internet', estancia.teInternet === true ? 'Sí' : estancia.teInternet === false ? 'No' : ''); y -= 16;

    // ── Pagament ──
    const pagStr = [
      metodes.has('EFECTIU') ? '[X] Efectivo' : '[ ] Efectivo',
      metodes.has('TARGETA') ? '[X] Tarjeta' : '[ ] Tarjeta',
      metodes.has('TRANSFERENCIA') ? '[X] Transferencia' : '[ ] Transferencia',
      metodes.has('BIZUM') ? '[X] Bizum' : '[ ] Bizum',
      metodes.has('ALTRES') ? '[X] Otros' : '[ ] Otros',
    ].join('   ');
    cell(M, A4.w - M * 2, 16, 'Medio de pago', pagStr); y -= 16;

    // ── Signatures ──
    y -= 8;
    text('Firmas', M, 8, bold);
    y -= 4;
    const sigW = (A4.w - M * 2) / 4;
    const sigH = 54;
    for (let i = 0; i < 4; i++) {
      const x = M + sigW * i;
      page.drawRectangle({ x, y: y - sigH, width: sigW, height: sigH, borderColor: LINE, borderWidth: 0.7 });
      const v = grup[i];
      const img = v?.signatura?.imatge ? sigCache.get(v.signatura.imatge) : undefined;
      if (img) {
        const scale = Math.min((sigW - 8) / img.width, (sigH - 8) / img.height, 1);
        page.drawImage(img, { x: x + (sigW - img.width * scale) / 2, y: y - sigH + (sigH - img.height * scale) / 2, width: img.width * scale, height: img.height * scale });
      }
    }
    y -= sigH;

    if (grups.length > 1) {
      page.drawText(`Hoja ${gi + 1} de ${grups.length}`, { x: A4.w - M - 60, y: M - 6, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
    }
  }

  return doc.save();
}
