import type { Recepta } from './tipus';

/**
 * Receptes de les fotos del capítol «comptabilitat».
 * Cap recepta desa res: només obre formularis, pestanyes o finestres.
 */
const ANY = [{ espera: 4000 }, { clic: 'Any' }, { espera: 40000 }];

const BASE: Record<string, Recepta> = {
  // Pantalla més alta perquè es vegi tot el grup Gestió del menú lateral.
  'menu-gestio-finances': { mida: { width: 1180, height: 980 }, abans: [{ espera: 3000 }] },
  // En carregar l'adreça directament els imports surten visibles: s'amaguen amb el botó
  // perquè la foto mostri com es veu en entrar-hi des del menú (amb «Mostrar imports»).
  // «Fiances» sol trobaria un altre text: es marca la nota del bloc Fiances.
  'balanc-capcalera': {
    marques: ['Mes', 'Trimestre', 'Any', 'Personalitzat', 'Mostrar imports', "Resultat de l'hostal", 'no són ingrés ni despesa', 'CSV', 'PDF'],
    abans: [{ espera: 20000 }, { clic: 'Amagar imports' }, { espera: 1000 }],
  },
  // «Ingressos» sol trobaria abans el botó de filtre de «Moviments»: es clica l'import de la
  // casella (ingressos de l'any 2026 amb les dades de demo).
  'balanc-desglossament': {
    abans: [...ANY, { clic: '9260,00 €' }, { espera: 2000 }],
    marques: ['Ingressos · per mètode de cobrament', 'Total', 'Moviments ('],
  },
  'balanc-cascada': { abans: ANY },
  'balanc-mes-a-mes': { abans: ANY },
  // «Sense fiances» i «Només fiances» sols trobarien abans els botons del gràfic Mes a mes.
  'balanc-categories-metodes': { abans: ANY, marques: ["En què se'n va", "Com t'han pagat", 'Tot', 'Total amb fiances'] },
  'balanc-indicadors-moviments': { abans: ANY },
  'despesa-formulari': { abans: [{ clic: 'Nova despesa' }], sencera: true },
  // Sense pujar cap fitxer el motor no pot fer l'escaneig: es mostra el camp de l'adjunt.
  'despesa-escaner': { abans: [{ clic: 'Nova despesa' }] },
  // La factura de l'aigua d'octubre ja porta dues línies d'IVA (10 % i 21 %).
  'despesa-linies-iva': { abans: [{ espera: 15000 }, { clic: 'Aigua · 127,74 €' }, { clic: 'Editar despesa' }] },
  'despesa-adjunt-editar': { abans: [{ espera: 3000 }, { clic: 'Editar despesa' }] },
  // La fiança pagada és d'abril: es mira tot l'any.
  // Pantalla més ampla perquè la taula de tot l'any hi càpiga sencera (amb les icones de la dreta).
  'despesa-fianca': { abans: ANY, mida: { width: 1600, height: 1250 } },
  'despesa-llista-accions': { abans: [{ espera: 15000 }, { clic: 'Aigua · 127,74 €' }] },
  // Tot l'any, perquè hi entri la fiança pagada d'abril i surti el bloc «Fiances (a part)».
  'despeses-resum': { abans: ANY, sencera: true },
  // «Neteja» sol trobaria el menú lateral: aquesta columna no es marca.
  'despeses-personal': {
    abans: [{ espera: 35000 }],
    marques: ['Nòmines', 'Bugaderia', 'Pagat / pendent', 'Obrir fitxa', 'Total personal al període'],
  },
  // «Nom» sol trobaria un altre text: es marca la casella pel seu exemple.
  'proveidors-llista': {
    abans: [{ espera: 15000 }, { clic: 'Nou proveïdor' }],
    marques: ['Nou proveïdor', 'P. ex. SEGURVIP', 'CIF/NIF', 'Desar proveïdor'],
  },
  // El text de la segona casella porta «»: el motor els treu en buscar, i es marca un tros.
  'servei-formulari': {
    abans: [{ espera: 5000 }, { clic: 'Nou servei' }],
    sencera: true,
    marques: ['Nou servei', 'Activitat / servei', 'Freqüència', 'Propera data (visita/renovació/pagament)', 'Import previst €', 'Categoria de despesa', 'Generar la despesa automàticament cada cop que venci (es comptabilitza l’import previst)', 'És una despesa fixa (apareix també a', 'Desar servei'],
  },
  'servei-llista': { abans: [{ espera: 35000 }] },
  // El títol de la finestra porta el nom del servei; «Data» sol trobaria la nota de sota la foto.
  'servei-registrar-factura': {
    abans: [{ espera: 15000 }, { clic: 'Registrar la factura (crea la despesa)' }, { espera: 2000 }],
    marques: ['Registrar factura · Gestoria', 'Pujar factura', 'Import €', 'És una fiança'],
  },
  'gastos-fixos': { abans: [{ espera: 15000 }], sencera: true },
  // La llista «Llibres desats» es carrega després (el 2026-2 el desa demo-extra/comptabilitat.ts).
  'llibre-iva-entrada': { abans: [{ espera: 20000 }] },
  // 2026-2 està desat (demo-extra/comptabilitat.ts): surt l'etiqueta «Desat …».
  'llibre-iva-barra-eines': { ruta: '/imprimir/trimestre-ingressos/2026-2' },
  // Quan el títol del full queda just a la vora de baix el motor no desplaça la vista:
  // primer es baixa a un full de més avall.
  'llibre-iva-pdf': { abans: [{ scroll: 'Libro de ingresos' }], marques: ['Facturas emitidas · Repercutidas', 'Imprimir PDF'] },
  // «+ Afegir fila» sol trobaria el botó de la barra de dalt: no es marca.
  'llibre-iva-libro-gastos': { marques: ['Libro de gastos', 'Restaurar columnes', 'Mostrar columnes buides'] },
  'llibre-iva-emeses': { abans: [{ scroll: 'Libro de ingresos' }] },
  'impostos-trimestre': { abans: [{ espera: 5000 }], sencera: true },
  'impostos-marcar-presentada': {
    abans: [{ espera: 12000 }, { clic: 'Marca com a presentada' }, { espera: 3000 }],
    // En mode edició el 303 ja no mostra «Seu electrònica» (el motor marcaria la del 130).
    marques: ['Núm. de justificant (opcional)', 'Desa com a presentada', 'Cancel·la'],
  },
  'impostos-anual': { abans: [{ espera: 8000 }, { clic: 'Anual · 390 i 180' }, { espera: 8000 }], sencera: true },
  'impostos-proper-termini': { abans: [{ espera: 3000 }] },
  'taxa-turistica': { abans: [{ espera: 30000 }] },
  // La targeta surt plegada i només quan la configuració ha carregat.
  'config-taxa-turistica': { abans: [{ espera: 30000 }, { clic: 'Taxa turística (declaració)' }, { espera: 1500 }] },
  verifactu: {},
  'ieet-declaracio': { sencera: true },
};

/** Receptes de les fotos del capítol. */
export const R_COMPTABILITAT: Record<string, Recepta> = BASE;
