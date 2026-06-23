import { test, expect, type Page } from '@playwright/test';

/**
 * Proves e2e dels fluxos crítics. El login fa servir credencials per variables
 * d'entorn (mai al codi):
 *   E2E_EMAIL=...  E2E_PASSWORD=...  pnpm test:e2e
 * Si no s'han definit, les proves que necessiten sessió es marquen com a "skip".
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const hasCreds = !!EMAIL && !!PASSWORD;

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(EMAIL!);
  await page.locator('input[type="password"]').fill(PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/'); // redirecció al tauler
}

test('la pàgina de login es mostra', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test.describe('amb sessió', () => {
  test.skip(!hasCreds, 'Defineix E2E_EMAIL i E2E_PASSWORD per executar aquestes proves.');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('el tauler carrega', async ({ page }) => {
    await expect(page.getByText(/Resum del dia|Hola/i)).toBeVisible();
  });

  test('el formulari de nova estada carrega (flux de registre)', async ({ page }) => {
    await page.goto('/estancies/nou');
    await expect(page.getByText(/Tipus de registre|Dades de l.?estada/i)).toBeVisible();
  });

  test('la facturació carrega (flux de factures)', async ({ page }) => {
    const res = await page.goto('/factures');
    // ADMIN: 200 i no redirigit a /login.
    expect(page.url()).not.toContain('/login');
    expect(res?.status()).toBeLessThan(400);
  });
});
