/**
 * scripts/mossos-upload.ts
 * Auto-pujador del "fitxer massiu" al portal de Mossos d'Esquadra.
 * S'executa AL TEU ORDINADOR (no a Vercel: cal un navegador real).
 *
 * Fa TOT sol: genera el .txt, obre el portal, fa login, puja el fitxer,
 * llegeix la confirmació i la desa a l'app. Els SELECTORS de sota són una
 * primera aproximació (best-effort): si algun no es troba, el script fa una
 * CAPTURA de la pàgina a ./mossos-captures i s'atura indicant-ho — m'envies la
 * captura i l'ajusto en un minut. A partir d'aquí queda 100% automàtic.
 *
 * Preparació (una sola vegada):
 *   pnpm add -D playwright && npx playwright install chromium
 *
 * Ús:
 *   pnpm mossos:upload <estanciaId>        # una estada
 *   pnpm mossos:upload --all-pending       # totes les pendents
 *   pnpm mossos:upload <id> --dry-run      # només login (no puja res) per provar
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildParteFromDb } from '../src/lib/mossos/build-parte';
import { buildFileName, buildFitxerBuffer, isFormatConfirmat, type Encoding } from '../src/lib/mossos/fitxer';
import { decryptString } from '../src/lib/crypto';

const prisma = new PrismaClient();
const PORTAL = 'https://registreviatgers.mossos.gencat.cat';
const CAPTURES = join(process.cwd(), 'mossos-captures');

// ───────────────────────── SELECTORS (best-effort) ─────────────────────────
// Es proven en ordre fins que un funciona. Si cap funciona, captura + atura.
const SEL = {
  usuari: ['input[name*="usuari" i]', 'input[name*="user" i]', '#usuari', '#username', 'input[type="text"]'],
  contrasenya: ['input[type="password"]', 'input[name*="pass" i]', 'input[name*="contrasenya" i]'],
  entrar: ['button[type="submit"]', 'input[type="submit"]', 'text=/entrar|accedir|inicia|login/i'],
  anarMassius: ['text=/fitxers? massi/i', 'text=/càrrega de fitxers/i', 'a:has-text("massi")'],
  inputFitxer: ['input[type="file"]'],
  enviarRegistres: ['text=/enviar registres/i', 'button:has-text("Enviar")', 'input[type="submit"]'],
  confirmacio: ['text=/codi de validació|núm.? de registre|registre correcte|confirmaci/i'],
};

type Page = import('playwright').Page;

async function clickFirst(page: Page, candidates: string[], what: string, timeout = 8000) {
  for (const sel of candidates) {
    const el = page.locator(sel).first();
    if (await el.count().catch(() => 0)) {
      try {
        await el.click({ timeout });
        return true;
      } catch {
        /* prova el següent */
      }
    }
  }
  await captura(page, `no-trobat-${what}`);
  throw new Error(`No he trobat "${what}" al portal. He desat una captura a ./mossos-captures — passa-me-la i ajusto el selector.`);
}

async function fillFirst(page: Page, candidates: string[], value: string, what: string) {
  for (const sel of candidates) {
    const el = page.locator(sel).first();
    if (await el.count().catch(() => 0)) {
      try {
        await el.fill(value, { timeout: 8000 });
        return true;
      } catch {
        /* següent */
      }
    }
  }
  await captura(page, `no-trobat-${what}`);
  throw new Error(`No he trobat el camp "${what}". Captura desada a ./mossos-captures — passa-me-la i ho ajusto.`);
}

async function captura(page: Page, nom: string) {
  try {
    mkdirSync(CAPTURES, { recursive: true });
    await page.screenshot({ path: join(CAPTURES, `${nom}.png`), fullPage: true });
  } catch {
    /* ignore */
  }
}

async function credencials() {
  const e = await prisma.establiment.findFirst();
  if (!e?.mossosUser || !e.mossosPassEnc) throw new Error('Falten les credencials de Mossos (configura-les a /config).');
  if (!e.fileIdentifier) throw new Error('Falta el file_identifier de l’establiment (a /config).');
  return { user: e.mossosUser, pass: decryptString(e.mossosPassEnc) };
}

async function generaFitxer(estanciaId: string) {
  const [establiment, estancia, viatgers] = await Promise.all([
    prisma.establiment.findFirstOrThrow(),
    prisma.estancia.findUniqueOrThrow({ where: { id: estanciaId } }),
    prisma.estanciaViatger.findMany({ where: { estanciaId }, include: { huesped: true }, orderBy: { esTitular: 'desc' } }),
  ]);
  const parte = buildParteFromDb(establiment, estancia, viatgers);
  const encoding = (establiment.encoding as Encoding) || 'latin1';
  const seq = (await prisma.enviamentMossos.count()) + 1;
  const fitxerNom = buildFileName(establiment.fileIdentifier!, seq);
  mkdirSync(CAPTURES, { recursive: true });
  const path = join(CAPTURES, fitxerNom);
  writeFileSync(path, buildFitxerBuffer(parte, encoding));
  return { path, fitxerNom };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target && !args.includes('--all-pending')) {
    console.error('Ús: pnpm mossos:upload <estanciaId> | --all-pending [--dry-run]');
    process.exit(1);
  }
  if (!isFormatConfirmat() && !dryRun) {
    console.warn('⚠ FORMAT PROVISIONAL: el .txt pot no ser acceptat. Prova primer amb --dry-run o supervisa la pujada.');
  }

  const { user, pass } = await credencials();

  let chromium: typeof import('playwright').chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright no instal·lat: pnpm add -D playwright && npx playwright install chromium');
  }

  const ids = args.includes('--all-pending')
    ? (await prisma.estancia.findMany({
        where: { deletedAt: null, enviaments: { none: { estat: { in: ['ENVIAT', 'ACCEPTAT'] } } } },
        select: { id: true },
      })).map((e) => e.id)
    : [target!];

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  try {
    // ── Login ──
    await page.goto(PORTAL, { waitUntil: 'domcontentloaded' });
    await fillFirst(page, SEL.usuari, user, 'usuari');
    await fillFirst(page, SEL.contrasenya, pass, 'contrasenya');
    await clickFirst(page, SEL.entrar, 'botó entrar');
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log('✔ Login fet.');

    if (dryRun) {
      await captura(page, 'dry-run-despres-login');
      console.log('Dry-run: login OK. Captura a ./mossos-captures. No s’ha pujat res.');
      return;
    }

    for (const id of ids) {
      const { path, fitxerNom } = await generaFitxer(id);
      console.log(`→ ${fitxerNom}`);
      await clickFirst(page, SEL.anarMassius, 'menú fitxers massius');
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.locator(SEL.inputFitxer[0]!).first().setInputFiles(path);
      await clickFirst(page, SEL.enviarRegistres, 'botó enviar registres');
      await page.waitForLoadState('networkidle').catch(() => {});
      await captura(page, `resultat-${fitxerNom}`);

      // Intenta llegir un codi de confirmació del text de la pàgina.
      const text = await page.textContent('body').catch(() => '');
      const codi = /([A-Z0-9]{6,})/.exec(text ?? '')?.[1] ?? null;
      await prisma.enviamentMossos.updateMany({
        where: { estanciaId: id, fitxerNom },
        data: { estat: 'ENVIAT', dataEnviament: new Date(), codiValidacio: codi },
      });
      console.log(`✔ Pujat ${fitxerNom}. Revisa ./mossos-captures/resultat-${fitxerNom}.png i confirma el codi a l’app.`);
    }
  } finally {
    await browser.close();
  }
}

main()
  .catch((err) => {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
