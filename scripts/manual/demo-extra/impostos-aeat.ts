/**
 * Dades de demo extra per a les funcions noves d'impostos i factures (NOMÉS app de proves local).
 *
 * 1) Un avís del BOE INVENTAT (ordre de prova) a l'auditoria, perquè /impostos mostri
 *    la franja vermella «Nova ordre al BOE…». No es consulta el BOE: s'escriu directament
 *    la fila que deixaria la revisió setmanal.
 * 2) Un certificat de la titular FICTICI (només les dades que es mostren: nom, NIF,
 *    caducitat i entorn «proves»), perquè surtin el bloc «Presentació directa a l'AEAT»
 *    configurat i el botó «Presentar a l'AEAT (proves)». El contingut del certificat és
 *    un text de prova: no serveix per connectar amb l'AEAT (i les fotos mai premen el botó).
 * 3) Estada 25099 (desembre de 2025) amb 480 € pagats i sense factura, perquè en obrir
 *    «Factura simple» surti l'avís «Passa de 400,00 €». Es fa al 2025 perquè no canviï
 *    cap xifra del 2026 (balanç, llibre d'IVA, impostos). Com que cau a la taxa turística
 *    d'octubre 2025 – març 2026, aquell 950 es marca com a presentat (abril de 2026).
 * 4) El 303, el 130 i el 115 del 2T de 2026 marcats com a presentats (al juliol), perquè
 *    /impostos s'obri al 3T, que és el que toca presentar ara (fins al 20 d'octubre).
 *
 * Es pot tornar a executar: cada part es salta si ja existeix.
 * Ús: npx tsx scripts/manual/demo-extra/impostos-aeat.ts
 */
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3100';
const URL_LOCAL = 'postgresql://manual:manual@localhost:5433/hostalcoll_manual';
const prisma = new PrismaClient({ datasources: { db: { url: URL_LOCAL } } });

const ID_BOE = 'BOE-A-2026-PROVA';

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

async function avisBoe() {
  const ja = await prisma.auditLog.findFirst({ where: { entitat: 'boe_formulari', entitatId: ID_BOE }, select: { id: true } });
  if (ja) return console.log('= L’avís del BOE de prova ja existeix.');
  await prisma.avisDescartat.deleteMany({ where: { tipus: 'BOE_FORMULARI', entitatId: ID_BOE } });
  await prisma.auditLog.create({
    data: {
      accio: 'CREACIO',
      entitat: 'boe_formulari',
      entitatId: ID_BOE,
      detall: {
        id: ID_BOE,
        titol: 'Orden HAC/000/2026 (DADES DE PROVA), por la que se modifican los modelos 303 y 390 de autoliquidación y declaración resumen anual del Impuesto sobre el Valor Añadido.',
        url: 'https://www.boe.es/',
        models: ['303', '390'],
        data: '2026-10-12',
      },
    },
  });
  console.log('✓ Avís del BOE de prova creat.');
}

async function certificat() {
  const e = await prisma.establiment.findUnique({ where: { id: 'hostal-coll' }, select: { aeatCertificat: true, facturaNif: true } });
  if (e?.aeatCertificat) return console.log('= El certificat de prova ja hi és.');
  await prisma.establiment.update({
    where: { id: 'hostal-coll' },
    data: {
      aeatCertificat: 'CERTIFICAT-DE-PROVA-NO-VALID',
      aeatCertNif: e?.facturaNif ?? '11111111H',
      aeatCertNom: 'TITULAR DE DEMOSTRACIO',
      aeatCertCaduca: new Date('2028-03-15T12:00:00Z'),
      aeatEntorn: 'proves',
    },
  });
  console.log('✓ Certificat de prova (fictici) desat, entorn «proves».');
}

async function estada25099() {
  const NUM = '25099';
  const ja = await prisma.estancia.findFirst({ where: { numContracte: NUM, deletedAt: null }, select: { id: true } });
  if (ja) return console.log(`= L'estada ${NUM} ja existeix (${ja.id}).`);
  const hab = await prisma.habitacio.findFirst({ where: { nom: '6' }, select: { id: true } });
  if (!hab) throw new Error("Falta l'habitació 6");
  const r = await api<{ estanciaId: string }>('POST', '/api/estancies', {
    estancia: {
      tipusRegistre: 'CONTRACTE_EN_CURS', numContracte: NUM, anyContracte: 2025,
      dataFormalitzacio: '2025-12-09', dataEntrada: '2025-12-09', dataSortida: '2025-12-17',
      numViatgers: 1, tipusPagament: 'TARGETA_CREDIT', numHabitacions: 1, habitacioId: hab.id,
      teInternet: true, idioma: 'ca',
    },
    viatgers: [{
      esTitular: true, nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', pais: 'Espanya',
      nom: 'Jordi', cognom1: 'Puig', cognom2: 'Casals', sexe: 'HOME', dataNaixement: '1972-06-21',
      numDocument: '95678923G', numSuport: 'BAM567890', dataExpedicio: '2021-09-03',
      email: 'jordi.puig@example.com', telefon: '600 000 120',
      adreca: 'Carrer del Pont, 7', provincia: 'Lleida', municipi: 'Tàrrega', codiPostal: '25300',
    }],
  });
  const id = r.estanciaId;
  await api('POST', `/api/estancies/${id}/pagaments`, { data: '2025-12-09', metode: 'TARGETA', import: 480, descripcio: 'Estada de 8 nits' });
  await api('PATCH', `/api/estancies/${id}`, { estat: 'FINALITZADA' });
  console.log(`✓ Estada ${NUM} creada (${id}) amb 480 € sense factura.`);
}

/**
 * La 25099 cau al semestre octubre 2025 – març 2026 de la taxa turística: es marca
 * aquell 950 com a presentat (abril de 2026) perquè /impostos no el doni «fora de termini».
 */
async function ieet950Anterior() {
  const ja = await prisma.declaracioFiscal.findUnique({ where: { model_any_periode: { model: '950', any: 2025, periode: 2 } } });
  if (ja) return console.log('= El 950 d’octubre 2025 – març 2026 ja consta presentat.');
  await prisma.declaracioFiscal.create({
    data: { model: '950', any: 2025, periode: 2, caselles: { nits: 7, import: 6.3 }, presentadaEl: new Date('2026-04-14T10:00:00Z') },
  });
  console.log('✓ 950 d’octubre 2025 – març 2026 marcat com a presentat.');
}

/**
 * El 2T de 2026 (termini 20/07) es marca com a presentat amb les xifres calculades,
 * com ho hauria fet l'usuària al juliol: així /impostos s'obre al 3T (el que toca ara)
 * i la franja de «Proper termini» no surt «fora de termini». Es fa amb l'API de l'app.
 */
async function presentat2T() {
  type M = { calculades: Record<string, number>; presentada: unknown; estat: string };
  const d = await api<{ trimestres: { trimestre: number; models: Record<'303' | '130' | '115', M> }[] }>('GET', '/api/impostos?any=2026');
  const t2 = d.trimestres.find((t) => t.trimestre === 2);
  if (!t2) throw new Error('No trobo el 2T');
  for (const model of ['303', '130', '115'] as const) {
    const m = t2.models[model];
    if (m.presentada) { console.log(`= El ${model} del 2T ja consta presentat.`); continue; }
    if (m.estat === 'no_cal') continue;
    await api('POST', '/api/impostos/declaracions', {
      model, any: 2026, periode: 2, caselles: m.calculades, presentadaEl: '2026-07-16T10:00:00Z',
    });
    console.log(`✓ ${model} del 2T marcat com a presentat.`);
  }
}

async function main() {
  await login();
  await avisBoe();
  await certificat();
  await estada25099();
  await ieet950Anterior();
  await presentat2T();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
