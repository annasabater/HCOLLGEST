/**
 * Conector de subida a Mossos via NAVEGADOR REMOT (Browserbase).
 *
 * Com que Vercel no pot executar un navegador, la pujada al portal de Mossos
 * (registreviatgers.mossos.gencat.cat) es fa amb un Chromium al núvol de
 * Browserbase, conduït per Playwright (connectOverCDP). Els SELECTORS s'han
 * capturat d'una sessió real del portal (playwright codegen, juny 2026).
 *
 * Flux: login → "Fitxers massius de viatgers" → pujar .txt → Acceptar →
 *       llegir resultat → descarregar comprovant (best-effort).
 *
 * ⚠ Mai loguejar credencials.
 */
import 'server-only';
import { chromium, type Page } from 'playwright-core';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getBrowserbaseConfig } from '../env';

const PORTAL = 'https://registreviatgers.mossos.gencat.cat/mossos_hotels/AppJava/login.do';

export interface ConnectorInput {
  fileBuffer: Buffer;
  fitxerNom: string;
  user: string;
  pass: string;
}

export interface ConnectorResult {
  ok: boolean;
  codiValidacio?: string;
  comprovant?: Buffer;
  comprovantNom?: string;
  errorMsg?: string;
}

/** Hi ha navegador remot configurat? (Browserbase) */
export function connectorAvailable(): boolean {
  return getBrowserbaseConfig() !== null;
}

const SEL = {
  usuari: ['input[name="j_username"]', 'input[name*="user" i]', '#username'],
  contrasenya: ['input[name="j_password"]', 'input[type="password"]'],
  entrar: ['button:has-text("Aceptar")', 'button:has-text("Acceptar")', 'input[type="submit"]', 'button[type="submit"]'],
  anarMassius: ['a:has-text("Fitxers massius")', 'text=/fitxers? massi/i'],
  inputFitxer: ['input[type="file"]'],
  enviar: ['button:has-text("Acceptar")', 'button:has-text("Aceptar")', 'input[type="submit"]', 'button[type="submit"]'],
  comprovant: ['a:has-text("Descarregar comprovant")', 'text=/descarregar comprovant/i'],
};

/** Prova diversos selectors fins que un funciona (robust a canvis d'idioma). */
async function clickFirst(page: Page, sels: string[], timeout = 12000): Promise<boolean> {
  for (const sel of sels) {
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
  return false;
}
async function fillFirst(page: Page, sels: string[], value: string): Promise<boolean> {
  for (const sel of sels) {
    const el = page.locator(sel).first();
    if (await el.count().catch(() => 0)) {
      try {
        await el.fill(value, { timeout: 12000 });
        return true;
      } catch {
        /* següent */
      }
    }
  }
  return false;
}

/** Crea una sessió de Browserbase i retorna la URL de connexió CDP. */
async function createBrowserbaseSession(apiKey: string, projectId: string): Promise<string> {
  const res = await fetch('https://api.browserbase.com/v1/sessions', {
    method: 'POST',
    headers: { 'X-BB-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) {
    throw new Error(`Browserbase: no s'ha pogut crear la sessió (HTTP ${res.status})`);
  }
  const s = (await res.json()) as { id: string; connectUrl?: string };
  return s.connectUrl || `wss://connect.browserbase.com?apiKey=${apiKey}&sessionId=${s.id}`;
}

export async function pujaFitxerAMossos(input: ConnectorInput): Promise<ConnectorResult> {
  const cfg = getBrowserbaseConfig();
  if (!cfg) {
    return { ok: false, errorMsg: 'Browserbase no està configurat (falta BROWSERBASE_API_KEY/PROJECT_ID).' };
  }

  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;
  try {
    const connectUrl = await createBrowserbaseSession(cfg.apiKey, cfg.projectId);
    browser = await chromium.connectOverCDP(connectUrl);
    const ctx = browser.contexts()[0] ?? (await browser.newContext());
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    page.setDefaultTimeout(20000);

    // 1) Login
    await page.goto(PORTAL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!(await fillFirst(page, SEL.usuari, input.user)))
      return { ok: false, errorMsg: 'No s’ha trobat el camp d’usuari al portal de Mossos.' };
    await fillFirst(page, SEL.contrasenya, input.pass);
    await clickFirst(page, SEL.entrar);
    await page.waitForLoadState('networkidle').catch(() => {});

    // Login fallit si encara hi ha el camp de contrasenya.
    if (await page.locator(SEL.contrasenya[0]!).count().catch(() => 0)) {
      return { ok: false, errorMsg: 'Login a Mossos incorrecte (revisa usuari/contrasenya a Configuració).' };
    }

    // 2) Anar a "Fitxers massius de viatgers"
    if (!(await clickFirst(page, SEL.anarMassius)))
      return { ok: false, errorMsg: 'No s’ha trobat el menú "Fitxers massius de viatgers".' };
    await page.waitForLoadState('networkidle').catch(() => {});

    // 3) Pujar el fitxer (des de buffer en memòria)
    const fileInput = page.locator(SEL.inputFitxer[0]!).first();
    if (!(await fileInput.count().catch(() => 0)))
      return { ok: false, errorMsg: 'No s’ha trobat el camp per adjuntar el fitxer.' };
    await fileInput.setInputFiles({
      name: input.fitxerNom,
      mimeType: 'text/plain',
      buffer: input.fileBuffer,
    });
    await clickFirst(page, SEL.enviar);
    await page.waitForLoadState('networkidle').catch(() => {});

    // 4) Resultat: el portal valida automàticament. L'enllaç del comprovant
    //    només apareix si l'operació ha estat correcta.
    const text = (await page.textContent('body').catch(() => '')) ?? '';
    const teComprovant = (await page.locator(SEL.comprovant[0]!).count().catch(() => 0)) > 0;
    const exit = teComprovant || /èxit|exit|correctament/i.test(text);

    if (!exit) {
      const msg = text.replace(/\s+/g, ' ').trim().slice(0, 500);
      return { ok: false, errorMsg: `El portal no ha acceptat el fitxer: ${msg || 'error desconegut'}` };
    }

    // 5) Descarregar el comprovant (best-effort; no és el registre legal).
    let comprovant: Buffer | undefined;
    let comprovantNom: string | undefined;
    try {
      const dlPromise = page.waitForEvent('download', { timeout: 15000 });
      await clickFirst(page, SEL.comprovant, 8000);
      const download = await dlPromise;
      const dir = await mkdtemp(join(tmpdir(), 'mossos-'));
      const base = `comprovant-${input.fitxerNom.replace(/\.txt$/, '')}.pdf`;
      const dest = join(dir, base);
      await download.saveAs(dest);
      comprovant = await readFile(dest);
      comprovantNom = base;
    } catch {
      /* si no es baixa el comprovant, seguim: l'enviament s'ha fet igual */
    }

    const codiValidacio = /([A-Z0-9]{6,})/.exec(text)?.[1];
    return { ok: true, codiValidacio, comprovant, comprovantNom };
  } catch (err) {
    return { ok: false, errorMsg: err instanceof Error ? err.message : 'Error pujant a Mossos' };
  } finally {
    await browser?.close().catch(() => {});
  }
}
