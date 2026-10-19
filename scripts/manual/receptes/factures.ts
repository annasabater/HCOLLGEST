import type { Recepta } from './tipus';

/**
 * Receptes de les fotos del capítol «factures».
 *
 * Estades de demo que fan servir (dades inventades):
 *   26013 · Oriol (en curs): un pagament a compte + una fiança en custòdia, sense factures.
 *   26090 · Núria (demo-extra/factures.ts): 2 simplificades, pagament a compte, fiança i
 *           devolució sense factura → la caixa «Facturació» mostra els cinc botons.
 *   26091 · Pau (demo-extra/factures.ts): 1 simplificada i només una fiança en custòdia
 *           (el primer llapis «Editar» de la caixa és el de la fiança).
 *   26010 · Laura (llarga estada set.–nov.): per repartir per mesos.
 *   26012 · Isabel: una sola factura, sense res a compte (la primera paperera és la de la factura).
 *   26016 · Marta (reserva) amb el pressupost enllaçat (demo-extra/factures.ts).
 * Cap recepta prem «Desar», «Crear…» ni confirma cap eliminació.
 */
const BASE: Record<string, Recepta> = {
  // Les targetes es pleguen perquè es vegin les quatre capçaleres una sota l'altra.
  // (Es marca el botó de la capçalera amb el comptador: «Facturació» sol trobaria el menú lateral.)
  'estada-caixes-diners': {
    ruta: '/estancies/{estada:26090}',
    noObrir: true,
    abans: [{ clic: 'Pagaments i fiances (5)' }, { clic: 'Facturació (2)' }],
    marques: ['Pagaments i fiances (5)', 'Facturació (2)', 'Cobraments pendents (0)', 'Pressupostos (0)'],
  },
  // Tots els noms de les pestanyes (menys Veri*Factu) també són al menú lateral, i el motor
  // marcaria el menú: la foto va sense números (la pestanya activa ja es veu subratllada).
  'menu-finances': { marques: [] },
  'pagament-botons': { ruta: '/estancies/{estada:26013}' },
  'pagament-formulari': {
    ruta: '/estancies/{estada:26013}',
    abans: [
      { clic: 'Afegir pagament' },
      { omple: ['Import €', '260'] },
      { omple: ['Observacions internes (no apareix a la factura)', 'Resta de l’estada'] },
    ],
  },
  'pagament-periodes': {
    ruta: '/estancies/{estada:26010}',
    abans: [{ clic: 'Afegir pagament' }, { omple: ['Import €', '2460'] }, { clic: 'Proposar per mesos' }, { espera: 25000 }],
    mida: { width: 1180, height: 1250 },
  },
  'pagament-editar': { ruta: '/estancies/{estada:26013}', abans: [{ clic: 'Editar' }] },
  'cobrament-pendent-afegir': {
    ruta: '/estancies/{estada:26013}',
    abans: [{ omple: ['Import (€)', '120'] }, { omple: ['Concepte (opcional)', 'Bugaderia i extres'] }],
  },
  // El pop-up surt quan hi ha un cobrament previst per a avui o els dos dies següents
  // (amb les dades de demo, del 19 al 21/10/2026: el de l'Oriol, 26013). No es crea cap dada
  // per forçar-lo, perquè sortiria a totes les fotos.
  // «Cobraments a punt» també és el nom (aria) de la capa fosca que tapa tota la pantalla:
  // el número 1 es posa sobre el subtítol de la finestra.
  'popup-cobraments': { ruta: '/?manualPopup=1', marques: ['en els pròxims dies', 'Ja està pagat', 'Veure estada', 'Tancar per avui'] },
  // Les finestres <dialog> modals es pinten per sobre de tot (capa superior del navegador):
  // els números del motor hi queden a sota i no es veurien. Aquestes fotes van sense números.
  'sortida-anticipada-devolucio': {
    ruta: '/estancies/{estada:26013}',
    abans: [{ clic: 'Més' }, { clic: 'Sortida anticipada' }, { clic: 'Torno diners' }, { omple: ['0.00', '60'] }],
    marques: [],
  },
  'fianca-formulari': {
    ruta: '/estancies/{estada:26013}',
    abans: [{ clic: 'Afegir fiança' }, { omple: ['Import €', '100'] }],
  },
  // «Pagament» sol trobaria l'etiqueta PAGAMENT de les dades de l'estada: es marquen les
  // línies del pagament i de la fiança pel seu text.
  'fianca-en-custodia': {
    ruta: '/estancies/{estada:26013}',
    marques: ['A compte (sense factura)', 'Primer pagament a compte', 'Fiança de l’habitació'],
  },
  'diposit-formulari': {
    ruta: '/estancies/{estada:26013}',
    abans: [{ clic: 'Afegir dipòsit' }, { omple: ['Import €', '300'] }],
  },
  'fianca-tornar-retenir': { ruta: '/estancies/{estada:26091}', abans: [{ clic: 'Editar' }] },
  'fianca-retenir-motiu': {
    ruta: '/estancies/{estada:26091}',
    abans: [{ clic: 'Editar' }, { clic: 'Retenir' }, { omple: ['Motiu (opcional)', 'Persiana trencada'] }],
    marques: [],
  },
  'fianca-periodes': {
    ruta: '/estancies/{estada:26010}',
    abans: [{ clic: 'Afegir fiança' }, { omple: ['Import €', '300'] }, { clic: 'Proposar per mesos' }, { espera: 25000 }],
    mida: { width: 1180, height: 1250 },
  },
  'fianca-editar': { ruta: '/estancies/{estada:26091}', abans: [{ clic: 'Editar' }] },
  'factura-diposit-crear': { ruta: '/estancies/{estada:26090}', abans: [{ clic: 'Factura de dipòsit' }, { espera: 8000 }] },
  'factura-diposit-impresa': { ruta: '/imprimir/factura-simple/{factura:26010.2}' },
  'facturacio-botons': { ruta: '/estancies/{estada:26090}' },
  'factura-simple-formulari': { ruta: '/estancies/{estada:26013}', noObrir: true, mida: { width: 1180, height: 1300 }, abans: [{ clic: 'Facturació (0)' }, { clic: 'Factura simple' }, { espera: 8000 }, { scroll: 'Crear factura' }] },
  'factura-amb-sense-fianca': { ruta: '/estancies/{estada:26013}', noObrir: true, mida: { width: 1180, height: 1300 }, abans: [{ clic: 'Facturació (0)' }, { clic: 'Factura simple' }, { espera: 8000 }, { scroll: 'Crear factura' }] },
  'factura-fiscal-formulari': { ruta: '/estancies/{estada:26013}', noObrir: true, mida: { width: 1180, height: 1300 }, abans: [{ clic: 'Facturació (0)' }, { clic: 'Factura fiscal' }, { espera: 8000 }, { scroll: 'Crear factura' }] },
  // 02/26 és la fiscal de l'empresa (amb les dades del client empresa).
  'factura-fiscal-impresa': { ruta: '/imprimir/factura/{factura:02/26}' },
  'fiscal-de-simplificades': { ruta: '/estancies/{estada:26090}', abans: [{ clic: 'Fiscal de simplificades' }, { espera: 8000 }] },
  'rectificativa-formulari': { ruta: '/estancies/{estada:26090}', abans: [{ clic: 'Factura rectificativa' }, { espera: 8000 }] },
  'rectificativa-impresa': { ruta: '/imprimir/factura-simple/{factura:R26-001}' },
  'factura-editar-llapis': { ruta: '/estancies/{estada:26091}', abans: [{ espera: 4000 }, { clic: 'Editar la factura aquí' }, { espera: 8000 }] },
  'factura-simple-impresa-editable': { ruta: '/imprimir/factura-simple/{factura:26001}' },
  // El títol queda just a la vora de baix i el motor no desplaça: primer es baixa més avall.
  'llibre-iva-desglossament': { ruta: '/imprimir/trimestre-ingressos/2026-3', abans: [{ scroll: 'Libro de ingresos' }] },
  'factura-eliminar': {
    ruta: '/estancies/{estada:26012}',
    abans: [{ clic: 'Eliminar' }],
    marques: [],
  },
  // «Facturació» sola trobaria el menú lateral: es marca la línia de sota el títol.
  'factures-llista': {
    marques: ['pendent de cobrament', 'Amagar imports', "Llibre d'IVA trimestral (ingressos)", 'Totes', 'Simplificades', 'Fiscals', 'Número', 'Data'],
  },
  'factura-detall': { ruta: '/factures/{factura:26001}' },
  // La finestra només surt DESPRÉS de desar un total diferent (canviaria les dades de demo).
  'sincronitzar-imports': { ometre: true },
  'imprimir-pdf': { ruta: '/imprimir/factura-simple/{factura:26001}' },
  'pressupost-formulari': { sencera: true },
  // «Pressupostos» sol trobaria el menú lateral: es marca la capçalera amb el comptador.
  'pressupost-estada': { ruta: '/estancies/{estada:26016}', marques: ['Pressupostos (1)', 'Fer pressupost'] },
  // «Ingressos» i «Fiances» sols trobarien els filtres de «Moviments»: es marquen les notes
  // de cada bloc. S'espera que el Balanç acabi de carregar.
  'balanc-fiances': {
    abans: [{ espera: 60000 }],
    marques: ["Resultat de l'hostal", 'sense fiances · és el que compta per a Hisenda', 'no són ingrés ni despesa', 'Rebudes', 'Pagades', 'Saldo'],
  },
  'pressupost-eliminar': { abans: [{ clic: 'Eliminar' }], marques: [] },
};

/** Receptes de les fotos del capítol. */
export const R_FACTURES: Record<string, Recepta> = BASE;
