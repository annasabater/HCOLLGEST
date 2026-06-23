/**
 * Processat de fotos de documents d'identitat: blanc i negre + marca d'aigua
 * repetida. Així la còpia que es desa no es pot reutilitzar (protecció de dades).
 * Només per a imatges; els PDF es desen tal qual.
 */
import 'server-only';
import sharp from 'sharp';

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;',
  );
}

export interface ProcessedImage {
  buffer: Buffer;
  mime: string;
  ext: string;
}

/** Converteix la imatge a escala de grisos i hi superposa la marca d'aigua. */
export async function processarDocumentImatge(input: Buffer, marca: string): Promise<ProcessedImage> {
  const base = sharp(input).rotate(); // respecta l'orientació EXIF (fotos de mòbil)
  const meta = await base.metadata();
  const w = Math.max(1, meta.width ?? 1200);
  const h = Math.max(1, meta.height ?? 800);

  const fontSize = Math.max(14, Math.round(w / 24));
  const stepX = Math.max(180, Math.round(w / 2.2));
  const stepY = Math.max(90, Math.round(h / 5));
  const text = escapeXml(marca);

  let tiles = '';
  for (let y = stepY; y < h + stepY; y += stepY) {
    for (let x = -Math.round(w * 0.2); x < w; x += stepX) {
      tiles +=
        `<text x="${x}" y="${y}" transform="rotate(-28 ${x} ${y})" ` +
        `font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${fontSize}" ` +
        `fill="#000000" fill-opacity="0.16">${text}</text>`;
    }
  }
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${tiles}</svg>`;

  const buffer = await base
    .grayscale()
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 78 })
    .toBuffer();

  return { buffer, mime: 'image/jpeg', ext: 'jpg' };
}
