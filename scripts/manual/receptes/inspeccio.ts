import type { Recepta } from './tipus';

/** Receptes de les fotos del capítol «inspeccio». */
const BASE: Record<string, Recepta> = {
  'in-llibre-exportar': { abans: [{ espera: 15000 }] },
  // Setembre 2026: hi surt l'estada 26012, amb el comprovant de Mossos (Acceptat).
  'in-justificants-papers': { ruta: '/justificants?any=2026&mes=9', mida: { width: 1600, height: 1000 } },
};

/**
 * Des del 19/10/2026 surt la finestra «Cobraments a punt» a totes les pantalles
 * (es recorda al navegador): la tanquem abans de res. Si no hi és, no passa res.
 */
const TANCA = { clic: 'Tancar per avui' } as const;
export const R_INSPECCIO: Record<string, Recepta> = Object.fromEntries(
  Object.entries(BASE).map(([k, r]) => [k, r.ometre ? r : { ...r, abans: [{ espera: 2500 }, TANCA, { espera: 600 }, ...(r.abans ?? [])] }]),
);
