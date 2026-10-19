import type { Recepta } from './tipus';

/**
 * Receptes de les fotos del capítol «mossos».
 * Dades extra: scripts/manual/demo-extra/hostes-mossos.ts
 *   26012 → enviament Acceptat i número de suport pendent
 *   26013 → enviament Pendent (fitxer generat, no pujat)
 *   26003 → enviament amb Error · 26005 → dades pendents amb l'avís silenciat
 * Cap recepta prem «Sí, generar…», «Sí, pujar ara» ni «Sí, eliminar».
 */
const CONFIG = [{ espera: 15000 }, { clic: 'Fitxer massiu de Mossos' }, { espera: 1000 }];

const BASE: Record<string, Recepta> = {
  'config-mossos-bloc': { abans: CONFIG, noObrir: true },
  'config-mossos-desar': { abans: CONFIG, noObrir: true, mida: { width: 1180, height: 1100 } },
  'estada-etiqueta-esborrany': {},
  'estada-botons-documents': {},
  'registre-habitacio-llibre': {},
  'justificants-plantilles': {},
  'registre-formulari-viatger': { abans: [{ scroll: 'Codi postal' }], mida: { width: 1180, height: 1000 } },
  'estada-targeta-mossos': { ruta: '/estancies/{estada:26014}' },
  'modal-revisio-mossos': {
    ruta: '/estancies/{estada:26012}',
    abans: [{ clic: 'Descarregar .txt (manual)' }, { espera: 15000 }],
  },
  'modal-confirmacio-mossos': {
    ruta: '/estancies/{estada:26014}',
    abans: [{ clic: 'Descarregar .txt (manual)' }, { espera: 15000 }, { clic: 'Continuar' }, { espera: 1000 }],
  },
  'modal-pujar-auto': { ruta: '/estancies/{estada:26012}', abans: [{ clic: 'Pujar a Mossos' }, { espera: 800 }] },
  // 26070 no té pagaments (si no, la paperera «Eliminar» d'un pagament surt abans que la de l'enviament).
  'enviament-fila-estat': { ruta: '/estancies/{estada:26070}', abans: [{ scroll: 'Missatges a l’hoste' }], mida: { width: 1180, height: 1000 } },
  'tauler-avisos-mossos': { abans: [{ espera: 3000 }] },
  'tauler-avis-amaga': { abans: [{ espera: 3000 }, { clic: "Pendents d'enviar a Mossos" }, { espera: 800 }] },
  'enviament-eliminar': {
    // 26070 no té pagaments: el seu «Eliminar» és l'únic (el de l'enviament). Mai es prem «Sí, eliminar».
    ruta: '/estancies/{estada:26070}',
    abans: [{ clic: 'Eliminar' }, { espera: 800 }, { clic: 'Continuar' }, { espera: 800 }, { scroll: 'Missatges a l’hoste' }],
    mida: { width: 1180, height: 1400 },
  },
  'llibre-filtres': { abans: [{ espera: 30000 }] },
  'llibre-taula': { abans: [{ espera: 15000 }], mida: { width: 1440, height: 1000 } },
  'justificants-fila': { ruta: '/justificants?any=2026&mes=9', mida: { width: 1600, height: 900 } },
  'justificants-silenciar': { ruta: '/justificants?any=2026&mes=7', mida: { width: 1600, height: 900 } },
};

/**
 * Des del 19/10/2026 surt la finestra «Cobraments a punt» a totes les pantalles
 * (es recorda al navegador): la tanquem abans de res. Si no hi és, no passa res.
 */
const TANCA = { clic: 'Tancar per avui' } as const;
export const R_MOSSOS: Record<string, Recepta> = Object.fromEntries(
  Object.entries(BASE).map(([k, r]) => [k, r.ometre ? r : { ...r, abans: [{ espera: 2500 }, TANCA, { espera: 600 }, ...(r.abans ?? [])] }]),
);
