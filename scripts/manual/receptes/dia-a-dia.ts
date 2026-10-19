import type { Recepta } from './tipus';

/** Receptes de les fotos del capítol «dia-a-dia». */
export const R_DIA_A_DIA: Record<string, Recepta> = {
  // ── Tauler ────────────────────────────────────────────────────────────────
  'tauler-general': {
    sencera: true,
    abans: [{ espera: 12000 }],
    marques: ["Visió general de l'Hostal Coll", 'Calculadora de preus', 'Benvingudes pendents (1)', '1 sortida avui', 'Cobraments pendents', 'Properes entrades'],
  },
  'tauler-targeta-desplegada': {
    abans: [{ espera: 6000 }, { clic: 'Firmes pendents' }, { espera: 4000 }, { scroll: 'Properes entrades' }],
    marques: ['Firmes pendents', 'Contracte', 'Amaga'],
  },
  'tauler-amaga': {
    abans: [{ espera: 6000 }, { clic: 'Firmes pendents' }, { espera: 4000 }, { scroll: 'Properes entrades' }],
    marques: ['Amaga'],
  },
  'calculadora-buida': {
    abans: [{ espera: 6000 }, { omple: ['Entrada', '2026-10-26'] }, { omple: ['Sortida', '2026-11-05'] }],
    marques: ['Entrada', 'Sortida', 'Habitació', 'Calcular'],
  },
  'calculadora-resultat': {
    abans: [{ espera: 6000 }, { omple: ['Entrada', '2026-10-26'] }, { omple: ['Sortida', '2026-11-05'] }, { clic: 'Calcular' }, { espera: 20000 }],
    marques: ['Subtotal', 'Total', 'Disponibilitat', 'Lliure'],
  },
  'calculadora-trams': {
    abans: [{ espera: 6000 }, { omple: ['Entrada', '2027-07-01'] }, { omple: ['Sortida', '2027-08-26'] }, { clic: 'Calcular' }, { espera: 20000 }],
    marques: ['Mes', '2 setmanes', 'Setmana', 'Dia (4+ dies)'],
  },
  'tauler-benvingudes': {
    abans: [{ espera: 6000 }],
    marques: ['Benvingudes pendents (1)', 'WhatsApp', 'Feta'],
  },
  'cerca-resultats': { abans: [{ espera: 3000 }] },
  'clients-botons': { abans: [{ espera: 3000 }] },
  'cerca-caixa': {
    abans: [{ espera: 4000 }, { omple: ['Cerca hostes, estades, factures, despeses, actius…', 'Garcia'] }],
  },
  'tauler-targetes': {
    abans: [{ espera: 6000 }],
  },
  'tauler-entrades-sortides': {
    abans: [{ espera: 6000 }],
    marques: ['Properes entrades', 'Properes sortides'],
  },

  // ── Calendari ─────────────────────────────────────────────────────────────
  'calendari-mes': {
    abans: [{ espera: 25000 }],
  },
  'calendari-detall-dia': {
    abans: [{ espera: 25000 }, { clic: '25' }, { espera: 6000 }],
  },
  'calendari-neteja-filtre': {
    abans: [{ espera: 25000 }],
  },
  'calendari-ocupacio-total': {
    abans: [{ espera: 25000 }],
  },
  'calendari-per-habitacio': {
    abans: [{ espera: 25000 }],
  },
  'habitacions-graella': {
    sencera: true,
    abans: [{ espera: 12000 }, { scroll: 'Arribada avui' }],
  },

  // ── Neteja i bugaderia ────────────────────────────────────────────────────
  // «Obrir» del primer dia de «Pròxims dies» tria avui i la Rosa (la persona que té feina avui).
  'neteja-full': {
    sencera: true,
    abans: [{ espera: 25000 }, { clic: 'Obrir' }, { espera: 20000 }],
  },
  'neteja-proxims-dies': {
    abans: [{ espera: 25000 }],
  },
  'neteja-feta': {
    abans: [{ espera: 25000 }, { clic: 'Obrir' }, { espera: 20000 }],
  },
  'neteja-registrar-pagament': {
    abans: [{ espera: 25000 }, { clic: 'Obrir' }, { espera: 20000 }],
  },
  'neteja-bugaderia': {
    abans: [{ espera: 25000 }, { clic: 'Obrir' }, { espera: 20000 }, { clic: '🧺 Afegir bugaderia (la Mireia neteja llençols/tovalloles…)' }, { espera: 6000 }],
  },
  'bugaderia-mes': {
    abans: [{ espera: 25000 }],
  },
  'bugaderia-preus': {
    abans: [{ espera: 25000 }, { clic: 'Preus' }, { espera: 6000 }],
  },
  // Es fa amb scripts/manual/demo-extra/fotos-especials.ts (cal triar una habitació al desplegable).
  'dd-config-bugaderia': { ometre: true },
  'estada-bugaderia': {
    ruta: '/estancies/{estada:26013}',
    noObrir: true,
    abans: [{ espera: 12000 }, { clic: 'Bugaderia' }, { espera: 4000 }],
  },

  // ── Plantilles i missatges ────────────────────────────────────────────────
  // Es fa amb scripts/manual/demo-extra/fotos-especials.ts (cal triar el dia i la persona als desplegables).
  'plantilles-neteja': { ometre: true },
  'plantilles-hostes': { noObrir: true, abans: [{ espera: 30000 }, { clic: 'Avís als hostes (neteja)' }, { espera: 3000 }] },
  'plantilles-benvinguda': { noObrir: true, abans: [{ espera: 15000 }, { clic: 'Benvinguda i valoració' }, { espera: 3000 }] },
  'plantilles-gracies': { noObrir: true, abans: [{ espera: 30000 }, { clic: 'Email de gràcies + ressenya Google' }, { espera: 3000 }] },
  'plantilles-meu-whatsapp': { noObrir: true, abans: [{ espera: 15000 }] },
  'estada-missatges': {
    ruta: '/estancies/{estada:26014}',
    abans: [{ espera: 15000 }],
  },
  'estada-email-form': {
    ruta: '/estancies/{estada:26014}',
    abans: [{ espera: 15000 }, { clic: 'Email de gràcies' }, { espera: 6000 }],
  },
  // Finestra de confirmació nativa del navegador: no es pot capturar.
  'whatsapp-confirmacio': { ometre: true },
  // Es fa amb scripts/manual/demo-extra/fotos-especials.ts (no es poden crear cobraments a punt sense
  // que la finestra surti a totes les fotos dels altres capítols).
  'dd-popup-cobraments': { ometre: true },

  // ── Web de benvinguda: fotos-especials.ts (la pàgina envia la valoració a PRODUCCIÓ; allà la
  // resposta se simula al navegador i no surt res de l'ordinador).
  'web-benvinguda-estrelles': { ometre: true },
  'web-benvinguda-gracies': { ometre: true },

  // ── Valoracions, manteniment, actius, mascotes ────────────────────────────
  'valoracions-llista': { abans: [{ espera: 12000 }] },
  'manteniment-nova': { abans: [{ espera: 15000 }, { omple: ['Títol', 'La dutxa de l’habitació 2 perd aigua'] }] },
  'manteniment-llista': { abans: [{ espera: 15000 }] },
  'actius-nou': { abans: [{ espera: 20000 }, { clic: 'Nou actiu' }, { espera: 4000 }] },
  'actius-llista': { abans: [{ espera: 20000 }] },
  'actiu-fitxa': { abans: [{ espera: 15000 }] },
  'mascotes-llista': { abans: [{ espera: 20000 }] },

  // ── Tarifes ───────────────────────────────────────────────────────────────
  'tarifes-taula': { abans: [{ espera: 15000 }] },
  'tarifes-pdf': { abans: [{ espera: 15000 }] },

  // ── Personal ──────────────────────────────────────────────────────────────
  'personal-nou': {
    abans: [{ espera: 12000 }, { clic: 'Nou treballador' }, { espera: 4000 }, { clic: 'Per tasques de neteja' }, { espera: 500 }],
  },
  'personal-llista': { abans: [{ espera: 12000 }] },
  // Es fa amb scripts/manual/demo-extra/fotos-especials.ts (finestra <dialog> modal: les marques s'han de dibuixar a dins).
  'personal-eliminar': { ometre: true },
  'compte-resum': { ruta: '/personal/{treballador:Rosa}', abans: [{ espera: 20000 }] },
  'compte-moviments': { ruta: '/personal/{treballador:Rosa}', abans: [{ espera: 20000 }] },
  'compte-afegir': { ruta: '/personal/{treballador:Rosa}', abans: [{ espera: 20000 }] },
  'compte-exportar': { ruta: '/personal/{treballador:Rosa}', abans: [{ espera: 20000 }] },

  // ── Avisos interns ────────────────────────────────────────────────────────
  'avisos-nou': {
    abans: [{ espera: 12000 }, { omple: ['Nom i cognoms o àlies', 'Hoste de Prova Demo'] }, { omple: ["P. ex. va deixar l’habitació en mal estat", 'Va fer malbé el matalàs i no ho va voler pagar.'] }],
  },
  // Es fa amb scripts/manual/demo-extra/fotos-especials.ts (cal escriure el telèfon i sortir del camp).
  'avis-al-registre': { ometre: true },
  'avisos-llista': { abans: [{ espera: 15000 }] },

  // ── Compte de propietat (un altre usuari): fotos-especials.ts ─────────────
  'restringit-menu': { ometre: true },
};

