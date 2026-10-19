import type { Recepta } from './tipus';

/**
 * Receptes de les fotos del capítol «hostes».
 * Dades extra necessàries: scripts/manual/demo-extra/hostes-mossos.ts
 * (passaport d'espècimen de Piotr Kowalski, client «no acollir» Ricard Mas…).
 */
const PIOTR = '/huespedes/{hoste:EA1234567}';

const BASE: Record<string, Recepta> = {
  'clients-llista-cerca': { ruta: '/huespedes?q=Kowal' },
  'fitxa-client-general': { ruta: PIOTR, abans: [{ espera: 2500 }], mida: { width: 1180, height: 1100 } },
  // El motor centra la 1a marca i puja 140 px: amb «Sexe» centrat, el bloc Viatger 1 queda a dalt.
  'nova-estada-viatger': { abans: [{ scroll: 'Sexe' }], mida: { width: 1180, height: 1000 } },
  'reaprofitar-hoste-cercador': {
    abans: [
      { scroll: 'Reaprofitar un hoste existent (nom, document, email…)' },
      { omple: ['Reaprofitar un hoste existent (nom, document, email…)', 'Kowal'] },
      { espera: 8000 },
      { clic: 'Piotr Kowalski' },
      { espera: 3000 },
      { omple: ['Reaprofitar un hoste existent (nom, document, email…)', 'Kowa'] },
      { espera: 8000 },
    ],
    mida: { width: 1180, height: 1000 },
  },
  // L'app de proves no té OCR i el motor no pot triar fitxers: es mostra el bloc
  // de l'escàner d'una estada amb el viatger ja omplert (DNI i passaport).
  'escaner-dni-revers-llegit': { ruta: '/estancies/{estada:26011}/edita', mida: { width: 1180, height: 1000 } },
  'escaner-passaport-girat': { ruta: '/estancies/{estada:26008}/edita', abans: [{ scroll: 'Telèfon' }], mida: { width: 1180, height: 1300 } },
  'consell-foto-dni-be': { ruta: '/manual/especimens/dni-revers-bona-foto.jpg', noObrir: true },
  'fitxa-pujar-document': { ruta: PIOTR, abans: [{ espera: 2500 }], mida: { width: 1180, height: 1000 } },
  'fitxa-document-gran': {
    ruta: PIOTR,
    abans: [{ espera: 3000 }, { clic: 'Passaport HOSTAL COLL HOSTAL COLL HOSTAL COLL HOSTAL COLL' }, { espera: 2500 }],
  },
  'camps-obligatoris-errors': {
    // Primer surt «Vols desar l’estada SENSE número de contracte?»: «Continuar» valida (el formulari buit no es desa).
    abans: [{ clic: 'Desar estada' }, { espera: 1500 }, { clic: 'Continuar' }, { espera: 2500 }],
    mida: { width: 1180, height: 1300 },
  },
  'editar-client': { ruta: PIOTR + '/edita', mida: { width: 1180, height: 1450 } },
  'firma-viatger': { ruta: '/estancies/{estada:26013}', abans: [{ clic: 'Firmar' }, { espera: 1000 }, { scroll: 'Desar firma' }], mida: { width: 1180, height: 1000 } },
  'fitxa-mascotes': { ruta: PIOTR, abans: [{ espera: 2500 }], mida: { width: 1180, height: 1500 } },
  'fitxa-notes-afegir': { ruta: PIOTR, abans: [{ espera: 2500 }, { clic: 'Afegir nota' }, { espera: 800 }, { scroll: 'Desar nota' }], mida: { width: 1180, height: 1500 } },
  'fitxa-no-acollir': { ruta: '/huespedes/{hoste:99999999R}', abans: [{ espera: 2000 }] },
  'avisos-interns-nou': { abans: [{ espera: 10000 }], mida: { width: 1180, height: 1000 } },
  // El ConfirmDialog és un <dialog> natiu (capa superior): els números no s'hi
  // poden dibuixar a sobre, així que la foto va sense marques.
  'eliminar-client-dialeg': { ruta: PIOTR, abans: [{ espera: 2000 }, { clic: 'Eliminar' }, { espera: 1000 }], marques: [] },
};

/**
 * Des del 19/10/2026 surt la finestra «Cobraments a punt» a totes les pantalles
 * (es recorda al navegador): la tanquem abans de res. Si no hi és, no passa res.
 */
const TANCA = { clic: 'Tancar per avui' } as const;
export const R_HOSTES: Record<string, Recepta> = Object.fromEntries(
  Object.entries(BASE).map(([k, r]) => [k, r.ometre ? r : { ...r, abans: [{ espera: 2500 }, TANCA, { espera: 600 }, ...(r.abans ?? [])] }]),
);
