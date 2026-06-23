/**
 * Genera la fitxa PDF "Registre de persones allotjades" d'una estada, amb les
 * dades dels viatgers i la SIGNATURA capturada (a la tablet) incrustada.
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Establiment, Estancia, EstanciaViatger, Huesped, Signatura } from '@prisma/client';
import { formatDate } from '../utils';
import { TIPUS_DOCUMENT_LABELS, TIPUS_PAGAMENT_LABELS, TIPUS_REGISTRE_LABELS } from '../validation/enums';

type ViatgerRow = EstanciaViatger & { huesped: Huesped; signatura: Signatura | null };

const A4 = { w: 595.28, h: 841.89 };
const M = 50; // marge
const GRANATE = rgb(0.478, 0.122, 0.169); // #7A1F2B

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
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;

  const ensure = (need: number) => {
    if (y - need < M) {
      page = doc.addPage([A4.w, A4.h]);
      y = A4.h - M;
    }
  };
  const text = (
    s: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {},
  ) => {
    const size = opts.size ?? 10;
    ensure(size + 6);
    page.drawText(sanitize(s), {
      x: opts.x ?? M,
      y: y - size,
      size,
      font: opts.bold ? bold : font,
      color: opts.color ?? rgb(0.1, 0.1, 0.12),
    });
    y -= size + 6;
  };
  const rule = () => {
    ensure(10);
    page.drawLine({
      start: { x: M, y: y - 2 },
      end: { x: A4.w - M, y: y - 2 },
      thickness: 0.6,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 10;
  };
  const gap = (h = 8) => {
    y -= h;
  };

  // Capçalera
  text('Registre de persones allotjades', { size: 18, bold: true, color: GRANATE });
  gap(2);
  text(
    `${establiment.nom} · CIF ${establiment.cif} · Id policial ${establiment.idPolicial} · ${establiment.provincia}`,
    { size: 9, color: rgb(0.4, 0.4, 0.4) },
  );
  gap(4);
  rule();

  // Dades de l'estada
  text('Dades de l’estada', { size: 12, bold: true });
  text(
    `Tipus: ${TIPUS_REGISTRE_LABELS[estancia.tipusRegistre]}   ·   Contracte: ${estancia.numContracte}/${estancia.anyContracte}`,
  );
  text(
    `Entrada: ${formatDate(estancia.dataEntrada)}   ·   Sortida: ${formatDate(estancia.dataSortida)}   ·   Viatgers: ${estancia.numViatgers}`,
  );
  text(`Pagament: ${TIPUS_PAGAMENT_LABELS[estancia.tipusPagament]}`);
  gap(4);
  rule();

  // Viatgers
  for (let i = 0; i < viatgers.length; i++) {
    const v = viatgers[i]!;
    const h = v.huesped;
    ensure(120);
    text(
      `Viatger ${i + 1} — ${h.nom} ${h.cognom1} ${h.cognom2 ?? ''}${v.esTitular ? '  (titular)' : ''}`,
      { size: 12, bold: true },
    );
    const doctxt = h.tipusDocument
      ? `${TIPUS_DOCUMENT_LABELS[h.tipusDocument]} ${h.numDocument ?? ''}`
      : '—';
    text(
      `Document: ${doctxt}   ·   Naixement: ${formatDate(h.dataNaixement)}   ·   Nacionalitat: ${h.nacionalitat ?? '—'}`,
    );
    const adreca = [h.adreca, h.codiPostal, h.municipi ?? h.localitat, h.provincia, h.pais]
      .filter(Boolean)
      .join(', ');
    text(`Adreça: ${adreca || '—'}`);
    gap(2);

    // Signatura
    text('Signatura de la persona allotjada:', { size: 9, color: rgb(0.4, 0.4, 0.4) });
    if (v.signatura?.imatge?.startsWith('data:image')) {
      try {
        const b64 = v.signatura.imatge.split(',')[1] ?? '';
        const bytes = Buffer.from(b64, 'base64');
        const png = await doc.embedPng(bytes);
        const w = 150;
        const hgt = (png.height / png.width) * w;
        ensure(hgt + 14);
        page.drawImage(png, { x: M, y: y - hgt, width: w, height: hgt });
        y -= hgt + 4;
        text(
          `Signat ${formatDate(v.signatura.data)} ${v.signatura.hora}${v.signatura.llocSignatura ? ` · ${v.signatura.llocSignatura}` : ''}`,
          { size: 8, color: rgb(0.5, 0.5, 0.5) },
        );
      } catch {
        text('(signatura no disponible)', { size: 8, color: rgb(0.6, 0.6, 0.6) });
      }
    } else {
      // Espai per a signatura manuscrita si encara no s'ha capturat.
      ensure(44);
      page.drawLine({
        start: { x: M, y: y - 36 },
        end: { x: M + 200, y: y - 36 },
        thickness: 0.6,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 44;
    }
    gap(6);
    rule();
  }

  gap(6);
  text(
    'Document generat per HostalColl Gestió. Conservació 3 anys a disposició dels Mossos d’Esquadra (RD 933/2021).',
    { size: 8, color: rgb(0.55, 0.55, 0.55) },
  );

  return doc.save();
}
