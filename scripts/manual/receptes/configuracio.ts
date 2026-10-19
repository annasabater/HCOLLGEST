import type { Recepta } from './tipus';

const MOBIL = { width: 390, height: 844 };

/** Receptes de les fotos del capítol «configuracio». */
export const R_CONFIGURACIO: Record<string, Recepta> = {
  // ── Entrar i sortir ───────────────────────────────────────────────────────
  'login-pantalla': { sensesessio: true, noObrir: true, abans: [{ espera: 4000 }] },
  'login-ull': {
    sensesessio: true,
    noObrir: true,
    abans: [{ espera: 4000 }],
  },
  // Es fa amb scripts/manual/demo-extra/fotos-especials.ts (resposta del servidor simulada, sense bloquejar cap compte).
  'login-bloquejat': { ometre: true },
  'login-tauler': { noObrir: true, abans: [{ espera: 6000 }] },
  'sortir-boto': { noObrir: true, abans: [{ espera: 4000 }] },

  // ── Rols (amb un altre usuari: fotos-especials.ts) ────────────────────────
  'rol-recepcio': { ometre: true },
  'menu-recepcio': { ometre: true },
  'menu-admin': { noObrir: true, abans: [{ espera: 4000 }] },

  // ── Configuració ──────────────────────────────────────────────────────────
  'config-general': { noObrir: true, sencera: true, abans: [{ espera: 12000 }] },
  'config-establiment': { noObrir: true, abans: [{ espera: 12000 }, { clic: "Dades de l'establiment" }, { espera: 3000 }] },
  'config-mossos': { noObrir: true, abans: [{ espera: 12000 }, { clic: 'Fitxer massiu de Mossos' }, { espera: 3000 }] },
  'config-factura': { noObrir: true, abans: [{ espera: 12000 }, { clic: 'Dades per a la factura' }, { espera: 3000 }] },
  'config-taxa': { noObrir: true, abans: [{ espera: 12000 }, { clic: 'Taxa turística (declaració)' }, { espera: 3000 }] },
  'config-rgpd': { noObrir: true, abans: [{ espera: 12000 }, { clic: 'Facturació i RGPD' }, { espera: 3000 }] },
  'config-benvinguda': { noObrir: true, abans: [{ espera: 12000 }, { clic: 'Benvinguda als hostes' }, { espera: 3000 }] },
  'config-saldo': { noObrir: true, abans: [{ espera: 12000 }, { clic: 'Balanç de situació' }, { espera: 3000 }] },
  // Es fa amb scripts/manual/demo-extra/fotos-especials.ts (cal triar una habitació al desplegable).
  'config-bugaderia': { ometre: true },
  'config-guia': { noObrir: true, abans: [{ espera: 12000 }, { clic: "Manual d'usuari" }, { espera: 3000 }] },
  'config-backup': { noObrir: true, abans: [{ espera: 12000 }, { clic: 'Còpia de seguretat de les dades' }, { espera: 3000 }] },
  'drive-desconnectat': { noObrir: true, abans: [{ espera: 12000 }, { clic: 'Còpia automàtica a Google Drive' }, { espera: 3000 }] },
  // Impossibles a l'entorn de proves (cal un compte de Google real, Drive o Gmail, o la interfície del navegador).
  'drive-connectat': { ometre: true },
  'drive-prova-ok': { ometre: true },
  'drive-carpetes': { ometre: true },
  'uptime-correu': { ometre: true },
  'popup-bloquejat': { ometre: true },

  // El JSON és un sol bloc de text: es marca sencer (una sola marca).
  'health-ok': { noObrir: true, marques: ['Tot a punt.'] },

  // ── Privacitat ────────────────────────────────────────────────────────────
  'privacitat-documents': {
    ruta: '/huespedes/{hoste:EA1234567}',
    noObrir: true,
    abans: [{ espera: 12500 }],
    marques: ['Documents d’identitat', 'Els documents es desen xifrats (AES-256-GCM)'],
  },
  'eliminar-hoste': {
    ruta: '/huespedes/{hoste:EA1234567}',
    noObrir: true,
    abans: [{ espera: 12000 }],
  },
  // Es fa amb scripts/manual/demo-extra/fotos-especials.ts (finestra <dialog> modal: les marques s'han de dibuixar a dins).
  'eliminar-hoste-confirmar': { ometre: true },

  // ── Mòbil ─────────────────────────────────────────────────────────────────
  'mobil-menu-tancat': { mida: MOBIL, noObrir: true, abans: [{ espera: 6000 }] },
  'mobil-menu-obert': { mida: MOBIL, noObrir: true, abans: [{ espera: 6000 }, { clic: 'Obrir menú' }, { espera: 800 }] },
  'mobil-fer-foto': { ruta: '/estancies/nou', mida: MOBIL, noObrir: true, abans: [{ espera: 15000 }] },
};

