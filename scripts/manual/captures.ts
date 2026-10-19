/**
 * Fa les fotos del manual d'usuari sobre l'app de PROVES (dades inventades).
 * Per a cada marca [FOTO …] dels capítols: obre la pantalla, aplica la recepta
 * (si en té: obrir un formulari, una pestanya…), busca els textos de «marques»,
 * hi dibuixa els números ①②③ i desa public/manual/fotos/<id>.jpg.
 *
 * Ús:  pnpm manual:fotos              (totes)
 *      pnpm manual:fotos -- estades   (només un capítol o un id concret)
 * Al final escriu scripts/manual/captures-informe.json amb les marques no trobades.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { Page, Locator } from 'playwright-core';
import { totesLesFotos } from '../../src/lib/manual/capitols';
import { BASE, obreSessio, comprovaEntornLocal } from './lib';
import { RECEPTES, type Accio } from './receptes/index';

const OUT = join(process.cwd(), 'public', 'manual', 'fotos');
const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

if (!(process.env.DATABASE_URL ?? '').includes('localhost:5433')) {
  throw new Error('La base de dades no és la de PROVES (localhost:5433): no es fan fotos.');
}
comprovaEntornLocal();
const prisma = new PrismaClient();

// ── Quina estada / client / factura surt a cada foto ──────────────────────
type Ids = Record<string, string | undefined>;
async function carregaIds(): Promise<Ids> {
  const est = await prisma.estancia.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { factures: true, cobraments: true, diposits: true, canvisHabitacio: true, ampliacions: true, viatgers: true, pagamentsPrevistos: true } },
      viatgers: { select: { habitacioSeparadaId: true, huespedId: true, esTitular: true, parentesc: true } },
      factures: { select: { tipusDocument: true, total: true, numero: true } },
    },
    orderBy: { dataEntrada: 'asc' },
  });
  const score = (e: (typeof est)[number]) => e._count.factures * 3 + e._count.cobraments * 2 + e._count.diposits * 2 + e._count.viatgers;
  const pick = (f: (e: (typeof est)[number]) => boolean) => est.filter(f).sort((a, b) => score(b) - score(a))[0]?.id;
  const principal =
    pick((e) => e.estat === 'EN_CURS' && !e.esBorrany) ?? pick((e) => !e.esBorrany) ?? est[0]?.id;
  const titularDe = (id?: string) => est.find((e) => e.id === id)?.viatgers.find((v) => v.esTitular)?.huespedId;

  const factures = await prisma.factura.findMany({ where: { deletedAt: null }, select: { id: true, numero: true, tipusDocument: true, total: true, esDiposit: true } });
  return {
    principal,
    reserva: pick((e) => e.estat === 'RESERVA' && !e.esBorrany),
    esborrany: pick((e) => e.esBorrany),
    ampliacio: pick((e) => e._count.ampliacions > 0),
    canvi: pick((e) => e._count.canvisHabitacio > 0),
    separada: pick((e) => e.viatgers.some((v) => v.habitacioSeparadaId)),
    anticipada: pick((e) => e.sortidaAnticipada),
    rectificativa: pick((e) => e.factures.some((f) => f.numero.startsWith('R'))),
    fianca: pick((e) => e._count.diposits > 0),
    fiscal: pick((e) => e.factures.some((f) => f.tipusDocument === 'FACTURA')),
    menor: pick((e) => e.viatgers.some((v) => v.parentesc != null)),
    previst: pick((e) => e._count.pagamentsPrevistos > 0),
    hoste: titularDe(principal),
    hosteMenor: titularDe(pick((e) => e.viatgers.some((v) => v.parentesc != null))),
    facturaSimple: factures.find((f) => f.tipusDocument === 'FACTURA_SIMPLIFICADA' && Number(f.total) > 0 && !f.esDiposit)?.id,
    facturaFiscal: factures.find((f) => f.tipusDocument === 'FACTURA')?.id,
    facturaRect: factures.find((f) => f.numero.startsWith('R'))?.id,
    facturaDiposit: factures.find((f) => f.esDiposit)?.id,
    treballador: (await prisma.treballador.findFirst({ select: { id: true } }))?.id,
    pressupost: (await prisma.pressupost.findFirst({ select: { id: true } }))?.id,
    actiu: (await prisma.actiu.findFirst({ select: { id: true } }))?.id,
  };
}

/** Tria l'entitat segons les paraules de l'id de la foto. */
function estadaPer(id: string, ids: Ids): string | undefined {
  const t = id.toLowerCase();
  const regles: [RegExp, string][] = [
    [/rectific|devol|anticip|reactiv/, 'rectificativa'],
    [/anticip|sortida/, 'anticipada'],
    [/ampli/, 'ampliacio'],
    [/canvi-hab|canvi-d-hab|tram/, 'canvi'],
    [/separ|consti|llibre-hab|habitacio-llibre/, 'separada'],
    [/esborrany/, 'esborrany'],
    [/reserva|convert|check-?in/, 'reserva'],
    [/fianc|diposit|reten|retingu|torna/, 'fianca'],
    [/fiscal|empresa/, 'fiscal'],
    [/menor|parentesc/, 'menor'],
    [/previst|pendent/, 'previst'],
  ];
  for (const [re, k] of regles) if (re.test(t) && ids[k]) return ids[k];
  return ids.principal;
}

function resolRuta(foto: { id: string; ruta: string }, ids: Ids): string | null {
  let r = foto.ruta.trim();
  if (!r) return null;
  if (r.startsWith('http')) return null; // pantalles externes: les fa la recepta
  const t = foto.id.toLowerCase();
  const fact = /rectific/.test(t) ? ids.facturaRect : /fiscal/.test(t) ? ids.facturaFiscal : /diposit/.test(t) ? ids.facturaDiposit : ids.facturaSimple;
  const ID = /(\[id\]|:id|<id>|\bID\b)/;
  if (/^\/estancies\//.test(r)) r = r.replace(ID, estadaPer(foto.id, ids) ?? 'x');
  if (/^\/huespedes\//.test(r)) r = r.replace(ID, (/menor/.test(t) ? ids.hosteMenor : ids.hoste) ?? 'x');
  if (/^\/imprimir\/factura\//.test(r)) r = r.replace(ID, ids.facturaFiscal ?? 'x');
  if (/^\/imprimir\/factura-simple\//.test(r)) r = r.replace(ID, fact ?? 'x');
  if (/^\/factures\//.test(r)) r = r.replace(ID, fact ?? 'x');
  if (/^\/imprimir\/registre\//.test(r)) r = r.replace(ID, ids.principal ?? 'x');
  if (/^\/personal\//.test(r)) r = r.replace(ID, ids.treballador ?? 'x');
  if (/pressupost/.test(r)) r = r.replace(ID, ids.pressupost ?? 'x');
  if (/^\/actius\//.test(r)) r = r.replace(ID, ids.actiu ?? 'x');
  r = r.replace(/\[periode\]/, '2026-3');
  return r;
}

/**
 * Marcadors estables a les rutes de les receptes (els ids canvien cada cop que
 * es regeneren les dades de demo):
 *   {estada:26011}  → estada pel número de contracte (26006_1 per a una ampliació)
 *   {hoste:12345678Z} → client pel número de document
 *   {factura:R26-001} → factura pel número
 *   {treballador:Rosa} {pressupost:Garcia} {actiu:Rentadora} → pel nom (conté)
 */
async function resolMarcadors(ruta: string): Promise<string> {
  const re = /\{(estada|hoste|factura|treballador|pressupost|actiu):([^}]+)\}/g;
  let out = ruta;
  for (const m of ruta.matchAll(re)) {
    const [tot, tipus, valor] = m;
    if (!tot || !tipus || !valor) continue;
    let id: string | undefined;
    if (tipus === 'estada') {
      const [num, amp] = valor.split('_');
      const est = await prisma.estancia.findMany({ where: { deletedAt: null, numContracte: { startsWith: num ?? valor } }, select: { id: true, numContracte: true } });
      id = est.find((e) => e.numContracte === valor)?.id ?? (amp ? undefined : est[0]?.id);
    } else if (tipus === 'hoste') id = (await prisma.huesped.findFirst({ where: { numDocument: valor }, select: { id: true } }))?.id;
    else if (tipus === 'factura') id = (await prisma.factura.findFirst({ where: { numero: valor, deletedAt: null }, select: { id: true } }))?.id;
    else if (tipus === 'treballador') id = (await prisma.treballador.findFirst({ where: { nom: { contains: valor, mode: 'insensitive' } }, select: { id: true } }))?.id;
    else if (tipus === 'pressupost') id = (await prisma.pressupost.findFirst({ select: { id: true } }))?.id;
    else if (tipus === 'actiu') id = (await prisma.actiu.findFirst({ where: { nom: { contains: valor, mode: 'insensitive' } }, select: { id: true } }))?.id;
    if (!id) throw new Error(`No trobo ${tipus} «${valor}» a les dades de demo`);
    out = out.replace(tot, id);
  }
  return out;
}

// ── Localitzar els textos de les marques ──────────────────────────────────
const net = (s: string) => s.replace(/[«»"“”]/g, '').trim();

async function primerVisible(l: Locator): Promise<Locator | null> {
  const n = Math.min(await l.count().catch(() => 0), 12);
  for (let i = 0; i < n; i++) {
    const x = l.nth(i);
    if (await x.isVisible().catch(() => false)) return x;
  }
  return null;
}

async function troba(page: Page, text: string): Promise<Locator | null> {
  const t = net(text);
  if (!t) return null;
  const intents: Locator[] = [
    page.getByRole('button', { name: t, exact: true }),
    page.getByRole('link', { name: t, exact: true }),
    page.getByRole('tab', { name: t, exact: true }),
    page.getByLabel(t, { exact: true }),
    page.getByPlaceholder(t, { exact: true }),
    page.getByText(t, { exact: true }),
    page.getByRole('button', { name: t }),
    page.getByRole('link', { name: t }),
    page.getByLabel(t),
    page.getByPlaceholder(t),
    page.getByText(t),
  ];
  for (const l of intents) {
    const v = await primerVisible(l);
    if (v) return v;
  }
  return null;
}

async function obreTargetes(page: Page) {
  // Targetes plegables (CollapsibleCard): les obrim perquè es vegi el contingut.
  const tancades = page.locator('button[aria-expanded="false"]:has(h3)');
  const n = await tancades.count();
  for (let i = 0; i < n; i++) await tancades.nth(i).click({ timeout: 2000 }).catch(() => {});
}

async function executa(page: Page, accions: Accio[] | undefined) {
  for (const a of accions ?? []) {
    if ('clic' in a) {
      const el = await troba(page, a.clic);
      if (el) await el.click({ timeout: 5000 }).catch(() => {});
      else console.warn(`   · recepta: no trobo «${a.clic}»`);
    } else if ('omple' in a) {
      const el = await troba(page, a.omple[0]);
      if (el) await el.fill(a.omple[1]).catch(() => {});
    } else if ('espera' in a) {
      await page.waitForTimeout(a.espera);
    } else if ('scroll' in a) {
      const el = await troba(page, a.scroll);
      if (el) await el.scrollIntoViewIfNeeded().catch(() => {});
    }
    await page.waitForTimeout(350);
  }
}

async function dibuixaMarques(page: Page, boxes: { x: number; y: number; w: number; h: number }[]) {
  await page.evaluate(
    ({ boxes, nums }) => {
      document.getElementById('__manual_marques')?.remove();
      const cont = document.createElement('div');
      cont.id = '__manual_marques';
      cont.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
      boxes.forEach((b, i) => {
        const r = document.createElement('div');
        r.style.cssText = `position:absolute;left:${b.x - 4}px;top:${b.y - 4}px;width:${b.w + 8}px;height:${b.h + 8}px;border:3px solid #dc2626;border-radius:8px;box-shadow:0 0 0 3px rgba(255,255,255,.7)`;
        const n = document.createElement('div');
        n.textContent = nums[i] ?? String(i + 1);
        const left = Math.max(2, b.x - 26);
        n.style.cssText = `position:absolute;left:${left}px;top:${Math.max(2, b.y - 22)}px;width:30px;height:30px;border-radius:50%;background:#dc2626;color:#fff;font:700 18px/30px system-ui,sans-serif;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.35)`;
        cont.append(r, n);
      });
      document.body.appendChild(cont);
      // Amaga la icona del mode de desenvolupament de Next.js.
      if (!document.getElementById('__manual_estil')) {
        const st = document.createElement('style');
        st.id = '__manual_estil';
        st.textContent = 'nextjs-portal{display:none!important}';
        document.head.appendChild(st);
      }
    },
    { boxes, nums: NUMS },
  );
}

async function main() {
  const filtre = process.argv[2];
  mkdirSync(OUT, { recursive: true });
  const ids = await carregaIds();
  console.log('Entitats de demo:', ids);
  const fotos = totesLesFotos().filter((f) => !filtre || f.capitol === filtre || f.id === filtre || f.id.startsWith(filtre));
  const informe: { id: string; capitol: string; ruta: string | null; falten: string[]; error?: string }[] = [];

  const { browser, ctx } = await obreSessio();
  const anonim = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1.5, locale: 'ca-ES' });
  for (const foto of fotos) {
    const rec = RECEPTES[foto.id];
    if (rec?.ometre) continue;
    const ruta = rec?.ruta ? await resolMarcadors(rec.ruta).catch((e) => { console.log(`✗ ${foto.id}: ${e.message}`); return null; }) : resolRuta(foto, ids);
    const fitxer = join(OUT, `${foto.id}.jpg`);
    if (!ruta) {
      informe.push({ id: foto.id, capitol: foto.capitol, ruta: foto.ruta, falten: [], error: 'Sense ruta local (pantalla externa)' });
      continue;
    }
    const page = await (rec?.sensesessio ? anonim : ctx).newPage();
    if (rec?.mida) await page.setViewportSize(rec.mida);
    try {
      const url = ruta.startsWith('file:') ? ruta : BASE + ruta;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
      await page.waitForTimeout(600);
      if (!rec?.noObrir) await obreTargetes(page);
      await executa(page, rec?.abans);
      await page.waitForTimeout(500);

      const marques = rec?.marques ?? foto.marques;
      const trobats: Locator[] = [];
      const falten: string[] = [];
      for (const m of marques) {
        const el = await troba(page, m);
        if (el) trobats.push(el);
        else falten.push(m);
      }
      // Centra la vista sobre totes les marques (si hi caben); si no, sobre la primera.
      if (trobats[0]) {
        await trobats[0].scrollIntoViewIfNeeded().catch(() => {});
        const caixes = (await Promise.all(trobats.map((t) => t.boundingBox()))).filter((b): b is NonNullable<typeof b> => !!b);
        if (caixes.length) {
          const dalt = Math.min(...caixes.map((b) => b.y));
          const baix = Math.max(...caixes.map((b) => b.y + b.height));
          const alt = page.viewportSize()?.height ?? 820;
          const primer = caixes[0]!;
          const desplaça = baix - dalt < alt - 120 ? (dalt + baix) / 2 - alt / 2 : primer.y - 140;
          await page.evaluate((dy) => window.scrollBy(0, dy), desplaça);
        }
      } else if (rec?.scrollA) {
        await executa(page, [{ scroll: rec.scrollA }]);
      }
      await page.waitForTimeout(250);
      const boxes = [];
      for (const el of trobats) {
        const b = await el.boundingBox();
        const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
        if (b) boxes.push({ x: b.x + scroll.x, y: b.y + scroll.y, w: b.width, h: b.height });
      }
      await dibuixaMarques(page, boxes);
      await page.screenshot({ path: fitxer, type: 'jpeg', quality: 80, fullPage: !!rec?.sencera });
      informe.push({ id: foto.id, capitol: foto.capitol, ruta, falten });
      console.log(`${falten.length ? '⚠' : '✓'} ${foto.id}${falten.length ? `  (no trobo: ${falten.join(' | ')})` : ''}`);
    } catch (e) {
      informe.push({ id: foto.id, capitol: foto.capitol, ruta, falten: [], error: e instanceof Error ? e.message.split('\n')[0] : String(e) });
      console.log(`✗ ${foto.id}: ${e instanceof Error ? e.message.split('\n')[0] : e}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
  await prisma.$disconnect();
  writeFileSync(join(process.cwd(), 'scripts', 'manual', `captures-informe${filtre ? '-' + filtre : ''}.json`), JSON.stringify(informe, null, 2));
  const sense = totesLesFotos().filter((f) => !existsSync(join(OUT, `${f.id}.jpg`)));
  console.log(`\nFotos: ${fotos.length} · amb marques que falten: ${informe.filter((x) => x.falten.length).length} · errors: ${informe.filter((x) => x.error).length} · sense imatge: ${sense.length}`);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
