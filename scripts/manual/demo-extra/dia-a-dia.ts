/**
 * Dades de demo extra per a les fotos del capítol «dia-a-dia» (NOMÉS BD de PROVES).
 *
 *  - 26018 · Laura Vidal · hab 1 · entrada AHIR → sortida d'aquí a 3 dies, idioma castellà,
 *    benvinguda NO enviada  → surt al quadre «Benvingudes pendents» del tauler.
 *  - 26019 · Klaus Weber · hab 6 · entrada fa 4 dies → sortida AVUI (finalitzada), benvinguda ja
 *    enviada → surt a la franja blava «1 sortida avui» del tauler.
 *  - 26020 · Sofia Rossi · hab 6 · RESERVA que entra AVUI → «Arribada avui» a Habitacions i
 *    canvi d'hostes (⇄) a l'hab. 6 al calendari d'ocupació.
 *
 * Les dates són relatives al dia que s'executa (el tauler mira «avui»). Es pot tornar a
 * executar: si les estades ja hi són, només en reajusta les dates.
 * Totes dues tenen l'avís de Mossos aturat perquè no canviïn el recompte de la targeta
 * «Pendents d'enviar a Mossos» que surt a altres fotos.
 */
const BASE_URL = 'http://localhost:3100';
const DB_URL = 'postgresql://manual:manual@localhost:5433/hostalcoll_manual';
process.env.DATABASE_URL = DB_URL;
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const dies = (n: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hostalcoll@gmail.com', password: 'Manual2026!' }),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  const c = (res.headers.getSetCookie?.() ?? []).map((s) => s.split(';')[0]).find((s) => !!s && s.startsWith('hostalcoll_session='));
  if (!c) throw new Error('sense cookie');
  return c;
}

const ESTADES = [
  {
    num: '26018', hab: '1', entrada: -1, sortida: 3, idioma: 'es', benvinguda: false, estat: 'EN_CURS',
    viatger: {
      nom: 'Laura', cognom1: 'Vidal', cognom2: 'Ortega', sexe: 'DONA', dataNaixement: '1990-03-14', nacionalitat: 'Espanya',
      tipusDocument: 'DNI_NIF', numDocument: '93000001K', numSuport: 'CAA112233', dataExpedicio: '2023-05-10',
      email: 'laura.vidal@example.com', telefon: '600 000 120', adreca: 'Carrer Major, 5', pais: 'Espanya',
      provincia: 'Saragossa', municipi: 'Saragossa', codiPostal: '50001', esTitular: true,
    },
  },
  {
    num: '26019', hab: '6', entrada: -4, sortida: 0, idioma: 'en', benvinguda: true, estat: 'FINALITZADA',
    viatger: {
      nom: 'Klaus', cognom1: 'Weber', sexe: 'HOME', dataNaixement: '1975-08-02', nacionalitat: 'Alemanya',
      tipusDocument: 'PASSAPORT', numDocument: 'C0X000019', dataExpedicio: '2021-02-01',
      email: 'klaus.weber@example.org', telefon: '+49 151 0000019', adreca: 'Hauptstraße 9', pais: 'Alemanya',
      localitat: 'Munic', codiPostal: '80331', esTitular: true,
    },
  },
  {
    num: '26020', hab: '6', entrada: 0, sortida: 3, idioma: 'en', benvinguda: false, estat: 'RESERVA',
    viatger: { nom: 'Sofia', cognom1: 'Rossi', telefon: '+39 320 0000020', email: 'sofia.rossi@example.org', nacionalitat: 'Itàlia', esTitular: true },
  },
] as const;

async function main() {
  const cookie = await login();
  for (const e of ESTADES) {
    let est = await prisma.estancia.findFirst({ where: { numContracte: e.num, deletedAt: null }, select: { id: true } });
    if (!est) {
      const hab = await prisma.habitacio.findFirst({ where: { nom: e.hab }, select: { id: true } });
      const res = await fetch(`${BASE_URL}/api/estancies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          estancia: {
            tipusRegistre: e.estat === 'RESERVA' ? 'RESERVA' : 'CONTRACTE_EN_CURS', numContracte: e.num, anyContracte: 2026,
            dataFormalitzacio: ymd(dies(e.entrada)), dataEntrada: ymd(dies(e.entrada)), dataSortida: ymd(dies(e.sortida)),
            numViatgers: 1, tipusPagament: 'EFECTIU', numHabitacions: 1, habitacioId: hab?.id, teInternet: true, idioma: e.idioma,
          },
          viatgers: [e.viatger],
        }),
      });
      if (!res.ok) throw new Error(`POST estada ${e.num} → ${res.status}: ${await res.text()}`);
      est = { id: ((await res.json()) as { estanciaId: string }).estanciaId };
      console.log(`✓ Estada ${e.num} creada`);
    }
    const hab = await prisma.habitacio.findFirst({ where: { nom: e.hab }, select: { id: true } });
    await prisma.estancia.update({
      where: { id: est.id },
      data: {
        habitacioId: hab?.id,
        dataFormalitzacio: dies(e.entrada), dataEntrada: dies(e.entrada), dataSortida: dies(e.sortida),
        estat: e.estat, benvingudaEnviada: e.benvinguda, avisMossosParat: true,
      },
    });
    console.log(`✓ Estada ${e.num}: ${ymd(dies(e.entrada))} → ${ymd(dies(e.sortida))}`);
  }

  // Valoració sense estada (enllaç genèric) → «Hoste sense identificar» a Valoracions.
  const COMENT = 'Molt tranquil i net. El coixí era una mica dur.';
  if (!(await prisma.valoracio.findFirst({ where: { comentari: COMENT } }))) {
    await prisma.valoracio.create({
      data: { puntuacio: 4, comentari: COMENT, habitacio: '2', idioma: 'ca', vista: true, createdAt: new Date('2026-09-28T09:30:00Z') },
    });
    console.log('✓ Valoració sense identificar');
  }

  // Correu de benvinguda JA ENVIAT a l'estada 26014 (Emma), al costat del de gràcies programat que
  // porta demo-data → bloc «Missatges a l'hoste» amb un «Enviat» i un «Programat per».
  const emma = await prisma.estancia.findFirst({ where: { numContracte: '26014', deletedAt: null }, select: { id: true } });
  if (emma && !(await prisma.emailProgramat.findFirst({ where: { estanciaId: emma.id, tipus: 'benvinguda' } }))) {
    await prisma.emailProgramat.create({
      data: {
        estanciaId: emma.id, tipus: 'benvinguda', a: 'emma.johnson@example.org', nomDestinatari: 'Emma',
        asumpte: 'Welcome to Hostal Coll', cos: '<p>Hi Emma, welcome to Hostal Coll!</p>',
        programatPer: new Date('2026-10-16T10:00:00Z'), enviatAt: new Date('2026-10-16T10:00:05Z'),
      },
    });
    console.log('✓ Correu de benvinguda enviat (26014)');
  }

  // Compte de la Rosa: la neteja i la bugaderia del 8/10 ja pagades el 10/10 → a «Moviments» hi ha
  // línies «Pagat» i línies «Pendent».
  const rosaId = (await prisma.treballador.findFirst({ where: { nom: { startsWith: 'Rosa' } }, select: { id: true } }))?.id;
  if (rosaId) {
    const d8 = new Date('2026-10-08T00:00:00Z');
    const pagat = new Date('2026-10-10T00:00:00Z');
    await prisma.jornada.updateMany({ where: { treballadorId: rosaId, data: d8 }, data: { pagada: true, dataPagament: pagat } });
    await prisma.$executeRawUnsafe(
      `UPDATE tasca_neteja SET bugaderia_pagada_el = $1 WHERE assignada_a = $2 AND data = $3 AND bugaderia IS NOT NULL`,
      pagat, rosaId, d8,
    );
  }

  // Avís intern ja desactivat → fila «Inactiu» a la llista d'avisos.
  if (!(await prisma.avis.findFirst({ where: { nom: 'Antic Hoste Sorollós Demo' } }))) {
    await prisma.avis.create({
      data: { nom: 'Antic Hoste Sorollós Demo', telefon: '600 000 997', gravetat: 'BAIXA', motiu: 'Música alta de matinada (2024). Ja ha tornat sense problemes.', actiu: false },
    });
    console.log('✓ Avís intern inactiu');
  }

  // Empresa de neteja (sense feina assignada) → etiqueta «Empresa» a la llista de Personal.
  if (!(await prisma.treballador.findFirst({ where: { nomEmpresa: 'Neteges Calella Demo, SL' } }))) {
    await prisma.treballador.create({
      data: {
        nom: 'Neteges Calella Demo', carrec: 'Neteja (empresa externa)', esEmpresa: true, nomEmpresa: 'Neteges Calella Demo, SL',
        telefon: '600 000 300', dataContractacio: new Date('2026-09-01T00:00:00Z'), preuSortida: 20, preuManteniment: 12,
      },
    });
    console.log('✓ Empresa de neteja');
  }

  // Tasques de neteja per a les fotos de «Neteja» i el calendari (dates relatives a avui; si ja hi
  // són, només se'n mou la data):
  //  - avui · hab 6 · sortida de 26019 · Rosa · FETA (botons Feta/Desfer, ✓ a Pròxims dies)
  //  - avui · hab 3 i hab 4 · manteniment · Rosa · pendents (amb una nota)
  //  - avui · zones comunes · Rosa · pendent (fila «Zones comunes»)
  //  - sortida de 26018 · hab 1 · SENSE ASSIGNAR («Sense assignar» a Pròxims dies)
  const rosa = (await prisma.treballador.findFirst({ where: { nom: { startsWith: 'Rosa' } }, select: { id: true } }))?.id ?? null;
  const id = async (num: string) => (await prisma.estancia.findFirst({ where: { numContracte: num, deletedAt: null }, select: { id: true } }))!.id;
  const habId = async (nom: string) => (await prisma.habitacio.findFirst({ where: { nom }, select: { id: true } }))!.id;
  type T = { data: Date; habitacioId: string | null; tipus: 'CANVI_COMPLET' | 'REPAS'; assignadaA: string | null; vinculadaSortidaId: string | null; notes: string | null; feta: boolean };
  const TASQUES: T[] = [
    { data: dies(0), habitacioId: await habId('6'), tipus: 'CANVI_COMPLET', assignadaA: rosa, vinculadaSortidaId: await id('26019'), notes: null, feta: true },
    { data: dies(0), habitacioId: await habId('3'), tipus: 'REPAS', assignadaA: rosa, vinculadaSortidaId: null, notes: 'Canviar tovalloles i llençols.', feta: false },
    { data: dies(0), habitacioId: await habId('4'), tipus: 'REPAS', assignadaA: rosa, vinculadaSortidaId: null, notes: 'Repàs ràpid: buidar paperera.', feta: false },
    { data: dies(0), habitacioId: null, tipus: 'REPAS', assignadaA: rosa, vinculadaSortidaId: null, notes: 'Passadís i pati.', feta: false },
    { data: dies(3), habitacioId: await habId('1'), tipus: 'CANVI_COMPLET', assignadaA: null, vinculadaSortidaId: await id('26018'), notes: null, feta: false },
  ];
  const patchEstat = async (tid: string, estat: string) => {
    const r = await fetch(`${BASE_URL}/api/tasques-neteja/${tid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ estat }) });
    if (!r.ok) throw new Error(`PATCH tasca → ${r.status}`);
  };
  for (const t of TASQUES) {
    const clau = t.vinculadaSortidaId ? { vinculadaSortidaId: t.vinculadaSortidaId } : { habitacioId: t.habitacioId, tipus: t.tipus, notes: t.notes };
    let ja = await prisma.tascaNeteja.findFirst({ where: clau });
    if (!ja && !t.habitacioId) {
      // Versió antiga de l'script: zones comunes sense nota.
      ja = await prisma.tascaNeteja.findFirst({ where: { habitacioId: null, assignadaA: t.assignadaA, notes: null } });
    }
    if (ja) {
      if (ja.data.getTime() !== t.data.getTime() || ja.notes !== t.notes) {
        await prisma.tascaNeteja.update({ where: { id: ja.id }, data: { data: t.data, notes: t.notes } });
        // Torna a passar per l'API perquè es recalculi la jornada del dia nou.
        if (t.feta) { await patchEstat(ja.id, 'PENDENT'); await patchEstat(ja.id, 'FETA'); }
        console.log(`✓ Tasca de neteja moguda a ${ymd(t.data)}`);
      }
      continue;
    }
    if (!t.habitacioId) {
      // Zones comunes: l'API d'alta manual no les accepta (només el full del dia), les creem directament.
      await prisma.tascaNeteja.create({ data: { data: t.data, habitacioId: null, tipus: t.tipus, assignadaA: t.assignadaA, notes: t.notes } });
      console.log(`✓ Tasca de neteja ${ymd(t.data)} zones comunes`);
      continue;
    }
    const res = await fetch(`${BASE_URL}/api/tasques-neteja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ data: ymd(t.data), habitacioId: t.habitacioId, tipus: t.tipus, assignadaA: t.assignadaA ?? undefined, vinculadaSortidaId: t.vinculadaSortidaId ?? undefined, notes: t.notes ?? undefined }),
    });
    if (!res.ok) throw new Error(`POST tasca → ${res.status}: ${await res.text()}`);
    const { tasca } = (await res.json()) as { tasca: { id: string } };
    // Passa per l'API perquè es recalculi la jornada de la Rosa (línia «Pagaments registrats avui»).
    if (t.feta) await patchEstat(tasca.id, 'FETA');
    console.log(`✓ Tasca de neteja ${ymd(t.data)} habitació`);
  }
}

main().finally(() => prisma.$disconnect());

export {};
