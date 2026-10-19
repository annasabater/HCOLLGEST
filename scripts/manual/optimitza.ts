/**
 * Converteix les fotos del manual (public/manual/fotos/*.jpg, grans, fetes per
 * captures.ts) a WebP més lleugers (public/manual/fotos/*.webp), que són els que
 * mostra l'app i el PDF. Els .jpg no es pugen al repositori.
 * Ús: pnpm manual:optimitza
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = join(process.cwd(), 'public', 'manual', 'fotos');

async function main() {
  let abans = 0;
  let despres = 0;
  const fitxers = readdirSync(DIR).filter((f) => f.endsWith('.jpg'));
  for (const f of fitxers) {
    const src = join(DIR, f);
    const dst = join(DIR, f.replace(/\.jpg$/, '.webp'));
    await sharp(src).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 78 }).toFile(dst);
    abans += statSync(src).size;
    despres += statSync(dst).size;
  }
  const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
  console.log(`${fitxers.length} fotos: ${mb(abans)} MB → ${mb(despres)} MB`);
}

(process.argv[2] === "pdf" ? fotosPdf() : main()).catch((e) => {
  console.error(e);
  process.exit(1);
});

/** Versió per al PDF (JPG petit, que Chromium incrusta sense recomprimir). No es puja al repo. */
export async function fotosPdf() {
  const out = join(process.cwd(), 'public', 'manual', 'fotos-pdf');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.webp'))) {
    await sharp(join(DIR, f)).resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 68, mozjpeg: true }).toFile(join(out, f.replace(/\.webp$/, '.jpg')));
  }
}
