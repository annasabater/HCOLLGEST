/**
 * Fotos del manual que el generador (captures.ts) no pot fer sol, NOMÉS contra l'app de PROVES:
 *
 *  - Fotos amb un altre usuari (recepció, compte de propietat de només lectura).
 *  - dd-popup-cobraments: la finestra «Cobraments a punt» només surt si hi ha pagaments previstos
 *    per a avui/demà/demà passat, i aleshores surt a TOTES les pantalles (taparia les fotos dels
 *    altres capítols). Per no tocar dades, la finestra es dibuixa a sobre del tauler amb el mateix
 *    HTML i les mateixes classes que el component real (src/components/dashboard/cobrament-popup.tsx).
 *
 * Aquestes fotos tenen `ometre: true` a les receptes perquè captures.ts no les sobreescrigui.
 *
 * Ús: npx tsx scripts/manual/demo-extra/fotos-especials.ts [id]
 */
import { join } from 'node:path';
import { chromium, type Page, type Locator, type Browser } from 'playwright-core';

const BASE = 'http://localhost:3100';
const OUT = join(process.cwd(), 'public', 'manual', 'fotos');
const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
const PASS = 'Manual2026!';

async function primerVisible(l: Locator): Promise<Locator | null> {
  const n = Math.min(await l.count().catch(() => 0), 12);
  for (let i = 0; i < n; i++) if (await l.nth(i).isVisible().catch(() => false)) return l.nth(i);
  return null;
}
async function troba(page: Page, t: string): Promise<Locator | null> {
  for (const l of [
    page.getByRole('button', { name: t, exact: true }),
    page.getByRole('link', { name: t, exact: true }),
    page.getByText(t, { exact: true }),
    page.getByRole('button', { name: t }),
    page.getByRole('link', { name: t }),
    page.getByText(t),
  ]) {
    const v = await primerVisible(l);
    if (v) return v;
  }
  return null;
}

type Marca = string | ((page: Page) => Locator);

async function marca(page: Page, marques: Marca[]) {
  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  for (const m of marques) {
    const el = typeof m === 'string' ? await troba(page, m) : m(page);
    const b = el && (await el.boundingBox().catch(() => null));
    if (!b) {
      console.log(`   ⚠ no trobo «${String(m)}»`);
      continue;
    }
    const s = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    boxes.push({ x: b.x + s.x, y: b.y + s.y, w: b.width, h: b.height });
  }
  await page.evaluate(
    ({ boxes, nums }) => {
      const cont = document.createElement('div');
      cont.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
      // Si hi ha una finestra modal (<dialog> a la capa superior), les marques s'hi han de posar a dins
      // perquè no quedin tapades.
      const dlg = document.querySelector('dialog[open]') as HTMLElement | null;
      if (dlg) {
        const rc = dlg.getBoundingClientRect();
        dlg.style.overflow = 'visible';
        cont.style.left = `${-rc.left - window.scrollX}px`;
        cont.style.top = `${-rc.top - window.scrollY}px`;
      }
      boxes.forEach((b, i) => {
        const r = document.createElement('div');
        r.style.cssText = `position:absolute;left:${b.x - 4}px;top:${b.y - 4}px;width:${b.w + 8}px;height:${b.h + 8}px;border:3px solid #dc2626;border-radius:8px;box-shadow:0 0 0 3px rgba(255,255,255,.7)`;
        const n = document.createElement('div');
        n.textContent = nums[i] ?? String(i + 1);
        n.style.cssText = `position:absolute;left:${Math.max(2, b.x - 26)}px;top:${Math.max(2, b.y - 22)}px;width:30px;height:30px;border-radius:50%;background:#dc2626;color:#fff;font:700 18px/30px system-ui,sans-serif;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.35)`;
        cont.append(r, n);
      });
      (dlg ?? document.body).appendChild(cont);
      const st = document.createElement('style');
      st.textContent = 'nextjs-portal{display:none!important}';
      document.head.appendChild(st);
    },
    { boxes, nums: NUMS },
  );
}

interface Foto {
  id: string;
  usuari: string;
  ruta: string;
  marques: Marca[];
  mida?: { width: number; height: number };
  abans?: (page: Page) => Promise<void>;
  sencera?: boolean;
  /** Contrasenya, si no és la comuna de proves. */
  contrasenya?: string;
  /** Sense iniciar sessió. */
  anonim?: boolean;
}

const fmtData = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Dibuixa la finestra «Cobraments a punt» amb l'HTML del component real. */
async function posaPopupCobraments(page: Page) {
  const items = [
    { nom: 'Oriol Bosch · 260,00 €', sub: `Ha de pagar el ${fmtData(1)} · Resta de l’estada` },
    { nom: 'Laura Vidal · 180,00 €', sub: `Ha de pagar el ${fmtData(2)} · Segona setmana` },
  ];
  // L'HTML es construeix aquí (a Node) i al navegador només s'insereix.
  {
    const svg = (paths: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">${paths}</svg>`;
    const coins = svg('<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>').replace('h-4 w-4', 'h-5 w-5');
    const check = svg('<path d="M20 6 9 17l-5-5"/>');
    const x = svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');
    const btn = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors';
    const files = items
      .map(
        (c) => `<div class="rounded-xl border border-slate-200 p-3">
          <div class="flex items-start justify-between gap-2"><div class="min-w-0">
            <p class="font-medium text-slate-800">${c.nom}</p>
            <p class="mt-0.5 text-xs text-slate-500">${c.sub}</p>
          </div></div>
          <div class="mt-2 flex items-center gap-2">
            <button class="${btn} bg-brand-700 text-white h-8 px-3 text-sm">${check} Ja està pagat</button>
            <a href="#"><button class="${btn} text-slate-700 h-8 px-3 text-sm">Veure estada</button></a>
          </div></div>`,
      )
      .join('');
    const html = `<div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
      <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div class="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div class="rounded-xl bg-rose-100 p-2.5 text-rose-700">${coins}</div>
          <div class="flex-1">
            <h2 class="font-serif text-lg font-semibold text-slate-900">Cobraments a punt</h2>
            <p class="text-xs text-slate-500">${items.length} cobraments pendents en els pròxims dies</p>
          </div>
        </div>
        <div class="max-h-[60vh] space-y-2 overflow-y-auto px-5 py-4">${files}</div>
        <div class="flex justify-end border-t border-slate-100 px-5 py-3">
          <button class="${btn} border border-slate-300 bg-white text-slate-800 h-10 px-4 text-sm">${x} Tancar per avui</button>
        </div>
      </div></div>`;
    await page.evaluate((h) => {
      const div = document.createElement('div');
      div.innerHTML = h;
      document.body.appendChild(div.firstElementChild!);
    }, html);
  }
}

const WEB = 'file:///C:/Users/LENOVO/hostalcoll/benvinguda.html?lang=ca';
const MOBIL = { width: 390, height: 844 };

/** La pàgina de benvinguda envia la valoració a PRODUCCIÓ: la resposta es simula al navegador i res no surt de l'ordinador. */
async function talliaProduccio(page: Page) {
  await page.route('https://gestio.hostalcoll.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' }, body: '{"ok":true}' }),
  );
}
async function valora(page: Page) {
  await page.locator('#fb-stars').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: '4', exact: true }).click();
  await page.locator('#fb-comment').fill('Molt tranquil i el llit molt còmode.');
  await page.waitForTimeout(500);
  // La pàgina té desplaçament suau: es força l'instantani perquè la foto surti al lloc bo.
  await page.addStyleTag({ content: 'html,body{scroll-behavior:auto!important}' });
  await page.locator('#fb-send').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const h = document.querySelector('#fb-form h2');
    if (h) window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 120);
  });
  await page.waitForTimeout(800);
}

/** Obre la targeta Bugaderia de Configuració i tria l'habitació 3 (el generador no sap triar opcions d'un desplegable). */
async function bugaderiaConfig(page: Page) {
  await page.waitForTimeout(8000);
  await page.getByText('Bugaderia (catàleg i valors per habitació)', { exact: true }).click();
  await page.getByText("Catàleg d'articles i preus").waitFor({ timeout: 60_000 });
  await page.locator('select').filter({ hasText: 'Tria una habitació…' }).selectOption({ label: 'Habitació 3' });
  await page.waitForTimeout(1500);
  await page.getByText("Catàleg d'articles i preus").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
}

const FOTOS: Foto[] = [
  {
    // Cal escriure el telèfon del viatger i sortir del camp (el generador no pot fer «sortir del camp»).
    id: 'avis-al-registre',
    usuari: 'hostalcoll@gmail.com',
    ruta: '/estancies/nou',
    marques: ['Avís intern', 'no acollir'],
    abans: async (page) => {
      await page.waitForTimeout(8000);
      const tel = page.locator('xpath=//label[starts-with(normalize-space(.), "Telèfon")]/following::input[1]').first();
      await tel.fill('600 000 999');
      await tel.press('Tab');
      await page.getByText('Avís intern', { exact: false }).first().waitFor({ timeout: 60_000 });
      await page.waitForTimeout(800);
      await page.getByText('Avís intern', { exact: false }).first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 200));
    },
  },
  {
    // La confirmació és un <dialog> modal: el generador hi dibuixa les marques per sota i no es veuen.
    id: 'personal-eliminar',
    usuari: 'hostalcoll@gmail.com',
    ruta: '/personal',
    marques: ['Eliminar el treballador', (page) => page.locator('dialog[open]').getByRole('button', { name: 'Cancel·lar' }), (page) => page.locator('dialog[open]').getByRole('button', { name: 'Eliminar' })],
    abans: async (page) => {
      await page.waitForTimeout(6000);
      await page.getByRole('button', { name: 'Eliminar' }).first().click();
      await page.waitForTimeout(1500);
    },
  },
  {
    id: 'eliminar-hoste-confirmar',
    usuari: 'hostalcoll@gmail.com',
    ruta: '/huespedes',
    marques: ["Eliminar l'hoste", (page) => page.locator('dialog[open]').getByRole('button', { name: 'Cancel·lar' }), (page) => page.locator('dialog[open]').getByRole('button', { name: 'Eliminar' })],
    abans: async (page) => {
      await page.waitForTimeout(4000);
      await page.getByText('Kowalski', { exact: false }).first().click();
      await page.waitForTimeout(8000);
      await page.getByRole('button', { name: 'Eliminar' }).first().click();
      await page.waitForTimeout(1500);
    },
  },
  {
    // Cal triar el dia d'avui i la Rosa (la persona amb habitacions assignades): el generador no sap
    // triar opcions d'un desplegable.
    id: 'plantilles-neteja',
    usuari: 'hostalcoll@gmail.com',
    ruta: '/plantilles',
    marques: ['Dia a netejar', 'Enviar a', 'Idioma', 'Hora aproximada', 'Tipus de neteja per habitació', 'Missatge', 'Enviar per WhatsApp', 'Copiar'],
    sencera: true,
    abans: async (page) => {
      await page.waitForTimeout(8000);
      await page.getByText('Avís a la dona de neteja', { exact: true }).click();
      await page.waitForTimeout(1500);
      const avui = new Date();
      const iso = `${avui.getFullYear()}-${String(avui.getMonth() + 1).padStart(2, '0')}-${String(avui.getDate()).padStart(2, '0')}`;
      await page.locator('input[type=date]:visible').first().fill(iso);
      const sel = page.locator('select').filter({ hasText: 'Rosa' }).first();
      const opcio = await sel.locator('option', { hasText: 'Rosa' }).first().getAttribute('value');
      if (opcio) await sel.selectOption(opcio);
      await page.waitForTimeout(6000);
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  },
  {
    id: 'dd-config-bugaderia',
    usuari: 'hostalcoll@gmail.com',
    ruta: '/config',
    marques: ["Catàleg d'articles i preus", 'Afegir', 'Valors per defecte per habitació', 'Manteniment', 'Sortida', 'Desar valors per defecte'],
    abans: bugaderiaConfig,
    sencera: true,
  },
  {
    id: 'config-bugaderia',
    usuari: 'hostalcoll@gmail.com',
    ruta: '/config',
    marques: ['Afegir', 'Valors per defecte per habitació', 'Manteniment', 'Sortida', 'Desar valors per defecte'],
    abans: bugaderiaConfig,
    sencera: true,
  },
  {
    id: 'web-benvinguda-estrelles',
    usuari: '',
    anonim: true,
    ruta: WEB,
    mida: MOBIL,
    marques: ['Com has dormit?', 'Vols afegir alguna cosa? (opcional)', 'Enviar valoració'],
    abans: async (page) => {
      await talliaProduccio(page);
      await valora(page);
    },
  },
  {
    id: 'web-benvinguda-gracies',
    usuari: '',
    anonim: true,
    ruta: WEB,
    mida: MOBIL,
    marques: ['Gràcies! 🙏', 'Hem rebut la teva valoració'],
    abans: async (page) => {
      await talliaProduccio(page);
      await valora(page);
      await page.locator('#fb-send').click();
      await page.waitForTimeout(1500);
      await page.locator('#fb-done').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -200));
    },
  },
  {
    // El servidor respon com quan el compte queda bloquejat (20 intents fallits), però la resposta es
    // simula al navegador: així no es bloqueja de debò cap compte de l'app de proves.
    id: 'login-bloquejat',
    usuari: '',
    anonim: true,
    ruta: '/login',
    marques: ['Massa intents fallits. Compte bloquejat 15 minuts.'],
    abans: async (page) => {
      await page.route('**/api/auth/login', (r) =>
        r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Massa intents fallits. Compte bloquejat 15 minuts.' }) }),
      );
      await page.locator('#email').fill('recepcio@hostalcoll.com');
      await page.locator('#password').fill('contrasenya-equivocada');
      await page.getByRole('button', { name: 'Entrar' }).click();
      await page.waitForTimeout(1000);
    },
  },
  {
    id: 'dd-popup-cobraments',
    usuari: 'hostalcoll@gmail.com',
    ruta: '/',
    marques: ['Cobraments a punt', 'Ja està pagat', 'Veure estada', 'Tancar per avui'],
    abans: posaPopupCobraments,
  },
  {
    id: 'restringit-menu',
    usuari: 'hcoll@gmail.com', // a la BD de proves té la contrasenya de proves (demo-extra/00-establiment.ts)
    ruta: '/',
    marques: ['Recepció', 'Gestió', 'Tarifes'],
  },
  {
    id: 'rol-recepcio',
    usuari: 'recepcio@hostalcoll.com',
    ruta: '/',
    // L'usuari de proves es diu «Recepció» i té el rol «Recepció»: es marca la línia del rol (l'última).
    marques: [(page) => page.getByText('Recepció', { exact: true }).last(), 'Sortir'],
    abans: async (page) => {
      await page.getByRole('button', { name: 'Sortir' }).first().scrollIntoViewIfNeeded().catch(() => {});
    },
  },
  {
    id: 'menu-recepcio',
    usuari: 'recepcio@hostalcoll.com',
    ruta: '/',
    marques: ['Facturació', 'Despeses', 'Recepció'],
  },
];

async function main() {
  const filtre = process.argv[2];
  const browser: Browser = await chromium.launch();
  for (const f of FOTOS.filter((x) => !filtre || x.id === filtre)) {
    const ctx = await browser.newContext({ viewport: f.mida ?? { width: 1180, height: 820 }, deviceScaleFactor: 1.5, locale: 'ca-ES', timezoneId: 'Europe/Madrid' });
    const res = f.anonim ? null : await ctx.request.post(`${BASE}/api/auth/login`, { data: { email: f.usuari, password: f.contrasenya ?? PASS }, timeout: 180_000 });
    if (res && !res.ok()) {
      console.log(`✗ ${f.id}: no puc entrar amb ${f.usuari} (${res.status()})`);
      await ctx.close();
      continue;
    }
    const page = await ctx.newPage();
    try {
      await page.goto(f.ruta.startsWith('file:') ? f.ruta : BASE + f.ruta, { waitUntil: 'networkidle', timeout: 120_000 });
      await page.waitForTimeout(3000);
      // Si surt la finestra real «Cobraments a punt», es tanca primer.
      const tancar = page.getByRole('button', { name: 'Tancar per avui' });
      if (await tancar.isVisible().catch(() => false)) {
        await tancar.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await f.abans?.(page);
      await page.waitForTimeout(500);
      await marca(page, f.marques);
      await page.screenshot({ path: join(OUT, `${f.id}.jpg`), type: 'jpeg', quality: 80, fullPage: !!f.sencera });
      console.log(`✓ ${f.id}`);
    } catch (e) {
      console.log(`✗ ${f.id}: ${e instanceof Error ? e.message.split('\n')[0] : e}`);
    }
    await ctx.close();
  }
  await browser.close();
}

main();
