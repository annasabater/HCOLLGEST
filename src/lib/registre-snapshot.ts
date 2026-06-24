/**
 * Snapshot de les dades d'un viatger per a una estada. Quan una estada passa a
 * ser antiga (>7 dies des de la sortida), les seves dades es "congelen": editar
 * la fitxa de l'hoste ja no reescriu el llibre/fitxa/Mossos d'aquella estada.
 */
import type { Huesped } from '@prisma/client';

const FIELDS = [
  'nom',
  'cognom1',
  'cognom2',
  'sexe',
  'dataNaixement',
  'nacionalitat',
  'tipusDocument',
  'numDocument',
  'numSuport',
  'dataExpedicio',
  'email',
  'telefon',
  'adreca',
  'pais',
  'provincia',
  'municipi',
  'localitat',
  'codiPostal',
] as const;

const DATE_FIELDS = new Set(['dataNaixement', 'dataExpedicio']);

/** Dies a partir dels quals una estada (per la sortida) es considera congelada. */
export const DIES_CONGELACIO = 7;

/** Una estada es congela quan fa més de 7 dies de la sortida. */
export function estadaCongelada(dataSortida: Date, ara: Date = new Date()): boolean {
  return dataSortida.getTime() < ara.getTime() - DIES_CONGELACIO * 86_400_000;
}

/** Construeix l'snapshot (JSON) de les dades de registre d'un hoste. */
export function snapshotHuesped(h: Huesped): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const f of FIELDS) {
    const v = (h as Record<string, unknown>)[f];
    snap[f] = v instanceof Date ? v.toISOString() : v;
  }
  return snap;
}

/**
 * Dades efectives del viatger: si hi ha snapshot congelat, l'usa (per no
 * reescriure el passat); si no, la fitxa viva. Manté la resta de camps de la
 * fitxa (id, animals…) intactes.
 */
export function viatgerEfectiu<T extends Huesped>(huesped: T, congelades: unknown): T {
  if (!congelades || typeof congelades !== 'object') return huesped;
  const c = congelades as Record<string, unknown>;
  const overrides: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (!(f in c)) continue;
    const v = c[f];
    overrides[f] = DATE_FIELDS.has(f) && typeof v === 'string' && v ? new Date(v) : v;
  }
  return { ...huesped, ...overrides } as T;
}
