/**
 * Dades de demo extra per a les fotos dels capítols «hostes», «mossos» i
 * «inspeccio». NOMÉS contra l'app de PROVES (localhost:3100) i la BD de proves
 * (localhost:5433). Es pot tornar a executar: no duplica res.
 *
 *  1. Genera imatges de documents INVENTATS amb la marca «ESPÉCIMEN / SPECIMEN»
 *     (public/manual/especimens/*) — mai documents reals.
 *  2. Puja un passaport d'espècimen a la fitxa de Piotr Kowalski (API de l'app).
 *  3. Crea un client inventat marcat com a «no acollir» (Ricard Mas Ferrer).
 *  4. Genera fitxers de Mossos (API, sense enviar res) i en posa l'estat:
 *       26012 → Acceptat · 26003 → Error · 26013 → Pendent.
 *  5. Deixa dues estades amb dades pendents (26012 i 26005, aquesta amb l'avís
 *     silenciat) per a les fotos de Justificants.
 *  6. Crea l'estada 26070 (Laia Pons, sense pagaments) amb un enviament Pendent.
 *
 * Ús:  npx tsx scripts/manual/demo-extra/hostes-mossos.ts
 */
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright-core';

const URL_LOCAL = 'postgresql://manual:manual@localhost:5433/hostalcoll_manual';
const BASE = 'http://localhost:3100';
const prisma = new PrismaClient({ datasources: { db: { url: URL_LOCAL } } });
const DIR = join(process.cwd(), 'public', 'manual', 'especimens');

// ── MRZ (dígits de control ICAO 9303) ──────────────────────────────────────
function cd(s: string) {
  const w = [7, 3, 1];
  let t = 0;
  [...s].forEach((c, i) => {
    const v = c === '<' ? 0 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55;
    t += v * w[i % 3]!;
  });
  return String(t % 10);
}
const pad = (s: string, n: number) => (s + '<'.repeat(n)).slice(0, n);
const esc = (s: string) => s.replace(/</g, '&lt;');

function mrzPassaport() {
  const l1 = pad('P<POLKOWALSKI<<PIOTR', 44);
  const doc = 'EA1234567', nac = '830608', cad = '320115';
  const opt = pad('', 14);
  const base = `${doc}${cd(doc)}POL${nac}${cd(nac)}M${cad}${cd(cad)}${opt}${cd(opt)}`;
  return [l1, base + cd(`${doc}${cd(doc)}${nac}${cd(nac)}${cad}${cd(cad)}${opt}${cd(opt)}`)];
}
function mrzDni() {
  const sup = 'BAA000589', num = '99999999R', nac = '800101', cad = '310101';
  const l1 = pad(`IDESP${sup}${cd(sup)}${num}`, 30);
  const l2 = pad(`${nac}${cd(nac)}F${cad}${cd(cad)}ESP`, 29);
  const comp = l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29);
  return [l1, l2 + cd(comp), pad('ESPECIMEN<ESPECIMEN<<CARMEN', 30)];
}

const MARCA = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
  <div style="transform:rotate(-24deg);white-space:nowrap;font:900 80px Arial;color:rgba(200,0,0,.42);letter-spacing:6px;border:8px solid rgba(200,0,0,.42);padding:6px 28px">ESPÉCIMEN · SPECIMEN</div></div>`;

function htmlPassaport() {
  const [a, b] = mrzPassaport();
  return `<html><body style="margin:0;background:#fff">
  <div id="doc" style="position:relative;width:1250px;height:880px;background:linear-gradient(135deg,#e9eef5,#d7e1ec);font-family:Arial;overflow:hidden">
    <div style="padding:30px 40px;font-size:26px;color:#223;font-weight:bold">RZECZPOSPOLITA POLSKA · PASZPORT / PASSPORT · <span style="color:#a00">DOCUMENT INVENTAT</span></div>
    <div style="position:absolute;left:40px;top:110px;width:300px;height:380px;background:#b9c4d0;border:2px solid #889;display:flex;align-items:center;justify-content:center;font-size:120px;color:#7a8696">👤</div>
    <div style="position:absolute;left:380px;top:110px;font-size:24px;line-height:46px;color:#223">
      <div>Nazwisko / Surname: <b>KOWALSKI</b></div><div>Imiona / Given names: <b>PIOTR</b></div>
      <div>Obywatelstwo / Nationality: <b>POLSKIE</b></div><div>Data urodzenia / Date of birth: <b>08.06.1983</b></div>
      <div>Płeć / Sex: <b>M</b></div><div>Nr paszportu / Passport No: <b>EA1234567</b></div>
      <div>Data ważności / Date of expiry: <b>15.01.2032</b></div></div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:190px;background:#fff;padding:30px 40px;font:600 34px/62px 'OCR B','Courier New',monospace;letter-spacing:3px;color:#111">${esc(a ?? "")}<br>${esc(b ?? "")}</div>
    ${MARCA}
  </div></body></html>`;
}

function htmlDniRevers() {
  const [a, b, c] = mrzDni();
  return `<html><body style="margin:0;background:#2b2724">
  <div style="width:1600px;height:1150px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 40% 35%,#4a3f37,#1f1a17)">
    <div id="doc" style="position:relative;width:1150px;height:725px;border-radius:38px;background:linear-gradient(160deg,#f3efe6,#dfe7e4);box-shadow:0 30px 60px rgba(0,0,0,.6);overflow:hidden;font-family:Arial;transform:rotate(-2deg)">
      <div style="padding:34px 46px;font-size:24px;color:#334;line-height:40px">
        <div>DOMICILIO: <b>C. INVENTADA 1</b> · LOCALIDAD: <b>ESPÉCIMEN</b></div>
        <div>LUGAR DE NACIMIENTO: <b>ESPÉCIMEN</b> · HIJA DE: <b>— / —</b></div>
        <div style="color:#a00;font-weight:bold">DOCUMENT INVENTAT PER AL MANUAL</div></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:#fbfbf8;padding:34px 46px;font:600 44px/78px 'OCR B','Courier New',monospace;letter-spacing:6px;color:#111">${esc(a ?? "")}<br>${esc(b ?? "")}<br>${esc(c ?? "")}</div>
      ${MARCA}
    </div></div></body></html>`;
}

async function imatges() {
  mkdirSync(DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1150 } });
  await page.setContent(htmlPassaport());
  await page.locator('#doc').screenshot({ path: join(DIR, 'passaport-especimen.png') });
  await page.setContent(htmlDniRevers());
  await page.screenshot({ path: join(DIR, 'dni-revers-bona-foto.jpg'), type: 'jpeg', quality: 85 });
  await browser.close();
  console.log('✓ Imatges d’espècimen a public/manual/especimens/');
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hostalcoll@gmail.com', password: 'Manual2026!' }),
  });
  if (!res.ok) throw new Error(`Login: ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

async function documentPiotr(cookie: string) {
  const h = await prisma.huesped.findFirst({ where: { numDocument: 'EA1234567' } });
  if (!h) throw new Error('No trobo Piotr Kowalski');
  const ja = await prisma.documentoPujat.count({ where: { huespedId: h.id, deletedAt: null } });
  if (ja > 0) return console.log('· Piotr ja té document');
  const fd = new FormData();
  fd.append('tipus', 'PASSAPORT');
  const buf = readFileSync(join(DIR, 'passaport-especimen.png'));
  fd.append('file', new Blob([buf], { type: 'image/png' }), 'passaport-especimen.png');
  const res = await fetch(`${BASE}/api/huespedes/${h.id}/documents`, { method: 'POST', headers: { cookie }, body: fd });
  if (!res.ok) throw new Error(`Pujar document: ${res.status} ${await res.text()}`);
  console.log('✓ Passaport d’espècimen pujat a Piotr Kowalski');
}

async function noAcollir() {
  let h = await prisma.huesped.findFirst({ where: { numDocument: '99999999R' } });
  if (!h) {
    h = await prisma.huesped.create({
      data: {
        nom: 'Ricard', cognom1: 'Mas', cognom2: 'Ferrer', sexe: 'HOME', tipusDocument: 'DNI_NIF',
        numDocument: '99999999R', nacionalitat: 'Espanya', pais: 'Espanya', email: 'ricard.mas@example.com',
        telefon: '600 000 199',
      },
    });
  }
  const n = await prisma.anotacioHuesped.count({ where: { huespedId: h.id, noAcollir: true, deletedAt: null } });
  if (!n) {
    await prisma.anotacioHuesped.create({
      data: {
        huespedId: h.id, sentit: 'NEGATIVA', tipus: 'Desperfectes', noAcollir: true,
        descripcio: 'El 12/08/2026 va trencar la porta de l’armari de l’habitació 3 i no va pagar la reparació (factura nº 2026-118).',
      },
    });
  }
  console.log('✓ Client «no acollir»: Ricard Mas Ferrer (99999999R)');
}

async function estada(num: string) {
  const e = await prisma.estancia.findFirst({ where: { numContracte: num, deletedAt: null } });
  if (!e) throw new Error(`No trobo l'estada ${num}`);
  return e;
}

async function mossos(cookie: string) {
  const plan: [string, 'ACCEPTAT' | 'ERROR' | 'PENDENT'][] = [['26012', 'ACCEPTAT'], ['26003', 'ERROR'], ['26013', 'PENDENT']];
  for (const [num, estat] of plan) {
    const e = await estada(num);
    let env = await prisma.enviamentMossos.findFirst({ where: { estanciaId: e.id } });
    if (!env) {
      const res = await fetch(`${BASE}/api/estancies/${e.id}/fitxer`, {
        method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ tipusPagament: 'DESTINACIO' }),
      });
      if (!res.ok || (res.headers.get('Content-Type') ?? '').includes('json')) throw new Error(`Fitxer ${num}: ${res.status} ${await res.text()}`);
      env = await prisma.enviamentMossos.findFirst({ where: { estanciaId: e.id } });
    }
    if (!env) throw new Error(`Sense enviament ${num}`);
    const dia = new Date(e.dataEntrada ?? new Date());
    if (estat === 'ACCEPTAT') {
      await prisma.enviamentMossos.update({ where: { id: env.id }, data: { estat, dataEnviament: dia, codiValidacio: 'DEMO-4821', numRegistre: 'DEMO-000123', errorMsg: null } });
    } else if (estat === 'ERROR') {
      await prisma.enviamentMossos.update({ where: { id: env.id }, data: { estat, dataEnviament: dia, errorMsg: 'Dada de demostració: el portal no ha respost (temps d’espera esgotat). Torna-ho a provar més tard.' } });
    }
    console.log(`✓ Enviament Mossos ${num}: ${estat}`);
  }
  // Dades pendents (després de generar els fitxers, que les necessiten completes).
  await prisma.huesped.updateMany({ where: { numDocument: '81234567Q' }, data: { numSuport: null } });
  await prisma.huesped.updateMany({ where: { numDocument: 'X1234567L' }, data: { codiPostal: null } });
  const e5 = await estada('26005');
  await prisma.estancia.update({ where: { id: e5.id }, data: { avisDadesParat: true } });
  console.log('✓ 26012 amb el número de suport pendent · 26005 amb el codi postal pendent i l’avís silenciat');
}

/**
 * Estada 26070 (inventada) SENSE pagaments, amb un fitxer de Mossos Pendent:
 * a la fitxa és l'únic botó «Eliminar» visible, i així la foto
 * «enviament-eliminar» pot obrir l'eliminació de l'enviament (sense confirmar-la).
 */
async function estadaEliminar(cookie: string) {
  let h = await prisma.huesped.findFirst({ where: { numDocument: '11111111H' } });
  if (!h) {
    h = await prisma.huesped.create({
      data: {
        nom: 'Laia', cognom1: 'Pons', cognom2: 'Riera', sexe: 'DONA', tipusDocument: 'DNI_NIF', numDocument: '11111111H',
        numSuport: 'BAK123456', dataExpedicio: new Date('2023-05-10'), dataNaixement: new Date('1990-04-02'),
        nacionalitat: 'Espanya', pais: 'Espanya', provincia: 'Barcelona', municipi: 'Vic', codiPostal: '08500',
        adreca: 'Carrer de la Riera, 7', email: 'laia.pons@example.com', telefon: '600 000 170',
      },
    });
  }
  let e = await prisma.estancia.findFirst({ where: { numContracte: '26070', anyContracte: 2026 } });
  if (!e) {
    const ref = await estada('26013');
    e = await prisma.estancia.create({
      data: {
        establimentId: ref.establimentId, tipusRegistre: ref.tipusRegistre, numContracte: '26070', anyContracte: 2026,
        dataFormalitzacio: new Date('2026-08-25'), dataEntrada: new Date('2026-08-25'), dataSortida: new Date('2026-08-28'),
        numViatgers: 1, tipusPagament: 'EFECTIU', estat: 'FINALITZADA', habitacioId: ref.habitacioId, idioma: 'ca',
        viatgers: { create: [{ huespedId: h.id, esTitular: true }] },
      },
    });
  }
  if (!(await prisma.enviamentMossos.count({ where: { estanciaId: e.id } }))) {
    const res = await fetch(`${BASE}/api/estancies/${e.id}/fitxer`, {
      method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ tipusPagament: 'DESTINACIO' }),
    });
    if (!res.ok || (res.headers.get('Content-Type') ?? '').includes('json')) throw new Error(`Fitxer 26070: ${res.status} ${await res.text()}`);
  }
  console.log('✓ Estada 26070 (Laia Pons, sense pagaments) amb enviament Pendent');
}

async function main() {
  if (!existsSync(join(DIR, 'passaport-especimen.png')) || process.argv.includes('--imatges')) await imatges();
  const cookie = await login();
  await documentPiotr(cookie);
  await noAcollir();
  await mossos(cookie);
  await estadaEliminar(cookie);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

export {};
