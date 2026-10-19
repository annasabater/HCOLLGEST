/**
 * Genera el PDF del manual (public/manual/manual-hostal-coll.pdf) a partir de la
 * pàgina /manual-imprimir de l'app de PROVES. Cal haver fet abans les fotos.
 * Ús: pnpm manual:pdf
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, obreSessio } from './lib';

async function main() {
  const out = join(process.cwd(), 'public', 'manual', 'manual-hostal-coll.pdf');
  mkdirSync(join(process.cwd(), 'public', 'manual'), { recursive: true });
  const { browser, ctx } = await obreSessio({ width: 900, height: 1200 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/manual-imprimir`, { waitUntil: 'networkidle', timeout: 180_000 });
  // Espera que totes les fotos s'hagin carregat.
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); }),
      ),
    );
  });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate:
      '<div style="width:100%;font:9px system-ui,sans-serif;color:#94a3b8;padding:0 14mm;display:flex;justify-content:space-between">' +
      '<span>Hostal Coll · Manual d’usuari</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await browser.close();
  console.log(`PDF: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
