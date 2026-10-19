/**
 * Dades de demo extra per al capítol «comptabilitat» (NOMÉS app de proves local).
 *
 * Desa el llibre d'IVA del 2n trimestre de 2026 tal com el desaria l'usuària: obre
 * /imprimir/trimestre-ingressos/2026-2 a l'app de proves i prem «Desar» (la pàgina
 * crida l'API /api/llibre-iva/2026-2). Així surten l'etiqueta «Desat …» de la barra
 * d'eines i la llista «Llibres desats» de Facturació. El 3r trimestre es deixa sense
 * desar (versió generada).
 *
 * Es pot tornar a executar: si el 2026-2 ja està desat, no fa res.
 * Ús: npx tsx scripts/manual/demo-extra/comptabilitat.ts
 */
import { PrismaClient } from '@prisma/client';
import { BASE, obreSessio } from '../lib';

const URL_LOCAL = 'postgresql://manual:manual@localhost:5433/hostalcoll_manual';
const prisma = new PrismaClient({ datasources: { db: { url: URL_LOCAL } } });

async function main() {
  const ja = await prisma.llibreIvaTrimestre.findFirst({ where: { periode: '2026-2' }, select: { id: true } });
  if (ja) {
    console.log('= El llibre d’IVA 2026-2 ja està desat.');
    return;
  }
  const { browser, ctx } = await obreSessio();
  try {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/imprimir/trimestre-ingressos/2026-2`, { waitUntil: 'load', timeout: 180_000 });
    await page.waitForTimeout(2000);
    await page.locator('#save').click();
    await page.locator('#saved').waitFor({ state: 'visible', timeout: 120_000 });
    console.log(`✓ Llibre d’IVA 2026-2 desat (${await page.locator('#saved').textContent()}).`);
  } finally {
    await browser.close();
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
