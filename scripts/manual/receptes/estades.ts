import type { Accio, Recepta } from './tipus';

/**
 * Receptes de les fotos del capítol «estades».
 *
 * Notes:
 *  - El formulari «Nova estada» desa un esborrany al navegador (localStorage) i el
 *    navegador de les fotos és el mateix per a totes: per això cada foto de
 *    /estancies/nou comença amb «Buidar tot el formulari» → «Buidar tot».
 *  - Els camps del formulari no tenen l'etiqueta lligada a l'input, i el motor no sap
 *    triar opcions d'un desplegable: les fotos que necessiten habitació i dates fetes
 *    es fan des d'«Editar» d'una estada que ja les té (el bloc és el mateix).
 *  - Dades extra: scripts/manual/demo-extra/estades.ts (26095, signatura de 26002,
 *    cobrament pagat de 26010). Mossos: demo-extra/hostes-mossos.ts (26012 acceptat).
 */
const BUIDA: Accio[] = [{ clic: 'Buidar tot el formulari' }, { clic: 'Buidar tot' }, { espera: 1500 }];
const AMPLA = { width: 1600, height: 1150 }; // fitxa a dues columnes (Mossos i Missatges a la dreta)

const RECEPTES: Record<string, Recepta> = {
  // Les pestanyes porten el número a dins («En curs 3») i el text sol coincideix amb
  // les etiquetes de les targetes: marquem només «Totes» com a fila de pestanyes.
  'llista-estades': { marques: ['Nova estada', 'Totes', 'Cerca client (nom, cognom, document, contracte)', 'Ordenar:'] },

  'nova-tipus-registre': { abans: BUIDA },
  // «Any» sol coincidiria amb el botó «Desar com a esborrany» (conté «any»): busquem «Any*».
  'nova-dades-estada': {
    ruta: '/estancies/{estada:26014}/edita',
    abans: [{ espera: 12000 }],
    marques: ['Número de contracte', 'Any*', 'Tipus de pagament', 'Data formalització', 'Data d’entrada', 'Data de sortida', 'Habitació', 'Idioma de comunicació', 'Observacions', 'Habitació lliure en aquestes dates'],
  },
  'nova-viatger': { abans: [...BUIDA, { espera: 2500 }], mida: { width: 1180, height: 1750 } },
  'nova-botons-desar': { abans: [...BUIDA, { espera: 3500 }] },
  // 26095 té la lletra del DNI malament: «Desar canvis» mostra els avisos i NO desa.
  'nova-avisos-format': {
    ruta: '/estancies/{estada:26095}/edita',
    abans: [{ espera: 3000 }, { clic: 'Desar canvis' }, { espera: 3000 }],
  },
  // «Email» sol coincidiria amb el cercador («…email…»): busquem l'etiqueta «Email*».
  'tipus-registre-reserva': {
    abans: [...BUIDA, { clic: 'Reserva' }, { espera: 1500 }],
    mida: { width: 1180, height: 1850 },
    marques: ['Reserva', 'En reserva només calen nom, cognom i (email o telèfon) per cada viatger.', 'Contracte en curs', 'Email*', 'Telèfon'],
  },
  'numero-contracte': { abans: [...BUIDA, { clic: 'Generar el següent número' }, { espera: 2500 }], marques: ['Número de contracte', 'Número confirmat'] },
  'reaprofitar-hoste': {
    abans: [
      ...BUIDA,
      { scroll: 'Reaprofitar un hoste existent (nom, document, email…)' },
      { omple: ['Reaprofitar un hoste existent (nom, document, email…)', 'Puig'] },
      { espera: 8000 },
      { clic: 'Jordi Puigdomènech' },
      { espera: 3000 },
      { omple: ['Reaprofitar un hoste existent (nom, document, email…)', 'Ribas'] },
      { espera: 8000 },
    ],
    // La llista desplegada tapa l'enllaç «Treure l'hoste…»: marquem una coincidència.
    marques: ['Reaprofitar un hoste existent (nom, document, email…)', 'Hoste reaprofitat', 'Montserrat Ribas'],
    mida: { width: 1180, height: 1000 },
  },
  // Cal el focus en camps sense etiqueta (nom/telèfon/document): el motor no ho sap fer.
  'avis-no-acollir': { ometre: true },
  'document-ocr': { abans: [...BUIDA, { espera: 3000 }] },
  'afegir-treure-viatger': {
    abans: [...BUIDA, { clic: 'Reserva' }, { clic: 'Afegir viatger' }, { espera: 1200 }],
    mida: { width: 1180, height: 1300 },
  },
  'canviar-titular': {
    abans: [...BUIDA, { clic: 'Reserva' }, { clic: 'Afegir viatger' }, { espera: 1200 }],
    mida: { width: 1180, height: 1300 },
  },
  'menor-parentesc': { abans: [...BUIDA, { clic: 'És menor' }, { espera: 1000 }] },
  'nova-cobrament-fianca': {
    abans: [
      ...BUIDA,
      { clic: 'Afegir fiança' },
      { omple: ['Import €', '150'] },
      { clic: 'Afegir pagament' },
      { omple: ['Import €', '240'] },
      { espera: 1000 },
    ],
    mida: { width: 1180, height: 1700 },
  },
  'nova-mascotes': { abans: [...BUIDA, { clic: 'Porten mascota' }, { omple: ['Nom de la mascota', 'Rex'] }, { espera: 1000 }] },
  'habitacio-separada-camp': { abans: [...BUIDA, { espera: 3000 }] },
  'habitacio-separada-fitxa': { ruta: '/estancies/{estada:26008}' },
  'habitacio-separada-factura': {
    ruta: '/estancies/{estada:26008}',
    abans: [{ clic: 'Factura simple' }, { espera: 1500 }],
  },
  // 26095 (reserva, hab 5) coincideix amb 26010 (Laura Fernández, hab 5, en curs).
  'avis-solapament': { ruta: '/estancies/{estada:26095}/edita', abans: [{ espera: 12000 }] },

  'esborrany-fitxa': { abans: [{ clic: 'Més' }, { espera: 800 }] },
  'check-in': { ruta: '/estancies/{estada:26015}', abans: [{ clic: 'Check-in' }, { espera: 1000 }] },
  'editar-estada': { ruta: '/estancies/{estada:26014}/edita' },
  // Cal canviar una data al formulari (camp sense etiqueta lligada): el motor no ho sap fer.
  'editar-confirmar-dates': { ometre: true },
  'fitxa-estada-general': {
    ruta: '/estancies/{estada:26014}',
    mida: AMPLA,
    noObrir: true,
    // «Viatgers» sol coincidiria amb l'etiqueta VIATGERS del bloc de dades.
    marques: ['Allotjat ara', 'Registre persones allotjades', 'Reglament intern (LOPD)', 'Llibre registre', 'Canviar d’habitació', 'Ampliar estada', 'Més', 'Dades de l’estada', 'Viatgers (1)', 'Comunicació a Mossos', 'Missatges a l’hoste'],
  },
  'fitxa-blocs-plegables': {
    ruta: '/estancies/{estada:26010}',
    mida: { width: 1600, height: 1500 },
    noObrir: true,
    // «Facturació» i «Pressupostos» solen coincidir amb el menú: busquem el nom del botó del bloc.
    marques: ['Pagaments i fiances', 'Facturació (3)', 'Cobraments pendents', 'Pressupostos (0)', 'Mascotes de l’hoste', 'Bugaderia'],
    // Pleguem els blocs oberts perquè es vegin tots els títols junts.
    abans: [{ clic: 'Pagaments i fiances' }, { clic: 'Facturació (3)' }, { clic: 'Cobraments pendents' }, { espera: 800 }],
  },
  'documents-capcalera': { ruta: '/estancies/{estada:26004}' },
  'signatura-pad': { ruta: '/estancies/{estada:26014}', abans: [{ clic: 'Firmar' }, { espera: 1200 }], mida: { width: 1180, height: 1300 } },
  'signatura-feta': { ruta: '/estancies/{estada:26002}' },
  'ampliar-estada': { ruta: '/estancies/{estada:26014}', abans: [{ clic: 'Ampliar estada' }, { espera: 2500 }] },
  'cadena-contractes': { ruta: '/estancies/{estada:26006_1}' },
  'canvi-habitacio': { ruta: '/estancies/{estada:26014}', abans: [{ clic: 'Canviar d’habitació' }, { espera: 2000 }] },
  'historial-habitacio': { ruta: '/estancies/{estada:26007}' },
  'sortida-anticipada': {
    ruta: '/estancies/{estada:26014}',
    abans: [{ clic: 'Més' }, { clic: 'Sortida anticipada' }, { espera: 1000 }, { clic: 'Torno diners' }, { espera: 600 }],
    // És un <dialog> modal (capa superior del navegador): els números quedarien tapats.
    marques: [],
  },
  'reactivar': { ruta: '/estancies/{estada:26011}', abans: [{ clic: 'Més' }, { espera: 800 }] },
  'cobraments-pendents': { ruta: '/estancies/{estada:26010}' },
  // Plegat per defecte: l'obrim nosaltres (després de tancar la finestra de cobraments).
  'bugaderia-estada': {
    // Estada amb la fitxa curta (la taula queda a baix de tot de la pàgina i el motor
    // talla els últims 140 px): pantalla prou alta per veure-la sencera.
    ruta: '/estancies/{estada:26095}',
    noObrir: true,
    abans: [{ clic: 'Bugaderia' }, { espera: 12000 }],
    marques: ['Total per neteja', 'Bugaderia', 'Manteniment', 'Per defecte', 'Desar'],
    mida: { width: 1600, height: 2000 },
  },
  'missatges-hoste': { ruta: '/estancies/{estada:26014}', mida: AMPLA, noObrir: true },
  'email-gracies': {
    ruta: '/estancies/{estada:26014}',
    mida: { width: 1600, height: 1250 },
    noObrir: true,
    abans: [{ clic: 'Email de gràcies' }, { espera: 1200 }],
  },
  'mossos-estada': { ruta: '/estancies/{estada:26012}', mida: AMPLA, noObrir: true },
  // Només s'obre la finestra; no es confirma.
  // <dialog> modal: els números quedarien tapats, per això no en porta.
  'eliminar-estada': { ruta: '/estancies/{estada:26012}', abans: [{ clic: 'Més' }, { clic: 'Eliminar' }, { espera: 40000 }], marques: [] },
};

export const R_ESTADES: Record<string, Recepta> = RECEPTES;
