/**
 * DADES DE DEMOSTRACIÓ per a les captures del MANUAL D'USUARI.
 *
 *   npx tsx scripts/manual/demo-data.ts
 *
 * Omple la base de dades LOCAL de PROVES (Docker, port 5433) amb dades
 * INVENTADES i coherents, passant per l'API HTTP real del servidor de proves
 * (http://localhost:3100) perquè la numeració de factures, les validacions i
 * l'audit_log es generin igual que a l'app. Prisma només s'usa per:
 *   1) comprovar que el servidor de proves parla amb aquesta mateixa BD local,
 *   2) buidar les taules de negoci abans de començar (re-executable),
 *   3) retocar dates que l'API posa sempre a "ara" (p. ex. data de resolució
 *      d'una fiança, data de les valoracions) perquè les captures siguin realistes.
 *
 * SEGURETAT: l'script AVORTA si la URL de l'API no és http://localhost:3100 o si
 * la URL de la BD no conté "localhost:5433". No llegeix cap .env de producció
 * (fixa explícitament la URL de la BD local abans de crear el PrismaClient).
 *
 * RE-EXECUCIÓ: a cada execució es BUIDEN totes les taules de negoci (TRUNCATE) i
 * es conserven NOMÉS: usuari, habitacio (se'ls reescriu tipus/capacitat i la
 * bugaderia per defecte), categoria_gasto, establiment (se'n reescriuen les dades)
 * i _prisma_migrations. També s'esborra el treballador del seed ("Dona de
 * neteja"): l'script en crea de nous.
 *
 * Variables opcionals (només per apuntar a la mateixa instància local):
 *   MANUAL_BASE_URL       (per defecte http://localhost:3100)
 *   MANUAL_DATABASE_URL   (per defecte postgresql://manual:manual@localhost:5433/hostalcoll_manual)
 *   MANUAL_ADMIN_EMAIL / MANUAL_ADMIN_PASSWORD (per defecte hostalcoll@gmail.com / Manual2026!)
 *
 * Totes les persones, documents, telèfons, correus (@example.com/.org) i
 * empreses són FICTICIS.
 */

// ---------------------------------------------------------------------------
// 0) COMPROVACIONS DE SEGURETAT — abans d'importar Prisma
// ---------------------------------------------------------------------------
const BASE_URL = (process.env.MANUAL_BASE_URL ?? 'http://localhost:3100').replace(/\/+$/, '');
const DB_URL =
  process.env.MANUAL_DATABASE_URL ?? 'postgresql://manual:manual@localhost:5433/hostalcoll_manual';

function abort(msg: string): never {
  console.error(`\n[ABORTAT] ${msg}\n`);
  process.exit(1);
}

if (!/^http:\/\/(localhost|127\.0\.0\.1):3100$/.test(BASE_URL)) {
  abort(`La URL de l'API ha de ser http://localhost:3100 (rebut: ${BASE_URL}).`);
}
if (!DB_URL.includes('localhost:5433')) {
  abort(`La URL de la BD ha de contenir "localhost:5433" (BD de PROVES).`);
}
// Fixa la BD local per a Prisma (ignora qualsevol DATABASE_URL heretat).
process.env.DATABASE_URL = DB_URL;
process.env.DIRECT_URL = DB_URL;

const ADMIN_EMAIL = process.env.MANUAL_ADMIN_EMAIL ?? 'hostalcoll@gmail.com';
const ADMIN_PASSWORD = process.env.MANUAL_ADMIN_PASSWORD ?? 'Manual2026!';

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

// ---------------------------------------------------------------------------
// 1) CLIENT HTTP (només localhost:3100)
// ---------------------------------------------------------------------------
let cookie = '';
const counts: Record<string, number> = {};
const inc = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);
const avisos: string[] = [];

type Json = Record<string, unknown>;

async function api<T = Json>(method: string, path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  if (!path.startsWith('/api/')) abort(`Ruta no permesa: ${path}`);
  const url = `${BASE_URL}${path}`;
  if (!url.startsWith('http://localhost:3100/') && !url.startsWith('http://127.0.0.1:3100/')) abort(`URL no permesa: ${url}`);
  const res = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.auth === false || !cookie ? {} : { Cookie: cookie }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data)}`);
  }
  return data as T;
}
const post = <T = Json>(p: string, b?: unknown) => api<T>('POST', p, b ?? {});
const patch = <T = Json>(p: string, b: unknown) => api<T>('PATCH', p, b);
const put = <T = Json>(p: string, b: unknown) => api<T>('PUT', p, b);

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) abort(`Login fallit (${res.status}): ${await res.text()}`);
  const set = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? ''];
  const c = set.map((s) => (s ?? "").split(';')[0]).find((s) => !!s && s.startsWith('hostalcoll_session='));
  if (!c) abort('El login no ha retornat la cookie de sessió');
  cookie = c;
}

// ---------------------------------------------------------------------------
// 2) HELPERS DE DADES
// ---------------------------------------------------------------------------
const LLETRES_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';
/** DNI amb lletra de control vàlida (número inventat). */
const dni = (n: number) => `${String(n).padStart(8, '0')}${LLETRES_DNI[n % 23]}`;
/** NIE amb lletra de control vàlida (X/Y/Z + 7 dígits inventats). */
const nie = (pref: 'X' | 'Y' | 'Z', n: number) => {
  const num = Number(`${'XYZ'.indexOf(pref)}${String(n).padStart(7, '0')}`);
  return `${pref}${String(n).padStart(7, '0')}${LLETRES_DNI[num % 23]}`;
};

type Viatger = Json & { nom: string; cognom1: string; esTitular?: boolean };

const HAB: Record<string, string> = {}; // nom habitació → id

async function creaEstada(e: {
  tipus?: 'CONTRACTE_EN_CURS' | 'RESERVA';
  num: string;
  formalitzacio: string;
  entrada: string;
  sortida: string;
  hab: string;
  pagament: 'DESTINACIO' | 'BIZUM' | 'EFECTIU' | 'TRANSFERENCIA' | 'TARGETA_CREDIT';
  viatgers: Viatger[];
  mascotes?: Json[];
  observacions?: string;
  idioma?: 'ca' | 'es' | 'en' | 'fr';
  borrany?: boolean;
}): Promise<string> {
  const r = await post<{ estanciaId: string }>(`/api/estancies${e.borrany ? '?borrany=1' : ''}`, {
    estancia: {
      tipusRegistre: e.tipus ?? 'CONTRACTE_EN_CURS',
      numContracte: e.num,
      anyContracte: 2026,
      dataFormalitzacio: e.formalitzacio,
      dataEntrada: e.entrada,
      dataSortida: e.sortida,
      numViatgers: e.viatgers.length,
      tipusPagament: e.pagament,
      numHabitacions: 1,
      habitacioId: HAB[e.hab],
      teInternet: true,
      observacions: e.observacions,
      idioma: e.idioma ?? 'ca',
    },
    viatgers: e.viatgers,
    mascotes: e.mascotes,
  });
  inc('estades');
  return r.estanciaId;
}

async function pagament(estanciaId: string, data: string, metode: string, imp: number, extra: Json = {}): Promise<string> {
  const r = await post<{ cobrament: { id: string } }>(`/api/estancies/${estanciaId}/pagaments`, {
    data,
    metode,
    import: imp,
    ...extra,
  });
  inc('pagaments');
  return r.cobrament.id;
}

async function fianca(estanciaId: string, data: string, metode: string, imp: number, extra: Json = {}): Promise<string> {
  const r = await post<{ diposit: { id: string } }>(`/api/estancies/${estanciaId}/diposits`, {
    data,
    metode,
    import: imp,
    ...extra,
  });
  inc('fiances');
  return r.diposit.id;
}

async function factura(estanciaId: string, body: Json): Promise<{ id: string; numero: string }> {
  const r = await post<{ factura: { id: string; numero: string } }>(`/api/estancies/${estanciaId}/factura-seleccio`, body);
  inc('factures');
  return r.factura;
}

const finalitza = (id: string) => patch(`/api/estancies/${id}`, { estat: 'FINALITZADA' });

/** Data a mitjanit UTC (com desa l'app les dates sense hora). */
const D = (s: string) => new Date(`${s}T00:00:00.000Z`);
/** Data amb hora local d'Espanya aproximada (UTC+2 a l'estiu). */
const DH = (s: string, hhmm: string) => new Date(`${s}T${hhmm}:00.000+02:00`);

// ---------------------------------------------------------------------------
// 3) EXECUCIÓ
// ---------------------------------------------------------------------------
async function main() {
  console.log(`API: ${BASE_URL}   BD: ${DB_URL.replace(/:[^:@/]+@/, ':***@')}`);

  // 3.0 — Salut del servidor i login
  const health = await api<Json>('GET', '/api/health', undefined, { auth: false });
  if (!health?.ready) abort(`El servidor de proves no està a punt: ${JSON.stringify(health)}`);
  const marca = new Date();
  await login();

  // 3.1 — Comprova que el servidor escriu a AQUESTA BD (login enregistrat a l'audit_log local).
  const admin = await prisma.usuari.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) abort(`L'usuari ${ADMIN_EMAIL} no existeix a la BD local`);
  const loginLocal = await prisma.auditLog.findFirst({
    where: { usuariId: admin.id, accio: 'LOGIN', createdAt: { gte: new Date(marca.getTime() - 5000) } },
  });
  if (!loginLocal) {
    abort('El servidor de localhost:3100 NO sembla connectat a la BD localhost:5433 (no hi ha el LOGIN a l\'audit_log local).');
  }
  const db = (await prisma.$queryRawUnsafe<{ db: string }[]>('select current_database() as db'))[0]?.db;
  console.log(`✓ Servidor i script comparteixen la BD local "${db}"`);

  // 3.2 — Buida les taules de negoci (re-executable)
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      absencia, actiu_historial, actiu, animal, anotacio_huesped, article_bugaderia,
      avis, avis_descartat, canvi_habitacio, cobrament_periode, cobrament,
      declaracio_fiscal, diposit_periode, diposit, documento_pujat, edicio_document,
      email_programat, enviament_mossos, signatura, estancia_viatger, linia_factura,
      registre_verifactu, factura, tasa_turistica, tasca_neteja, pagament_previst,
      linia_pressupost, pressupost, estancia, gasto, huesped, incidencia, jornada,
      llibre_iva_trimestre, nomina, servei_recurrent, proveidor, tarifa, tarifa_tipus,
      treballador, valoracio, audit_log
  `);
  await prisma.$executeRawUnsafe(`UPDATE habitacio SET bugaderia_default = NULL`);
  await prisma.usuari.updateMany({ data: { failedLogins: 0, lockedUntil: null } });
  console.log('✓ Taules de negoci buidades (es conserven usuaris, habitacions, categories i establiment)');

  // 3.3 — Establiment
  await patch('/api/establiment', {
    raoSocial: 'Hostal Coll',
    descriptor: 'Pensió · Calella',
    adreca: 'Carrer de l’Església, 000 (adreça de demostració)',
    codiPostal: '08370',
    poblacio: 'Calella',
    telefon: '600 000 000',
    iban: 'ES00 0000 0000 0000 0000 0000',
    facturaTitular: 'Titular de Demostració',
    facturaNif: dni(11111111),
    fileIdentifier: 'DEMO000550',
    ieetImportPersonaNit: 0.6,
    ieetTarifa: 0.9,
    preuNetejaSortida: 18,
    preuNetejaManteniment: 10,
    preuNetejaZones: 15,
    saldoInicialTresoreria: 3000,
    benvingudaAutomatica: false,
  });
  inc('establiment (actualitzat)');

  // 3.4 — Habitacions: tipus + capacitat
  const habs = await api<{ habitacions: { id: string; nom: string }[] }>('GET', '/api/habitacions');
  for (const h of habs.habitacions) HAB[h.nom] = h.id;
  for (const n of ['1', '2', '3', '4', '5', '6']) if (!HAB[n]) abort(`Falta l'habitació ${n} (cal el seed bàsic)`);
  const tipusHab: Record<string, [string, number, string]> = {
    '1': ['Individual', 1, 'Individual exterior amb balcó'],
    '2': ['Individual', 1, 'Individual interior, molt tranquil·la'],
    '3': ['Doble', 2, 'Doble amb llit de matrimoni i aire condicionat'],
    '4': ['Doble', 2, 'Doble amb dos llits'],
    '5': ['Doble', 2, 'Doble amb bany complet i escriptori'],
    '6': ['Doble', 2, 'Doble amb terrassa'],
  };
  for (const [n, [tipus, capacitat, descripcio]] of Object.entries(tipusHab)) {
    await patch(`/api/habitacions/${HAB[n]}`, { tipus, capacitat, descripcio });
  }
  inc('habitacions (actualitzades)', 6);

  // 3.5 — Tarifes per tipus i temporada (full de preus)
  const T = (grup: string, etiqueta: string, ordre: number, mesos: number[], p: (number | null)[], reserva: number | null = null, nota: string | null = null) => ({
    grup, etiqueta, ordre, mesos,
    preuDia: p[0], preuDia4: p[1], preuSetmana: p[2], preuDosSetmanes: p[3], preuMes: p[4], reserva, nota,
  });
  await put('/api/tarifes-tipus', {
    files: [
      T('INDIVIDUAL', 'HIVERN', 1, [11, 12, 1, 2, 3, 4], [41, 38, 175, 345, 470]),
      T('INDIVIDUAL', 'MAIG', 2, [5], [47, 41, 200, 360, 620]),
      T('INDIVIDUAL', 'JUNY · JULIOL · AGOST · SETEMBRE', 3, [6, 7, 8, 9], [56, 41, 270, 470, 620]),
      T('INDIVIDUAL', 'OCTUBRE', 4, [10], [45, 40, 220, 400, 520]),
      T('DOBLE_1P', 'HIVERN', 1, [11, 12, 1, 2, 3, 4], [49, null, 220, 370, 570]),
      T('DOBLE_1P', 'ESTIU (maig–setembre)', 2, [5, 6, 7, 8, 9], [null, null, null, null, null], null, 'Preu segons Habitació Doble (maig a setembre)'),
      T('DOBLE', 'HIVERN', 1, [11, 12, 1, 2, 3, 4], [54, null, 320, 420, 620]),
      T('DOBLE', 'MAIG', 2, [5], [59, null, 330, 500, 670]),
      T('DOBLE', 'JUNY · 15–30 SETEMBRE', 3, [6], [70, null, 350, 520, 820]),
      T('DOBLE', 'JULIOL · AGOST · 1–14 SETEMBRE', 4, [7, 8], [75, 70, 450, 700, 1170], null, '70 € a partir del 4t dia'),
      T('DOBLE', 'SETEMBRE', 5, [9], [null, null, null, null, 1006], 250, 'Reserva de setembre (doble): 250 €.'),
      T('DOBLE', 'OCTUBRE', 6, [10], [58, null, 340, 460, 820]),
    ],
  });
  inc('tarifes (TarifaTipus)', 12);

  // 3.6 — Hostes (dins de les estades). Tots inventats.
  const jordi: Viatger = {
    nom: 'Jordi', cognom1: 'Puigdomènech', cognom2: 'Vila', sexe: 'HOME', dataNaixement: '1978-03-14',
    nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', numDocument: dni(12345678), numSuport: 'BAA123456',
    dataExpedicio: '2021-05-10', email: 'jordi.puigdomenech@example.com', telefon: '600 000 101',
    adreca: 'Carrer dels Til·lers, 14, 2n 1a', pais: 'Espanya', provincia: 'Girona', municipi: 'Girona', codiPostal: '17001',
  };
  const montse: Viatger = {
    nom: 'Montserrat', cognom1: 'Ribas', cognom2: 'Font', sexe: 'DONA', dataNaixement: '1980-11-02',
    nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', numDocument: dni(23456781), numSuport: 'BAB234567',
    dataExpedicio: '2022-01-20', telefon: '600 000 102',
    adreca: 'Carrer dels Til·lers, 14, 2n 1a', pais: 'Espanya', provincia: 'Girona', municipi: 'Girona', codiPostal: '17001',
  };
  const sophie: Viatger = {
    nom: 'Sophie', cognom1: 'Martin', sexe: 'DONA', dataNaixement: '1991-07-22', nacionalitat: 'França',
    tipusDocument: 'PASSAPORT', numDocument: '19FR45872', dataExpedicio: '2019-04-03',
    email: 'sophie.martin@example.org', telefon: '+33 6 00 00 00 01',
    adreca: '12 rue des Lilas', pais: 'França', localitat: 'Lyon', codiPostal: '69003',
  };
  const marc: Viatger = {
    nom: 'Marc', cognom1: 'Soler', cognom2: 'Gelabert', sexe: 'HOME', dataNaixement: '1985-01-30',
    nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', numDocument: dni(34567812), numSuport: 'BAC345678',
    dataExpedicio: '2020-09-15', email: 'marc.soler@example.com', telefon: '600 000 103',
    adreca: 'Avinguda del Parc, 7, 3r', pais: 'Espanya', provincia: 'Lleida', municipi: 'Lleida', codiPostal: '25001',
  };
  const piotr: Viatger = {
    nom: 'Piotr', cognom1: 'Kowalski', sexe: 'HOME', dataNaixement: '1983-06-08', nacionalitat: 'Polònia',
    tipusDocument: 'PASSAPORT', numDocument: 'EA1234567', dataExpedicio: '2020-02-11',
    email: 'piotr.kowalski@example.org', telefon: '+48 500 000 001',
    adreca: 'ul. Słoneczna 5', pais: 'Polònia', localitat: 'Kraków', codiPostal: '30-001',
  };
  const anna: Viatger = {
    nom: 'Anna', cognom1: 'Kowalska', sexe: 'DONA', dataNaixement: '1986-09-19', nacionalitat: 'Polònia',
    tipusDocument: 'PASSAPORT', numDocument: 'EA7654321', dataExpedicio: '2021-03-18',
    adreca: 'ul. Słoneczna 5', pais: 'Polònia', localitat: 'Kraków', codiPostal: '30-001', parentesc: 'CONJUGE',
  };
  const zofia: Viatger = {
    nom: 'Zofia', cognom1: 'Kowalska', sexe: 'DONA', dataNaixement: '2018-04-25', nacionalitat: 'Polònia',
    esMenor: true, parentesc: 'FILL_FILLA',
    adreca: 'ul. Słoneczna 5', pais: 'Polònia', localitat: 'Kraków', codiPostal: '30-001',
  };
  const ahmed: Viatger = {
    nom: 'Ahmed', cognom1: 'Benali', sexe: 'HOME', dataNaixement: '1979-12-05', nacionalitat: 'Marroc',
    tipusDocument: 'NIE', numDocument: nie('X', 1234567), numSuport: 'E00012345', dataExpedicio: '2023-06-01',
    email: 'ahmed.benali@example.com', telefon: '600 000 104',
    adreca: 'Carrer de la Riera, 33, baixos', pais: 'Espanya', provincia: 'Barcelona', municipi: 'Mataró', codiPostal: '08301',
  };
  const giulia: Viatger = {
    nom: 'Giulia', cognom1: 'Rossi', sexe: 'DONA', dataNaixement: '1994-02-17', nacionalitat: 'Itàlia',
    tipusDocument: 'PASSAPORT', numDocument: 'YA1234567', dataExpedicio: '2022-08-09',
    email: 'giulia.rossi@example.org', telefon: '+39 300 000 0001',
    adreca: 'Via dei Glicini 21', pais: 'Itàlia', localitat: 'Torino', codiPostal: '10121',
  };
  const pere: Viatger = {
    nom: 'Pere', cognom1: 'Camps', cognom2: 'Torrent', sexe: 'HOME', dataNaixement: '1968-05-28',
    nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', numDocument: dni(45678123), numSuport: 'BAD456789',
    dataExpedicio: '2019-11-11', email: 'pere.camps@example.com', telefon: '600 000 105',
    adreca: 'Passeig de les Acàcies, 2', pais: 'Espanya', provincia: 'Barcelona', municipi: 'Sabadell', codiPostal: '08201',
  };
  const nuria: Viatger = {
    nom: 'Núria', cognom1: 'Vidal', cognom2: 'Roca', sexe: 'DONA', dataNaixement: '1970-10-03',
    nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', numDocument: dni(56781234), numSuport: 'BAE567890',
    dataExpedicio: '2020-04-22', telefon: '600 000 106', parentesc: 'CONJUGE',
    adreca: 'Passeig de les Acàcies, 2', pais: 'Espanya', provincia: 'Barcelona', municipi: 'Sabadell', codiPostal: '08201',
  };
  const thomas: Viatger = {
    nom: 'Thomas', cognom1: 'Müller', sexe: 'HOME', dataNaixement: '1996-08-12', nacionalitat: 'Alemanya',
    tipusDocument: 'PASSAPORT', numDocument: 'C4J7K2L9M', dataExpedicio: '2021-07-01',
    email: 'thomas.mueller@example.org', telefon: '+49 150 0000001',
    adreca: 'Lindenstraße 8', pais: 'Alemanya', localitat: 'Köln', codiPostal: '50667',
  };
  const lukas: Viatger = {
    nom: 'Lukas', cognom1: 'Schneider', sexe: 'HOME', dataNaixement: '1997-01-23', nacionalitat: 'Alemanya',
    tipusDocument: 'PASSAPORT', numDocument: 'C8P3R5T1W', dataExpedicio: '2022-05-14',
    telefon: '+49 150 0000002',
    adreca: 'Ahornweg 3', pais: 'Alemanya', localitat: 'Köln', codiPostal: '50668',
  };
  const laura: Viatger = {
    nom: 'Laura', cognom1: 'Fernández', cognom2: 'García', sexe: 'DONA', dataNaixement: '1990-04-09',
    nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', numDocument: dni(67812345), numSuport: 'BAF678901',
    dataExpedicio: '2023-02-02', email: 'laura.fernandez@example.com', telefon: '600 000 107',
    adreca: 'Calle de los Almendros, 19', pais: 'Espanya', provincia: 'Madrid', municipi: 'Madrid', codiPostal: '28001',
  };
  const carmen: Viatger = {
    nom: 'Carmen', cognom1: 'Ruiz', cognom2: 'Ortega', sexe: 'DONA', dataNaixement: '1975-07-30',
    nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', numDocument: dni(78123456), numSuport: 'BAG789012',
    dataExpedicio: '2018-12-12', email: 'carmen.ruiz@example.com', telefon: '600 000 108',
    adreca: 'Carrer del Mar, 45', pais: 'Espanya', provincia: 'Tarragona', municipi: 'Reus', codiPostal: '43201',
  };
  const isabel: Viatger = {
    nom: 'Isabel', cognom1: 'Navarro', cognom2: 'Gil', sexe: 'DONA', dataNaixement: '1962-03-01',
    nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', numDocument: dni(81234567), numSuport: 'BAH890123',
    dataExpedicio: '2021-10-10', email: 'isabel.navarro@example.com', telefon: '600 000 109',
    adreca: 'Carrer de les Roses, 5', pais: 'Espanya', provincia: 'Barcelona', municipi: 'Terrassa', codiPostal: '08221',
  };
  const oriol: Viatger = {
    nom: 'Oriol', cognom1: 'Bosch', cognom2: 'Pujol', sexe: 'HOME', dataNaixement: '1988-12-20',
    nacionalitat: 'Espanya', tipusDocument: 'DNI_NIF', numDocument: dni(91234568), numSuport: 'BAJ901234',
    dataExpedicio: '2024-01-15', email: 'oriol.bosch@example.com', telefon: '600 000 110',
    adreca: 'Rambla Nova, 21, 1r', pais: 'Espanya', provincia: 'Barcelona', municipi: 'Vic', codiPostal: '08500',
  };
  const emma: Viatger = {
    nom: 'Emma', cognom1: 'Johnson', sexe: 'DONA', dataNaixement: '1959-05-11', nacionalitat: 'Regne Unit',
    tipusDocument: 'NIE', numDocument: nie('Y', 2345678), numSuport: 'E00067890', dataExpedicio: '2022-09-30',
    email: 'emma.johnson@example.org', telefon: '+44 7700 900001',
    adreca: '4 Orchard Lane', pais: 'Regne Unit', localitat: 'Bristol', codiPostal: 'BS1 4AA',
  };
  const hans: Viatger = {
    nom: 'Hans', cognom1: 'Peters', email: 'hans.peters@example.org', telefon: '+31 6 00000001', nacionalitat: 'Països Baixos',
  };
  const marta: Viatger = { nom: 'Marta', cognom1: 'Serra', cognom2: 'Llopis', telefon: '600 000 111', email: 'marta.serra@example.com' };
  const pierre: Viatger = { nom: 'Pierre', cognom1: 'Dubois', telefon: '+33 6 00 00 00 02', nacionalitat: 'França' };

  const T1 = (v: Viatger): Viatger => ({ ...v, esTitular: true });

  // -------------------------------------------------------------------------
  // 3.7 — ESTADES (juny–novembre 2026) + pagaments + fiances + factures
  // -------------------------------------------------------------------------
  const est: Record<string, string> = {};

  // 26001 · Jordi + Montserrat · hab 3 · 01→08/06 · FINALITZADA · Bizum · fiança TORNADA
  est.jordi = await creaEstada({
    num: '26001', formalitzacio: '2026-06-01', entrada: '2026-06-01', sortida: '2026-06-08', hab: '3',
    pagament: 'BIZUM', viatgers: [T1(jordi), { ...montse, parentesc: 'CONJUGE' }],
  });
  {
    const p = await pagament(est.jordi, '2026-06-01', 'BIZUM', 350, { descripcio: 'Setmana doble (juny)' });
    const f = await fianca(est.jordi, '2026-06-01', 'EFECTIU', 100, { notes: 'Fiança de l’habitació' });
    await factura(est.jordi, { pagamentIds: [p], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació doble · 7 nits' });
    await patch(`/api/diposits/${f}`, { estat: 'TORNAT' });
    await finalitza(est.jordi);
  }

  // 26002 · Sophie · hab 1 · 10→24/06 · targeta · simplificada → «fiscal de simplificades»
  est.sophie = await creaEstada({
    num: '26002', formalitzacio: '2026-06-10', entrada: '2026-06-10', sortida: '2026-06-24', hab: '1',
    pagament: 'TARGETA_CREDIT', viatgers: [T1(sophie)], idioma: 'fr',
  });
  {
    const p = await pagament(est.sophie, '2026-06-10', 'TARGETA', 470, { descripcio: '2 setmanes individual' });
    const s = await factura(est.sophie, { pagamentIds: [p], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació individual · 14 nits' });
    await post(`/api/estancies/${est.sophie}/factura-fiscal-simples`, {
      simplesIds: [s.id], descripcioAllotjament: 'Allotjament habitació individual del 10/06/2026 al 24/06/2026',
    });
    inc('factures');
    await finalitza(est.sophie);
  }

  // 26003 · Marc (treballa per a una empresa) · hab 2 · 15/06→15/07 · transferència · FACTURA FISCAL a nom de l'empresa
  est.marc = await creaEstada({
    num: '26003', formalitzacio: '2026-06-15', entrada: '2026-06-15', sortida: '2026-07-15', hab: '2',
    pagament: 'TRANSFERENCIA', viatgers: [T1(marc)], observacions: 'Factura a nom de l’empresa (Instal·lacions Litoral Demo, SL).',
  });
  {
    const p = await pagament(est.marc, '2026-06-15', 'TRANSFERENCIA', 620, { descripcio: 'Mes complet individual' });
    const f = await factura(est.marc, { pagamentIds: [p], tipusDocument: 'FACTURA', descripcioAllotjament: 'Allotjament habitació individual · 15/06/2026 – 15/07/2026' });
    await patch(`/api/factures/${f.id}`, {
      clientNom: 'Instal·lacions Litoral Demo, SL',
      clientNif: 'B00000000',
      clientAdreca: 'Polígon Industrial Demo, nau 4',
      clientLocalitat: '25001 Lleida',
    });
    await finalitza(est.marc);
  }

  // 26004 · Família Kowalski (menor + gos) · hab 4 · 01→15/07 · efectiu + Bizum · fiança TORNADA
  est.kowalski = await creaEstada({
    num: '26004', formalitzacio: '2026-07-01', entrada: '2026-07-01', sortida: '2026-07-15', hab: '4',
    pagament: 'EFECTIU', viatgers: [T1(piotr), anna, zofia], idioma: 'en',
    mascotes: [{ nom: 'Rex', especie: 'Gos', mida: 'MITJA' }],
    observacions: 'Viatgen amb un gos (Rex). Llit supletori per a la nena.',
  });
  {
    const p1 = await pagament(est.kowalski, '2026-07-01', 'EFECTIU', 400);
    const p2 = await pagament(est.kowalski, '2026-07-01', 'BIZUM', 300);
    const f = await fianca(est.kowalski, '2026-07-01', 'TARGETA', 150, { notes: 'Fiança mascota' });
    await factura(est.kowalski, { pagamentIds: [p1, p2], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació doble · 14 nits' });
    await patch(`/api/diposits/${f}`, { estat: 'TORNAT' });
    await finalitza(est.kowalski);
  }

  // 26005 · Ahmed · hab 6 · 05→26/07 · efectiu · factura AMB FIANÇA INCLOSA · fiança RETINGUDA
  est.ahmed = await creaEstada({
    num: '26005', formalitzacio: '2026-07-05', entrada: '2026-07-05', sortida: '2026-07-26', hab: '6',
    pagament: 'EFECTIU', viatgers: [T1(ahmed)], idioma: 'es',
  });
  {
    const p = await pagament(est.ahmed, '2026-07-05', 'EFECTIU', 1150, { descripcio: '3 setmanes doble (1 persona)' });
    const f = await fianca(est.ahmed, '2026-07-05', 'EFECTIU', 100, { notes: 'Fiança de les claus' });
    await factura(est.ahmed, { pagamentIds: [p], fiancaIds: [f], ambFianca: true, tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació doble · 21 nits (inclou fiança)' });
    await patch(`/api/diposits/${f}`, { estat: 'RETINGUT', motiu: 'No ha retornat les claus de l’habitació ni el comandament de l’aire condicionat' });
    await finalitza(est.ahmed);
  }

  // 26006 · Giulia · hab 1 · 01→15/08 + AMPLIACIÓ 26006_1 (15→29/08)
  est.giulia = await creaEstada({
    num: '26006', formalitzacio: '2026-08-01', entrada: '2026-08-01', sortida: '2026-08-15', hab: '1',
    pagament: 'TARGETA_CREDIT', viatgers: [T1(giulia)], idioma: 'en',
  });
  {
    const p = await pagament(est.giulia, '2026-08-01', 'TARGETA', 470);
    await factura(est.giulia, { pagamentIds: [p], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació individual · 14 nits' });
    const amp = await post<{ estanciaId: string; numContracte: string }>(`/api/estancies/${est.giulia}/ampliar`, {
      dataEntrada: '2026-08-15', dataSortida: '2026-08-29', habitacioId: HAB['1'],
    });
    inc('estades');
    est.giuliaAmp = amp.estanciaId;
    const p2 = await pagament(amp.estanciaId, '2026-08-15', 'BIZUM', 470, { descripcio: 'Ampliació 2 setmanes' });
    await factura(amp.estanciaId, { pagamentIds: [p2], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació individual (ampliació) · 14 nits' });
    await finalitza(est.giulia);
    await finalitza(amp.estanciaId);
  }

  // 26007 · Pere + Núria · hab 3 → CANVI D'HABITACIÓ a la 4 el 17/08 · transferència
  est.pere = await creaEstada({
    num: '26007', formalitzacio: '2026-08-10', entrada: '2026-08-10', sortida: '2026-08-24', hab: '3',
    pagament: 'TRANSFERENCIA', viatgers: [T1(pere), nuria],
  });
  {
    const p = await pagament(est.pere, '2026-08-03', 'TRANSFERENCIA', 700, { descripcio: 'Pagament per avançat (2 setmanes)' });
    await factura(est.pere, { pagamentIds: [p], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació doble · 14 nits' });
    await post(`/api/estancies/${est.pere}/canvi-habitacio`, { habitacioId: HAB['4'], data: '2026-08-17' });
    inc('canvis d’habitació');
    await finalitza(est.pere);
  }

  // 26008 · Thomas (hab 6) + Lukas amb HABITACIÓ SEPARADA (consta a la 5, contracte 26009)
  est.thomas = await creaEstada({
    num: '26008', formalitzacio: '2026-08-20', entrada: '2026-08-20', sortida: '2026-08-27', hab: '6',
    pagament: 'EFECTIU', viatgers: [T1(thomas), { ...lukas, parentesc: 'ALTRES', habitacioSeparadaId: HAB['5'], numContracteSeparat: '26009' }],
    idioma: 'en', observacions: 'Grup d’amics: en Lukas consta a l’habitació 5 (full separat 26009).',
  });
  {
    const p = await pagament(est.thomas, '2026-08-20', 'EFECTIU', 450);
    await factura(est.thomas, { pagamentIds: [p], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació doble · 7 nits' });
    await finalitza(est.thomas);
  }

  // 26010 · Laura · hab 5 · 01/09→30/11 (llarga estada, EN CURS) · mensualitats per transferència
  //         fiança/dipòsit EN CUSTÒDIA amb «factura de dipòsit» · pagament previst de novembre
  est.laura = await creaEstada({
    num: '26010', formalitzacio: '2026-09-01', entrada: '2026-09-01', sortida: '2026-11-30', hab: '5',
    pagament: 'TRANSFERENCIA', viatgers: [T1(laura)], idioma: 'es',
    observacions: 'Llarga estada (resident temporal). Paga per mesos per transferència.',
  });
  {
    const p1 = await pagament(est.laura, '2026-09-01', 'TRANSFERENCIA', 820, { descripcio: 'Mensualitat de setembre' });
    await factura(est.laura, { pagamentIds: [p1], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació doble · setembre 2026' });
    const p2 = await pagament(est.laura, '2026-10-01', 'TRANSFERENCIA', 820, { descripcio: 'Mensualitat d’octubre' });
    await factura(est.laura, { pagamentIds: [p2], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació doble · octubre 2026' });
    const d = await fianca(est.laura, '2026-09-01', 'TRANSFERENCIA', 400, { esDiposit: true, notes: 'Dipòsit llarga estada' });
    await post(`/api/diposits/${d}/document`, {});
    inc('factures');
    await post(`/api/estancies/${est.laura}/pagaments-previstos`, { import: 820, dataPrevista: '2026-11-01', concepte: 'Mensualitat de novembre' });
    inc('pagaments previstos');
  }

  // 26011 · Carmen · hab 2 · 05→26/09, SORTIDA ANTICIPADA el 19/09 amb devolució + RECTIFICATIVA R26-001
  est.carmen = await creaEstada({
    num: '26011', formalitzacio: '2026-09-05', entrada: '2026-09-05', sortida: '2026-09-26', hab: '2',
    pagament: 'TARGETA_CREDIT', viatgers: [T1(carmen)], idioma: 'es',
  });
  {
    const p = await pagament(est.carmen, '2026-09-05', 'TARGETA', 700, { descripcio: '3 setmanes individual' });
    const f = await factura(est.carmen, { pagamentIds: [p], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació individual · 21 nits' });
    await post(`/api/estancies/${est.carmen}/finalitzar-anticipada`, {
      dataSortida: '2026-09-19', retorn: true, retornImport: 230, retornMetode: 'TARGETA',
    });
    inc('sortides anticipades');
    const devolucio = await prisma.cobrament.findFirst({ where: { estanciaId: est.carmen, import: { lt: 0 } } });
    const r = await post<{ factura: { numero: string } }>(`/api/estancies/${est.carmen}/factura-rectificativa`, {
      facturaOriginalId: f.id, import: 230, motiu: 'sortida anticipada (7 nits no gaudides)', data: '2026-09-19',
      cobramentIds: devolucio ? [devolucio.id] : [],
    });
    inc('factures');
    if (r.factura.numero !== 'R26-001') avisos.push(`La rectificativa ha sortit amb el número ${r.factura.numero} (s'esperava R26-001)`);
  }

  // 26012 · Isabel · hab 3 · 10→17/09 · Bizum
  est.isabel = await creaEstada({
    num: '26012', formalitzacio: '2026-09-10', entrada: '2026-09-10', sortida: '2026-09-17', hab: '3',
    pagament: 'BIZUM', viatgers: [T1(isabel)],
  });
  {
    const p = await pagament(est.isabel, '2026-09-10', 'BIZUM', 350);
    await factura(est.isabel, { pagamentIds: [p], tipusDocument: 'FACTURA_SIMPLIFICADA', descripcioAllotjament: 'Allotjament habitació doble (1 persona) · 7 nits' });
    await finalitza(est.isabel);
  }

  // 26013 · Oriol · hab 3 · 12→22/10 · EN CURS avui · pagament parcial a compte + COBRAMENT PENDENT (previst 21/10) · fiança en custòdia
  est.oriol = await creaEstada({
    num: '26013', formalitzacio: '2026-10-12', entrada: '2026-10-12', sortida: '2026-10-22', hab: '3',
    pagament: 'BIZUM', viatgers: [T1(oriol)],
  });
  await pagament(est.oriol, '2026-10-12', 'BIZUM', 200, { descripcio: 'Primer pagament a compte' });
  await fianca(est.oriol, '2026-10-12', 'EFECTIU', 100, { notes: 'Fiança de l’habitació' });
  await post(`/api/estancies/${est.oriol}/pagaments-previstos`, { import: 260, dataPrevista: '2026-10-21', concepte: 'Resta de l’estada' });
  inc('pagaments previstos');

  // 26014 · Emma · hab 4 · 15→25/10 · EN CURS · factura amb IVA i taxa turística, cobrada parcialment (PENDENT)
  est.emma = await creaEstada({
    num: '26014', formalitzacio: '2026-10-15', entrada: '2026-10-15', sortida: '2026-10-25', hab: '4',
    pagament: 'TARGETA_CREDIT', viatgers: [T1(emma)], idioma: 'en',
  });
  {
    const r = await post<{ factura: { id: string } }>('/api/factures', {
      estanciaId: est.emma, numero: '26014', data: '2026-10-15', ivaPercent: 10, aplicarTasa: true,
      tipusDocument: 'FACTURA_SIMPLIFICADA',
      linies: [
        { concepte: 'ALLOTJAMENT', descripcio: 'Allotjament habitació doble', quantitat: 10, import: 490.91 },
        { concepte: 'EXTRA', descripcio: 'Bugaderia (2 rentades)', quantitat: 2, import: 12 },
      ],
    });
    inc('factures');
    await post(`/api/factures/${r.factura.id}/cobraments`, { metode: 'TARGETA', import: 250, data: '2026-10-15' });
    inc('pagaments');
  }

  // 26015 · Hans · hab 6 · RESERVA 24→31/10 · paga i senyal per Bizum + pagament previst a l'arribada
  est.hans = await creaEstada({
    tipus: 'RESERVA', num: '26015', formalitzacio: '2026-10-02', entrada: '2026-10-24', sortida: '2026-10-31', hab: '6',
    pagament: 'DESTINACIO', viatgers: [T1(hans)], idioma: 'en', observacions: 'Reserva per correu. Arribada prevista cap a les 18 h.',
  });
  await pagament(est.hans, '2026-10-02', 'BIZUM', 60, { descripcio: 'Paga i senyal' });
  await post(`/api/estancies/${est.hans}/pagaments-previstos`, { import: 346, dataPrevista: '2026-10-24', concepte: 'Resta de l’estada (a l’arribada)' });
  inc('pagaments previstos');

  // 26016 · Marta · hab 1 · RESERVA 06→20/11
  est.marta = await creaEstada({
    tipus: 'RESERVA', num: '26016', formalitzacio: '2026-10-08', entrada: '2026-11-06', sortida: '2026-11-20', hab: '1',
    pagament: 'DESTINACIO', viatgers: [T1(marta)],
  });

  // 26017 · Jordi + Montserrat tornen (CRM: mateixa fitxa per document) · hab 3 · RESERVA 14→21/11 · reserva per transferència
  est.jordi2 = await creaEstada({
    tipus: 'RESERVA', num: '26017', formalitzacio: '2026-10-10', entrada: '2026-11-14', sortida: '2026-11-21', hab: '3',
    pagament: 'TRANSFERENCIA',
    viatgers: [T1({ nom: jordi.nom, cognom1: jordi.cognom1, cognom2: jordi.cognom2, tipusDocument: 'DNI_NIF', numDocument: jordi.numDocument, email: jordi.email, telefon: jordi.telefon }),
      { nom: montse.nom, cognom1: montse.cognom1, cognom2: montse.cognom2, tipusDocument: 'DNI_NIF', numDocument: montse.numDocument, telefon: montse.telefon, parentesc: 'CONJUGE' }],
    observacions: 'Clients repetidors.',
  });
  await pagament(est.jordi2, '2026-10-10', 'TRANSFERENCIA', 100, { descripcio: 'Reserva' });

  // ESBORRANY · Pierre · hab 2 · 25→28/10 · dades incompletes, sense número de contracte
  est.pierre = await creaEstada({
    num: '', formalitzacio: '2026-10-17', entrada: '2026-10-25', sortida: '2026-10-28', hab: '2',
    pagament: 'DESTINACIO', viatgers: [T1(pierre)], idioma: 'fr', borrany: true,
    observacions: 'Falta el document d’identitat: demanar-lo a l’arribada.',
  });
  inc('esborranys');

  // Retocs de dates que l'API posa sempre a "ara" (perquè les captures siguin realistes).
  const resolucions: [string, string][] = [
    [est.jordi, '2026-06-08'], [est.kowalski, '2026-07-15'], [est.ahmed, '2026-07-26'],
  ];
  for (const [eid, data] of resolucions) {
    await prisma.diposit.updateMany({ where: { estanciaId: eid, estat: { not: 'EN_CUSTODIA' } }, data: { dataResolucio: D(data) } });
  }
  // Data de formalització de l'ampliació (l'API hi posa "avui").
  await prisma.estancia.update({ where: { id: est.giuliaAmp }, data: { dataFormalitzacio: D('2026-08-14') } });
  // Benvinguda ja enviada a les estades passades (no surten com a pendents al tauler).
  await prisma.estancia.updateMany({ where: { estat: 'FINALITZADA' }, data: { benvingudaEnviada: true, avisMossosParat: true } });

  // -------------------------------------------------------------------------
  // 3.8 — Notes internes (CRM)
  // -------------------------------------------------------------------------
  const hostId = async (estanciaId: string, nom: string) => {
    const v = await prisma.estanciaViatger.findFirst({ where: { estanciaId, huesped: { nom } }, select: { huespedId: true } });
    if (!v) throw new Error(`Hoste ${nom} no trobat`);
    return v.huespedId;
  };
  const notes: [string, string, Json][] = [
    [est.jordi, 'Jordi', { sentit: 'POSITIVA', tipus: 'Comportament', descripcio: 'Van deixar l’habitació en perfecte estat i han tornat a reservar per al novembre.', estanciaId: est.jordi }],
    [est.thomas, 'Thomas', { sentit: 'NEGATIVA', tipus: 'Soroll', descripcio: 'El 22/08/2026 cap a les 00:30 es va haver de demanar dues vegades que abaixessin la música.', estanciaId: est.thomas }],
    [est.emma, 'Emma', { sentit: 'NEUTRA', tipus: 'Preferència', descripcio: 'Demana una habitació tranquil·la, lluny del carrer. Al·lèrgica als ácars: coixí sintètic.' }],
    [est.kowalski, 'Piotr', { sentit: 'POSITIVA', tipus: 'Mascota', descripcio: 'El gos (Rex) es va portar molt bé; cap desperfecte a l’habitació.', estanciaId: est.kowalski }],
  ];
  for (const [eid, nom, body] of notes) {
    await post(`/api/huespedes/${await hostId(eid, nom)}/anotacions`, body);
    inc('notes internes');
  }

  // -------------------------------------------------------------------------
  // 3.9 — Proveïdors i despeses
  // -------------------------------------------------------------------------
  const cats = await api<{ categories: { id: string; nom: string }[] }>('GET', '/api/categories-gasto');
  const CAT = Object.fromEntries(cats.categories.map((c) => [c.nom, c.id]));
  const cat = (n: string) => CAT[n] ?? abort(`Falta la categoria de despesa "${n}"`);

  const prov = async (b: Json) => {
    const r = await post<{ proveidor: { id: string } }>('/api/proveidors', b);
    inc('proveïdors');
    return r.proveidor.id;
  };
  const PV = {
    lloguer: await prov({ nom: 'Finques Riera Demo, SL', cif: 'B00000001', activitat: 'Lloguer del local', telefon: '600 000 201', email: 'admin@finques-demo.example.com', adreca: 'Carrer Major, 1, Calella' }),
    llum: await prov({ nom: 'Energia Litoral Demo, SA', cif: 'A00000002', activitat: 'Subministrament elèctric', telefon: '900 000 002', web: 'https://energia.example.com' }),
    aigua: await prov({ nom: 'Aigües del Maresme Demo', cif: 'A00000003', activitat: 'Subministrament d’aigua', telefon: '900 000 003' }),
    internet: await prov({ nom: 'Telecom Costa Demo, SL', cif: 'B00000004', activitat: 'Internet i telèfon', telefon: '900 000 004' }),
    drogueria: await prov({ nom: 'Drogueria Can Pons Demo', cif: 'B00000005', activitat: 'Productes de neteja', telefon: '600 000 205' }),
    bugaderia: await prov({ nom: 'Bugaderia Industrial La Riera Demo', cif: 'B00000006', activitat: 'Bugaderia de llençols i tovalloles', telefon: '600 000 206' }),
    assegurança: await prov({ nom: 'Mútua d’Assegurances Demo', cif: 'V00000007', activitat: 'Assegurança multirisc', telefon: '900 000 007' }),
    extintors: await prov({ nom: 'Extintors Maresme Demo, SL', cif: 'B00000008', activitat: 'Manteniment d’extintors', telefon: '600 000 208', contacte: 'Sr. Prat' }),
    lopd: await prov({ nom: 'Protecció de Dades Consultors Demo', cif: 'B00000009', activitat: 'Risc i LOPD', email: 'lopd@consultors-demo.example.com' }),
    tecnic: await prov({ nom: 'Climatització Ràpida Demo', cif: 'B00000010', activitat: 'Reparació d’aire condicionat', telefon: '600 000 210' }),
    mobles: await prov({ nom: 'Mobles i Descans Demo, SL', cif: 'B00000011', activitat: 'Mobiliari i matalassos' }),
    electro: await prov({ nom: 'Electrodomèstics Calella Demo', cif: 'B00000012', activitat: 'Electrodomèstics' }),
  };

  const gasto = async (b: Json) => {
    await post('/api/gastos', { ignoraDuplicat: true, ...b });
    inc('despeses');
  };
  const iva21 = (base: number) => Math.round(base * 121) / 100;

  // Electricitat (bimestral) amb base i IVA
  for (const [data, base, num] of [
    ['2026-04-30', 154.0, 'EL-26-0412'], ['2026-06-30', 182.6, 'EL-26-0633'], ['2026-08-31', 286.4, 'EL-26-0851'], ['2026-10-02', 241.2, 'EL-26-1007'],
  ] as const) {
    await gasto({ data, import: iva21(base), baseImposable: base, ivaPercent: 21, categoriaId: cat('Electricitat'), proveidorId: PV.llum, descripcio: 'Factura d’electricitat (bimestral)', numFactura: num, metodePagament: 'TRANSFERENCIA' });
  }
  // Aigua (trimestral) amb DESGLOSSAMENT d'IVA (10% + 21%)
  for (const [data, b10, b21, num] of [['2026-04-15', 61.2, 14.8, 'AG-2026-1-0091'], ['2026-07-15', 88.4, 16.9, 'AG-2026-2-0143'], ['2026-10-14', 97.1, 17.3, 'AG-2026-3-0188']] as const) {
    const total = Math.round((b10 * 1.1 + b21 * 1.21) * 100) / 100;
    await gasto({ data, import: total, desglossamentIva: [{ base: b10, ivaPercent: 10 }, { base: b21, ivaPercent: 21 }], categoriaId: cat('Aigua'), proveidorId: PV.aigua, descripcio: 'Factura d’aigua (trimestre) · consum + cànon', numFactura: num, metodePagament: 'TRANSFERENCIA' });
  }
  // Internet (mensual)
  for (const m of ['04', '05', '06', '07', '08', '09', '10']) {
    await gasto({ data: `2026-${m}-05`, import: 45.98, baseImposable: 38, ivaPercent: 21, categoriaId: cat('Internet'), proveidorId: PV.internet, descripcio: 'Fibra i telèfon fix', numFactura: `TC-${m}26-5521`, metodePagament: 'TRANSFERENCIA' });
  }
  // Neteja (tiquets sense desglossar → IVA 21% inclòs)
  for (const [data, imp] of [['2026-05-12', 64.35], ['2026-06-18', 82.9], ['2026-07-21', 97.4], ['2026-08-19', 71.15], ['2026-09-23', 58.6]] as const) {
    await gasto({ data, import: imp, categoriaId: cat('Neteja'), proveidorId: PV.drogueria, descripcio: 'Productes de neteja i paper higiènic', metodePagament: 'TARGETA' });
  }
  // Bugaderia industrial (mensual juny–setembre)
  for (const [data, base] of [['2026-06-30', 140], ['2026-07-31', 210], ['2026-08-31', 236], ['2026-09-30', 168]] as const) {
    await gasto({ data, import: iva21(base), baseImposable: base, ivaPercent: 21, categoriaId: cat('Neteja'), proveidorId: PV.bugaderia, descripcio: 'Servei de bugaderia de llençols i tovalloles', numFactura: `BUG-${data.slice(5, 7)}/26`, metodePagament: 'TRANSFERENCIA' });
  }
  // Manteniment: reparació de l'aire condicionat de l'habitació 3
  await gasto({ data: '2026-08-19', import: iva21(120), baseImposable: 120, ivaPercent: 21, categoriaId: cat('Manteniment'), proveidorId: PV.tecnic, habitacioId: HAB['3'], descripcio: 'Reparació de l’aire condicionat (càrrega de gas)', numFactura: 'CR-2026-0219', metodePagament: 'BIZUM' });
  // Mobiliari i electrodomèstics
  await gasto({ data: '2026-06-20', import: iva21(289), baseImposable: 289, ivaPercent: 21, categoriaId: cat('Mobiliari'), proveidorId: PV.mobles, habitacioId: HAB['4'], descripcio: 'Matalàs nou 150×190 per a l’habitació 4', numFactura: 'MD-1187', metodePagament: 'TARGETA' });
  await gasto({ data: '2026-07-02', import: iva21(379), baseImposable: 379, ivaPercent: 21, categoriaId: cat('Electrodomèstics'), proveidorId: PV.electro, descripcio: 'Rentadora 8 kg', numFactura: 'EC-26-0702', metodePagament: 'TARGETA' });
  // Màrqueting i Animals
  await gasto({ data: '2026-05-20', import: 60.5, baseImposable: 50, ivaPercent: 21, categoriaId: cat('Màrqueting'), descripcio: 'Targetes de visita i fullets', metodePagament: 'EFECTIU', proveidorNom: 'Impremta Demo Calella', proveidorNif: 'B00000013' });
  const rex = await prisma.animal.findFirst({ where: { nom: 'Rex' }, select: { id: true } });
  await gasto({ data: '2026-07-15', import: 25, categoriaId: cat('Animals'), animalId: rex?.id, habitacioId: HAB['4'], descripcio: 'Neteja extra de l’habitació per pèl de gos', metodePagament: 'EFECTIU' });
  // Personal (Seguretat Social del treballador)
  for (const m of ['08', '09']) {
    await gasto({ data: `2026-${m}-30`, import: 382.4, ivaPercent: 0, baseImposable: 382.4, categoriaId: cat('Personal'), descripcio: 'Seguretat Social del treballador (TC)', metodePagament: 'TRANSFERENCIA' });
  }
  // Despesa marcada com a FIANÇA pagada (recuperable, no compta al balanç)
  await gasto({ data: '2026-04-10', import: 300, ivaPercent: 0, baseImposable: 300, categoriaId: cat('Electricitat'), proveidorId: PV.llum, descripcio: 'Fiança del contracte d’augment de potència', metodePagament: 'TRANSFERENCIA', esFianca: true });

  // Serveis recurrents
  const servei = async (b: Json) => {
    const r = await post<{ servei: { id: string } }>('/api/serveis-recurrents', b);
    inc('serveis recurrents');
    return r.servei.id;
  };
  // Lloguer del local amb IVA i IRPF (es registren les factures d'abril a octubre)
  const sLloguer = await servei({
    activitat: 'Lloguer del local', proveidorId: PV.lloguer, categoriaId: cat('Altres'), frequencia: 'MENSUAL',
    importPrevist: 1020, metodePagament: 'TRANSFERENCIA', properaData: '2026-04-01', generaDespesa: false, esFix: true,
    vigenciaInici: '2024-01-01', vigenciaFi: '2028-12-31', observacions: 'Base 1.000 € + IVA 21 % − IRPF 19 %.',
  });
  await prisma.serveiRecurrent.update({ where: { id: sLloguer }, data: { baseImposable: 1000, ivaPercent: 21, irpfPercent: 19 } });
  for (const m of ['04', '05', '06', '07', '08', '09', '10']) {
    await post(`/api/serveis-recurrents/${sLloguer}/registrar`, {
      data: `2026-${m}-01`, import: 1020, baseImposable: 1000, ivaPercent: 21, irpfPercent: 19, metodePagament: 'TRANSFERENCIA', numFactura: `LL-2026-${m}`,
    });
    inc('despeses');
  }
  // Assegurança (anual, ja pagada al maig) — sense IVA
  const sAsseg = await servei({
    activitat: 'Assegurança multirisc', proveidorId: PV.assegurança, categoriaId: cat('Assegurances'), frequencia: 'ANUAL',
    importPrevist: 486.2, metodePagament: 'TRANSFERENCIA', properaData: '2026-05-15', generaDespesa: false,
    vigenciaInici: '2026-05-15', vigenciaFi: '2027-05-14', observacions: 'Pòlissa núm. DEMO-0001',
  });
  await post(`/api/serveis-recurrents/${sAsseg}/registrar`, { data: '2026-05-15', import: 486.2, baseImposable: 486.2, ivaPercent: 0, numFactura: 'POL-DEMO-0001' });
  inc('despeses');
  // Extintors (anual, propera revisió d'aquí a poc) i LOPD
  await servei({ activitat: 'Revisió d’extintors', proveidorId: PV.extintors, categoriaId: cat('Manteniment'), frequencia: 'ANUAL', importPrevist: 95, metodePagament: 'TRANSFERENCIA', properaData: '2026-11-05', generaDespesa: true, observacions: '4 extintors (planta baixa i primer pis).' });
  await servei({ activitat: 'Risc i LOPD', proveidorId: PV.lopd, categoriaId: cat('Altres'), frequencia: 'ANUAL', importPrevist: 180, metodePagament: 'TRANSFERENCIA', properaData: '2027-01-20', generaDespesa: true });
  // Despeses fixes (només recordatori)
  for (const b of [
    { activitat: 'Quota d’autònoms', frequencia: 'MENSUAL', importPrevist: 294, metodePagament: 'TRANSFERENCIA', properaData: '2026-10-31', observacions: 'Càrrec domiciliat a final de mes.' },
    { activitat: 'Gestoria', frequencia: 'MENSUAL', importPrevist: 90, metodePagament: 'TRANSFERENCIA', properaData: '2026-10-30' },
    { activitat: 'Taxa d’escombraries', frequencia: 'ANUAL', importPrevist: 210, metodePagament: 'TRANSFERENCIA', properaData: '2027-03-01' },
  ]) {
    await post('/api/gastos-fixos', b);
    inc('despeses fixes');
  }

  // -------------------------------------------------------------------------
  // 3.10 — Personal: treballadors, jornades, absències, nòmina
  // -------------------------------------------------------------------------
  const treb = async (b: Json) => {
    const r = await post<{ treballador: { id: string } }>('/api/treballadors', b);
    inc('treballadors');
    return r.treballador.id;
  };
  const rosa = await treb({ nom: 'Rosa Martí Puig', dni: dni(13579246), carrec: 'Neteja', telefon: '600 000 301', email: 'rosa.marti@example.com', dataContractacio: '2025-05-01', preuSortida: 18, preuManteniment: 10, preuZones: 15 });
  const joan = await treb({ nom: 'Joan Ferrer Sala', dni: dni(24681357), carrec: 'Recepció', telefon: '600 000 302', email: 'joan.ferrer@example.com', dataContractacio: '2026-06-01', preuHora: 11, salari: 1180, costEmpresa: 1562 });

  for (const [data, hores, notes] of [
    ['2026-09-07', 6, 'Torn de tarda'], ['2026-09-14', 6, 'Torn de tarda'], ['2026-09-21', 5, null], ['2026-09-28', 6, null],
    ['2026-10-05', 6, 'Torn de tarda'], ['2026-10-10', 4, 'Inventari de llençols'], ['2026-10-12', 6, null], ['2026-10-17', 6, 'Arribades del cap de setmana'],
  ] as const) {
    await post(`/api/treballadors/${joan}/jornades`, { data, hores, notes: notes ?? undefined });
    inc('jornades');
  }
  // Les jornades de setembre ja estan pagades.
  await prisma.jornada.updateMany({ where: { treballadorId: joan, data: { lt: D('2026-10-01') } }, data: { pagada: true, dataPagament: D('2026-10-01') } });
  await post(`/api/treballadors/${joan}/absencies`, { tipus: 'VACANCES', dataInici: '2026-10-26', dataFi: '2026-11-01' });
  await post(`/api/treballadors/${rosa}/absencies`, { tipus: 'BAIXA', dataInici: '2026-09-22', dataFi: '2026-09-24' });
  await post(`/api/treballadors/${joan}/absencies`, { tipus: 'ALTRES', dataInici: '2026-09-18', dataFi: '2026-09-18' });
  inc('absències', 3);
  await post(`/api/treballadors/${joan}/nomines`, { periode: '2026-09', base: 1180, extres: 66, bonificacions: 0 });
  inc('nòmines');

  // -------------------------------------------------------------------------
  // 3.11 — Bugaderia: catàleg + defectes per habitació
  // -------------------------------------------------------------------------
  for (const [nom, preu] of [['Llençol', 1.2], ['Funda de coixí', 0.5], ['Funda nòrdica', 2.4], ['Tovallola gran', 0.9], ['Tovallola petita', 0.6], ['Estora de bany', 0.6], ['Protector de matalàs', 1.5]] as const) {
    await post('/api/bugaderia/articles', { nom, preu });
    inc('articles de bugaderia');
  }
  const bugIndividual = { manteniment: [{ article: 'Tovallola gran', qty: 1 }, { article: 'Tovallola petita', qty: 1 }], sortida: [{ article: 'Llençol', qty: 2 }, { article: 'Funda de coixí', qty: 1 }, { article: 'Tovallola gran', qty: 1 }, { article: 'Tovallola petita', qty: 1 }, { article: 'Estora de bany', qty: 1 }] };
  const bugDoble = { manteniment: [{ article: 'Tovallola gran', qty: 2 }, { article: 'Tovallola petita', qty: 2 }], sortida: [{ article: 'Llençol', qty: 2 }, { article: 'Funda de coixí', qty: 2 }, { article: 'Funda nòrdica', qty: 1 }, { article: 'Tovallola gran', qty: 2 }, { article: 'Tovallola petita', qty: 2 }, { article: 'Estora de bany', qty: 1 }] };
  for (const n of ['1', '2', '3', '4', '5', '6']) {
    await patch(`/api/bugaderia/habitacions/${HAB[n]}`, n === '1' || n === '2' ? bugIndividual : bugDoble);
  }
  await put(`/api/estancies/${est.laura}/bugaderia`, { manteniment: bugDoble.manteniment, sortida: bugDoble.sortida });

  // -------------------------------------------------------------------------
  // 3.12 — Tasques de neteja (Rosa)
  // -------------------------------------------------------------------------
  const tasca = async (data: string, hab: string, tipus: 'CANVI_COMPLET' | 'REPAS', o: { feta?: boolean; vinc?: string; notes?: string; bug?: { article: string; qty: number }[] } = {}) => {
    const r = await post<{ tasca: { id: string } }>('/api/tasques-neteja', { data, habitacioId: HAB[hab], tipus, assignadaA: rosa, vinculadaSortidaId: o.vinc, notes: o.notes });
    inc('tasques de neteja');
    if (o.bug) await patch(`/api/tasques-neteja/${r.tasca.id}`, { bugaderia: o.bug });
    if (o.feta) await patch(`/api/tasques-neteja/${r.tasca.id}`, { estat: 'FETA' });
    return r.tasca.id;
  };
  await tasca('2026-06-08', '3', 'CANVI_COMPLET', { feta: true, vinc: est.jordi });
  await tasca('2026-06-24', '1', 'CANVI_COMPLET', { feta: true, vinc: est.sophie });
  await tasca('2026-07-08', '4', 'REPAS', { feta: true });
  await tasca('2026-07-15', '4', 'CANVI_COMPLET', { feta: true, vinc: est.kowalski, notes: 'Aspirar bé el pèl del gos.' });
  await tasca('2026-07-15', '2', 'CANVI_COMPLET', { feta: true, vinc: est.marc });
  await tasca('2026-07-26', '6', 'CANVI_COMPLET', { feta: true, vinc: est.ahmed });
  await tasca('2026-08-17', '3', 'CANVI_COMPLET', { feta: true, notes: 'Canvi d’habitació: la parella passa a la 4.' });
  await tasca('2026-08-24', '4', 'CANVI_COMPLET', { feta: true, vinc: est.pere });
  await tasca('2026-08-27', '6', 'CANVI_COMPLET', { feta: true, vinc: est.thomas });
  await tasca('2026-08-29', '1', 'CANVI_COMPLET', { feta: true, vinc: est.giuliaAmp });
  await tasca('2026-09-17', '3', 'CANVI_COMPLET', { feta: true, vinc: est.isabel, bug: bugDoble.sortida });
  await tasca('2026-09-19', '2', 'CANVI_COMPLET', { feta: true, vinc: est.carmen, bug: bugIndividual.sortida });
  await tasca('2026-10-08', '5', 'REPAS', { feta: true, bug: bugDoble.manteniment });
  await tasca('2026-10-15', '5', 'REPAS', { feta: true, bug: bugDoble.manteniment });
  await tasca('2026-10-18', '3', 'REPAS', { notes: 'Canviar tovalloles.' });
  await tasca('2026-10-18', '4', 'REPAS');
  await tasca('2026-10-22', '3', 'CANVI_COMPLET', { vinc: est.oriol });
  await tasca('2026-10-25', '4', 'CANVI_COMPLET', { vinc: est.emma });
  // Bugaderia de setembre ja liquidada a la Rosa.
  await prisma.$executeRawUnsafe(`UPDATE tasca_neteja SET bugaderia_pagada_el = '2026-10-01' WHERE bugaderia IS NOT NULL AND data < '2026-10-01'`);
  await prisma.jornada.updateMany({ where: { treballadorId: rosa, data: { lt: D('2026-10-01') } }, data: { pagada: true, dataPagament: D('2026-10-01') } });

  // -------------------------------------------------------------------------
  // 3.13 — Actius amb historial
  // -------------------------------------------------------------------------
  const actiu = async (b: Json, hist: Json[] = []) => {
    const r = await post<{ actiu: { id: string } }>('/api/actius', b);
    inc('actius');
    for (const h of hist) {
      await post(`/api/actius/${r.actiu.id}/historial`, h);
      inc('entrades d’historial d’actius');
    }
  };
  await actiu({ nom: 'Aire condicionat split 3.000 frigories', categoria: 'Climatització', dataCompra: '2023-06-12', cost: 690, proveidorId: PV.tecnic, habitacioId: HAB['3'], garantiaFins: '2026-06-12', numSerie: 'AC-DEMO-3001', estat: 'REGULAR' }, [
    { tipus: 'AVARIA', descripcio: 'No refreda: l’hoste avisa a les 22 h. Es trasllada la parella a l’habitació 4.', data: '2026-08-17' },
    { tipus: 'REPARACIO', descripcio: 'Càrrega de gas i neteja de filtres.', data: '2026-08-19', cost: 145.2 },
  ]);
  await actiu({ nom: 'Matalàs viscoelàstic 150×190', categoria: 'Mobiliari', dataCompra: '2026-06-20', cost: 349.69, proveidorId: PV.mobles, habitacioId: HAB['4'], garantiaFins: '2029-06-20', estat: 'NOU' }, [
    { tipus: 'SUBSTITUCIO', descripcio: 'Substitueix el matalàs antic (molles malmeses).', data: '2026-06-20' },
  ]);
  await actiu({ nom: 'Rentadora 8 kg', categoria: 'Electrodomèstics', dataCompra: '2026-07-02', cost: 458.59, proveidorId: PV.electro, ubicacio: 'Safareig', garantiaFins: '2029-07-02', numSerie: 'RT-DEMO-8802', estat: 'NOU' });
  await actiu({ nom: 'Televisor 32"', categoria: 'Electrònica', dataCompra: '2021-04-03', cost: 219, habitacioId: HAB['5'], estat: 'BO' }, [
    { tipus: 'CANVI_UBICACIO', descripcio: 'Es trasllada de l’habitació 2 a la 5.', data: '2026-09-01' },
  ]);
  await actiu({ nom: 'Nevera combi', categoria: 'Electrodomèstics', dataCompra: '2016-02-10', cost: 399, ubicacio: 'Office', estat: 'SUBSTITUCIO_RECOMANADA' }, [
    { tipus: 'AVARIA', descripcio: 'Fa soroll i no manté bé la temperatura.', data: '2026-09-30' },
  ]);

  // -------------------------------------------------------------------------
  // 3.14 — Manteniment (incidències)
  // -------------------------------------------------------------------------
  {
    // Es resol SENSE cost (si en tingués, l'API generaria una despesa duplicada de la
    // factura del tècnic, que ja s'ha entrat com a despesa amb proveïdor i IVA); el cost
    // es posa després només com a informació de la incidència.
    const r = await post<{ incidencia: { id: string } }>('/api/incidencies', { titol: 'L’aire condicionat no refreda', descripcio: 'Avís de l’hoste a les 22 h. Es fa canvi d’habitació (3 → 4).', habitacioId: HAB['3'], prioritat: 'ALTA', notes: 'Tècnic: Climatització Ràpida Demo' });
    await patch(`/api/incidencies/${r.incidencia.id}`, { estat: 'RESOLTA' });
    await prisma.incidencia.update({ where: { id: r.incidencia.id }, data: { cost: 145.2, data: DH('2026-08-17', '22:10'), dataResolucio: DH('2026-08-19', '12:00') } });
    const r2 = await post<{ incidencia: { id: string } }>('/api/incidencies', { titol: 'L’aixeta del lavabo degota', habitacioId: HAB['6'], prioritat: 'MITJA', notes: 'Cal canviar el cartutx.' });
    await prisma.incidencia.update({ where: { id: r2.incidencia.id }, data: { data: DH('2026-10-14', '10:30') } });
    const r3 = await post<{ incidencia: { id: string } }>('/api/incidencies', { titol: 'Persiana del balcó encallada', habitacioId: HAB['1'], prioritat: 'BAIXA' });
    await patch(`/api/incidencies/${r3.incidencia.id}`, { estat: 'EN_CURS' });
    inc('incidències', 3);
  }

  // -------------------------------------------------------------------------
  // 3.15 — Avisos interns (llista de no-admissió)
  // -------------------------------------------------------------------------
  await post('/api/avisos', { nom: 'Client de Demostració Conflictiu', telefon: '600 000 999', motiu: 'Va marxar sense pagar dues nits (estada de 2025).', gravetat: 'ALTA', notes: 'No acceptar reserves sense pagament per avançat.' });
  await post('/api/avisos', { nom: 'Reserva Fantasma Demo', email: 'reserves.fantasma@example.com', motiu: 'Ha fet tres reserves i no s’ha presentat mai.', gravetat: 'MITJA' });
  inc('avisos interns', 2);

  // -------------------------------------------------------------------------
  // 3.16 — Valoracions de benvinguda (endpoint públic) + dates realistes
  // -------------------------------------------------------------------------
  const vals: [number, string | undefined, string, string, 'ca' | 'es' | 'en' | 'fr', string, string, boolean][] = [
    [5, 'Habitació molt neta i llit còmode. Tornarem!', 'Jordi', '3', 'ca', est.jordi, '2026-06-02', true],
    [4, 'Très bon accueil, un peu de bruit le samedi soir.', 'Sophie', '1', 'fr', est.sophie, '2026-06-11', true],
    [5, 'Lovely family-friendly place, and they welcomed our dog!', 'Piotr', '4', 'en', est.kowalski, '2026-07-02', true],
    [3, 'Bien en general, pero el aire acondicionado hacía ruido.', 'Ahmed', '6', 'es', est.ahmed, '2026-07-06', true],
    [5, 'Ottima posizione, vicino a tutto.', 'Giulia', '1', 'en', est.giulia, '2026-08-02', true],
    [5, 'Tot perfecte, molt amables.', 'Oriol', '3', 'ca', est.oriol, '2026-10-13', false],
    [4, undefined, 'Emma', '4', 'en', est.emma, '2026-10-16', false],
  ];
  for (const [puntuacio, comentari, nom, habitacio, idioma, estanciaId, data, vista] of vals) {
    const r = await api<{ id: string }>('POST', '/api/public/valoracions', { puntuacio, comentari, nom, habitacio, idioma, estanciaId }, { auth: false });
    await prisma.valoracio.update({ where: { id: r.id }, data: { createdAt: DH(data, '10:15'), vista } });
    inc('valoracions');
  }

  // -------------------------------------------------------------------------
  // 3.17 — Plantilles: email de «gràcies» programat + pressupost
  // -------------------------------------------------------------------------
  await post('/api/emails-programats', { estanciaId: est.emma, tipus: 'gracies', a: 'emma.johnson@example.org', nomDestinatari: 'Emma', lang: 'en', programatPer: '2026-10-26T10:00:00+02:00' });
  inc('emails programats');
  {
    const r = await post<{ id: string; numero: string }>('/api/pressupostos', {});
    await patch(`/api/pressupostos/${r.id}`, {
      numero: r.numero, data: '2026-10-05', validesa: '2026-11-05', idioma: 'ca',
      clientNom: 'Club Ciclista Demo del Maresme', clientNif: 'G00000014', clientAdreca: 'Carrer de l’Exemple, 3', clientLocalitat: '08301 Mataró',
      compte: 'ES00 0000 0000 0000 0000 0000', notes: 'Pagament del 30 % en confirmar la reserva i la resta a l’arribada.', ivaPercent: 10,
      linies: [
        { descripcio: 'Allotjament 3 habitacions dobles · 4 nits (15–19/04/2027)', import: 648 },
        { descripcio: 'Guarda de bicicletes al pati (6 bicicletes)', import: 36 },
      ],
    });
    inc('pressupostos');
  }
}

try {
  await main();
  // Resum final des de la BD local.
  const q = async (t: string) => Number((await prisma.$queryRawUnsafe<{ n: bigint }[]>(`select count(*)::bigint as n from ${t}`))[0]?.n ?? 0);
  const resum: Record<string, number> = {};
  for (const t of ['huesped', 'estancia', 'estancia_viatger', 'animal', 'anotacio_huesped', 'canvi_habitacio', 'cobrament', 'pagament_previst', 'diposit', 'factura', 'linia_factura', 'tarifa_tipus', 'proveidor', 'gasto', 'servei_recurrent', 'treballador', 'jornada', 'absencia', 'nomina', 'tasca_neteja', 'article_bugaderia', 'actiu', 'actiu_historial', 'incidencia', 'avis', 'valoracio', 'pressupost', 'email_programat']) {
    resum[t] = await q(t);
  }
  console.log('\n✓ Dades de demostració creades. Recompte a la BD local:');
  console.table(resum);
  const factures = await prisma.factura.findMany({ orderBy: { data: 'asc' }, select: { numero: true, data: true, tipusDocument: true, total: true, estat: true, esDiposit: true } });
  console.log('Factures:');
  console.table(factures.map((f) => ({ numero: f.numero, data: f.data.toISOString().slice(0, 10), tipus: f.tipusDocument + (f.esDiposit ? ' (dipòsit)' : ''), total: Number(f.total), estat: f.estat })));
  if (avisos.length) console.warn('Avisos:\n - ' + avisos.join('\n - '));
  console.log('Crides API fetes (per tipus):', counts);
} catch (err) {
  console.error('\n[ERROR]', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

export {};
