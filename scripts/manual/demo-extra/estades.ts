/**
 * Dades de demo extra per a les fotos del capítol «estades» (NOMÉS BD de PROVES).
 *
 *  1. 26095 · Sara Llopis · hab 5 · RESERVA 23→27/11/2026. Coincideix amb la llarga
 *     estada de Laura Fernández (26010, hab 5, fins al 30/11) → a «Editar» surt l'avís
 *     taronja «Aquesta habitació ja està ocupada en aquestes dates» (foto avis-solapament).
 *     El DNI té la lletra de control malament a propòsit → en prémer «Desar canvis» surt
 *     el requadre «Hi ha dades que potser no són correctes:» i NO es desa res
 *     (foto nova-avisos-format). Té l'avís de Mossos aturat.
 *  2. Signatura inventada de Sophie Martin (26002, estada acabada al juny) → foto
 *     signatura-feta (miniatura + «Firmat»).
 *  3. Cobrament previst JA PAGAT a 26010 (mensualitat d'octubre) → foto
 *     cobraments-pendents (un de pagat i un de pendent). Pagat: no genera cap avís.
 *
 * Es pot tornar a executar: no duplica res.
 * Ús:  npx tsx scripts/manual/demo-extra/estades.ts
 */
const BASE_URL = 'http://localhost:3100';
const DB_URL = 'postgresql://manual:manual@localhost:5433/hostalcoll_manual';
process.env.DATABASE_URL = DB_URL;
const { PrismaClient } = await import('@prisma/client');
const { chromium } = await import('playwright-core');
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

let cookie = '';
async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hostalcoll@gmail.com', password: 'Manual2026!' }),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  const c = (res.headers.getSetCookie?.() ?? []).map((s) => s.split(';')[0]).find((s) => s?.startsWith('hostalcoll_session='));
  if (!c) throw new Error('sense cookie');
  cookie = c;
}
/** Crida a l'API amb reintents (el servidor de proves, compartit, de vegades va lent i dona 500). */
async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await api1<T>(method, path, body);
    } catch (e) {
      if (i >= 4) throw e;
      console.warn(`  · reintent ${i}: ${(e as Error).message.slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}
async function api1<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** Estada 26095: reserva que se solapa amb 26010 i amb un DNI de lletra incorrecta. */
async function estada26095() {
  let est = await prisma.estancia.findFirst({ where: { numContracte: '26095', deletedAt: null }, select: { id: true } });
  if (!est) {
    const hab = await prisma.habitacio.findFirst({ where: { nom: '5' }, select: { id: true } });
    const r = await api<{ estanciaId: string }>('POST', '/api/estancies', {
      estancia: {
        tipusRegistre: 'RESERVA', numContracte: '26095', anyContracte: 2026,
        dataFormalitzacio: '2026-10-10', dataEntrada: '2026-11-23', dataSortida: '2026-11-27',
        numViatgers: 1, tipusPagament: 'TRANSFERENCIA', numHabitacions: 1, habitacioId: hab?.id, teInternet: true, idioma: 'ca',
      },
      viatgers: [{
        nom: 'Sara', cognom1: 'Llopis', cognom2: 'Bosch', sexe: 'DONA', dataNaixement: '1988-05-21', nacionalitat: 'Espanya',
        // Lletra de control incorrecta a propòsit (la bona seria una altra).
        tipusDocument: 'DNI_NIF', numDocument: '93000095A', numSuport: 'CAA556677', dataExpedicio: '2022-03-01',
        email: 'sara.llopis@example.com', telefon: '600 000 195', adreca: 'Carrer Nou, 12', pais: 'Espanya',
        codiPostal: '08301', esTitular: true,
      }],
    });
    est = { id: r.estanciaId };
    console.log('✓ Estada 26095 creada');
  }
  await prisma.estancia.update({ where: { id: est.id }, data: { estat: 'RESERVA', avisMossosParat: true } });
  console.log('✓ Estada 26095 a punt (reserva hab 5, 23→27/11/2026)');
}

/** Imatge PNG d'una signatura inventada (traç dibuixat en un canvas). */
async function imatgeFirma(): Promise<string> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    return await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 360;
      c.height = 140;
      const g = c.getContext('2d')!;
      g.strokeStyle = '#1e293b';
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(30, 95);
      g.bezierCurveTo(60, 20, 90, 20, 95, 80);
      g.bezierCurveTo(100, 120, 130, 40, 160, 70);
      g.bezierCurveTo(185, 95, 200, 50, 230, 60);
      g.bezierCurveTo(260, 70, 280, 100, 330, 55);
      g.stroke();
      g.beginPath();
      g.moveTo(60, 110);
      g.lineTo(300, 105);
      g.stroke();
      return c.toDataURL('image/png');
    });
  } finally {
    await browser.close();
  }
}

async function firmaSophie() {
  const est = await prisma.estancia.findFirst({
    where: { numContracte: '26002', deletedAt: null },
    select: { id: true, viatgers: { select: { id: true, signatura: { select: { id: true } } } } },
  });
  const v = est?.viatgers[0];
  if (!est || !v) throw new Error('No trobo 26002');
  if (v.signatura) return console.log('✓ Sophie Martin ja té signatura');
  await api('POST', `/api/estancies/${est.id}/viatgers/${v.id}/firma`, {
    imatge: await imatgeFirma(), llocSignatura: 'Barcelona', refusaComercial: true, autoritzaComercialAltres: false,
  });
  console.log('✓ Signatura de Sophie Martin (26002)');
}

async function previstPagat() {
  const est = await prisma.estancia.findFirst({ where: { numContracte: '26010', deletedAt: null }, select: { id: true } });
  if (!est) throw new Error('No trobo 26010');
  const concepte = 'Mensualitat d’octubre';
  let p = await prisma.pagamentPrevist.findFirst({ where: { estanciaId: est.id, concepte }, select: { id: true } });
  if (!p) {
    await api('POST', `/api/estancies/${est.id}/pagaments-previstos`, { import: 820, dataPrevista: '2026-10-01', concepte });
    p = await prisma.pagamentPrevist.findFirst({ where: { estanciaId: est.id, concepte }, select: { id: true } });
  }
  if (!p) throw new Error('No s’ha creat el cobrament previst');
  await api('PATCH', `/api/pagaments-previstos/${p.id}`, { pagat: true });
  console.log('✓ Cobrament previst pagat a 26010 (01/10/2026)');
}

async function main() {
  await login();
  await estada26095();
  await firmaSophie();
  await previstPagat();
}

main().finally(() => prisma.$disconnect());

export {};
