/**
 * Utilitats comunes dels scripts del manual (captures i PDF). NOMÉS treballen
 * contra l'app de PROVES local (dades inventades): mai contra producció.
 */
import { chromium, type Browser, type BrowserContext } from 'playwright-core';

export const BASE = process.env.MANUAL_BASE_URL ?? 'http://localhost:3100';
export const USUARI = process.env.MANUAL_USER ?? 'hostalcoll@gmail.com';
export const CONTRASENYA = process.env.MANUAL_PASS ?? 'Manual2026!';

export function comprovaEntornLocal() {
  const u = new URL(BASE);
  if (!['localhost', '127.0.0.1'].includes(u.hostname)) {
    throw new Error(`Els scripts del manual només es poden fer servir amb l'app de proves local (ara: ${BASE}).`);
  }
}

/** Navegador amb mida de tauleta (iPad horitzontal) i la sessió ja iniciada. */
export async function obreSessio(opts?: { width?: number; height?: number }): Promise<{ browser: Browser; ctx: BrowserContext }> {
  comprovaEntornLocal();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: opts?.width ?? 1180, height: opts?.height ?? 820 },
    deviceScaleFactor: 1.5,
    locale: 'ca-ES',
    timezoneId: 'Europe/Madrid',
  });
  // El pop-up «Cobraments a punt» tapa les fotos: el donem per tancat avui,
  // llevat que la ruta porti ?manualPopup=1 (la foto del mateix pop-up).
  await ctx.addInitScript(() => {
    try {
      if (!location.search.includes('manualPopup=1')) {
        const d = new Date();
        localStorage.setItem('cobrament_popup_dismissed', `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
      }
    } catch {
      /* sense localStorage: res */
    }
  });
  const res = await ctx.request.post(`${BASE}/api/auth/login`, { data: { email: USUARI, password: CONTRASENYA } });
  if (!res.ok()) throw new Error(`No s'ha pogut iniciar sessió a l'app de proves (${res.status()}): ${await res.text()}`);
  return { browser, ctx };
}
