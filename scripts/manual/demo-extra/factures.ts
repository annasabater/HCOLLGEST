/**
 * Dades de demo extra per al capítol «factures» (NOMÉS app de proves local).
 *
 * 1) Estada 26090 (Núria Ferrer · hab 6 · 14→24/09/2026, sortida anticipada el 21/09)
 *    amb tot el que cal perquè la caixa «Facturació» mostri els cinc botons alhora:
 *      - dues factures simplificades (26090 i 26090.1) sense fiscal → «Fiscal de simplificades»
 *      - un pagament a compte sense factura → «Factura simple»
 *      - una fiança en custòdia sense factura → «Factura de dipòsit»
 *      - una devolució sense factura → «Factura rectificativa»
 * 2) Estada 26091 (Pau Riera · hab 6 · 25/09→02/10/2026) amb una factura simplificada
 *    i NOMÉS una fiança en custòdia (sense pagaments a compte): perquè el primer
 *    llapis de la caixa sigui el de la fiança (editar, tornar, retenir).
 * 3) Pressupost enllaçat a la reserva 26016 (caixa «Pressupostos» de l'estada).
 *
 * Fa servir només l'API de l'app de proves (http://localhost:3100). Es pot tornar
 * a executar: cada part es salta si ja existeix.
 * Ús: npx tsx scripts/manual/demo-extra/factures.ts
 */
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3100';
const URL_LOCAL = 'postgresql://manual:manual@localhost:5433/hostalcoll_manual';
const prisma = new PrismaClient({ datasources: { db: { url: URL_LOCAL } } });

let cookie = '';
async function api<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}
const post = <T = Record<string, unknown>>(p: string, b: unknown = {}) => api<T>('POST', p, b);

const LLETRES = 'TRWAGMYFPDXBNJZSQVHLCKE';
const dni = (n: number) => `${String(n).padStart(8, '0')}${LLETRES[n % 23]}`;

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hostalcoll@gmail.com', password: 'Manual2026!' }),
  });
  if (!res.ok) throw new Error(`Login fallit: ${res.status}`);
  cookie = (res.headers.getSetCookie?.() ?? []).map((s) => s.split(';')[0]).find((s) => s?.startsWith('hostalcoll_session=')) ?? '';
  if (!cookie) throw new Error('Sense cookie de sessió');
}

const existeix = async (num: string) =>
  prisma.estancia.findFirst({ where: { numContracte: num, deletedAt: null }, select: { id: true } });

async function creaEstada(num: string, entrada: string, sortida: string, viatger: Record<string, unknown>) {
  const hab = await prisma.habitacio.findFirst({ where: { nom: '6' }, select: { id: true } });
  if (!hab) throw new Error("Falta l'habitació 6");
  const r = await post<{ estanciaId: string }>('/api/estancies', {
    estancia: {
      tipusRegistre: 'CONTRACTE_EN_CURS', numContracte: num, anyContracte: 2026,
      dataFormalitzacio: entrada, dataEntrada: entrada, dataSortida: sortida,
      numViatgers: 1, tipusPagament: 'TARGETA_CREDIT', numHabitacions: 1, habitacioId: hab.id,
      teInternet: true, idioma: 'ca',
    },
    viatgers: [{ esTitular: true, nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', pais: 'Espanya', ...viatger }],
  });
  return r.estanciaId;
}

async function estada26090() {
  const NUM = '26090';
  const ja = await existeix(NUM);
  if (ja) return console.log(`= L'estada ${NUM} ja existeix (${ja.id}).`);
  const id = await creaEstada(NUM, '2026-09-14', '2026-09-24', {
    nom: 'Núria', cognom1: 'Ferrer', cognom2: 'Soler', sexe: 'DONA', dataNaixement: '1979-03-08',
    numDocument: dni(93456781), numSuport: 'BAK345678', dataExpedicio: '2023-05-10',
    email: 'nuria.ferrer@example.com', telefon: '600 000 118',
    adreca: 'Carrer Major, 4', provincia: 'Girona', municipi: 'Olot', codiPostal: '17800',
  });
  const pag = async (data: string, metode: string, imp: number, extra: Record<string, unknown> = {}) =>
    (await post<{ cobrament: { id: string } }>(`/api/estancies/${id}/pagaments`, { data, metode, import: imp, ...extra })).cobrament.id;
  const p1 = await pag('2026-09-14', 'TARGETA', 300, { descripcio: 'Primera setmana' });
  await post(`/api/estancies/${id}/factura-seleccio`, { pagamentIds: [p1], tipusDocument: 'FACTURA_SIMPLIFICADA' });
  const p2 = await pag('2026-09-18', 'EFECTIU', 120, { descripcio: 'Resta de l’estada' });
  await post(`/api/estancies/${id}/factura-seleccio`, { pagamentIds: [p2], tipusDocument: 'FACTURA_SIMPLIFICADA' });
  await pag('2026-09-18', 'BIZUM', 30, { descripcio: 'Bugaderia' });
  await post(`/api/estancies/${id}/diposits`, { data: '2026-09-14', metode: 'EFECTIU', import: 100, notes: 'Fiança de l’habitació' });
  await post(`/api/estancies/${id}/finalitzar-anticipada`, { dataSortida: '2026-09-21', retorn: true, retornImport: 90, retornMetode: 'EFECTIU' });
  console.log(`✓ Estada ${NUM} creada (${id}).`);
}

async function estada26091() {
  const NUM = '26091';
  const ja = await existeix(NUM);
  if (ja) return console.log(`= L'estada ${NUM} ja existeix (${ja.id}).`);
  const id = await creaEstada(NUM, '2026-09-25', '2026-10-02', {
    nom: 'Pau', cognom1: 'Riera', cognom2: 'Vila', sexe: 'HOME', dataNaixement: '1985-11-02',
    numDocument: dni(94567812), numSuport: 'BAL456789', dataExpedicio: '2022-02-14',
    email: 'pau.riera@example.com', telefon: '600 000 119',
    adreca: 'Passeig de la Riba, 12', provincia: 'Barcelona', municipi: 'Manresa', codiPostal: '08240',
  });
  const p = (await post<{ cobrament: { id: string } }>(`/api/estancies/${id}/pagaments`, { data: '2026-09-25', metode: 'TARGETA', import: 350 })).cobrament.id;
  await post(`/api/estancies/${id}/factura-seleccio`, { pagamentIds: [p], tipusDocument: 'FACTURA_SIMPLIFICADA' });
  await post(`/api/estancies/${id}/diposits`, { data: '2026-09-25', metode: 'EFECTIU', import: 150, notes: 'Cobro' });
  await api('PATCH', `/api/estancies/${id}`, { estat: 'FINALITZADA' });
  console.log(`✓ Estada ${NUM} creada (${id}).`);
}

async function pressupostEstada() {
  const est = await existeix('26016');
  if (!est) return console.log('! No hi ha l’estada 26016: no es crea el pressupost enllaçat.');
  const ja = await prisma.pressupost.findFirst({ where: { estanciaId: est.id }, select: { numero: true } });
  if (ja) return console.log(`= La reserva 26016 ja té el pressupost ${ja.numero}.`);
  const r = await post<{ id: string; numero: string }>(`/api/pressupostos?estanciaId=${est.id}`, {});
  const p = await prisma.pressupost.findUnique({ where: { id: r.id } });
  await api('PATCH', `/api/pressupostos/${r.id}`, {
    numero: r.numero, data: '2026-10-08', validesa: '2026-10-22', idioma: 'ca',
    clientNom: p?.clientNom ?? undefined, clientNif: p?.clientNif ?? undefined,
    clientAdreca: p?.clientAdreca ?? undefined, clientLocalitat: p?.clientLocalitat ?? undefined,
    compte: p?.compte ?? undefined, ivaPercent: 10,
    notes: 'Paga i senyal del 30 % per confirmar la reserva.',
    linies: [{ descripcio: 'Allotjament habitació doble · 14 nits (06/11 – 20/11/2026)', import: 600 }],
  });
  console.log(`✓ Pressupost ${r.numero} enllaçat a la reserva 26016.`);
}

async function main() {
  await login();
  await estada26090();
  await estada26091();
  await pressupostEstada();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
