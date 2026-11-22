import { ocultaDelLlibre } from '@/lib/auth/restriccions';

/**
 * Full d'ocupació per habitació (pur, testejat): qui hi és a cada habitació, de quan
 * a quan, el telèfon, l'import i com ha pagat. Surt de les estades que ja hi ha a
 * l'app; serveix per imprimir-lo (A4) com el full que es feia a mà.
 *
 * L'habitació que compta és la REAL de l'estada (no la «administrativa» que un viatger
 * pot tenir per als papers).
 */

export interface EstanciaOcupacio {
  id: string;
  habitacio: string | null;
  entrada: string | null; // YYYY-MM-DD
  sortida: string | null; // YYYY-MM-DD
  observacions: string | null;
  viatgers: { nom: string; telefon: string | null; esTitular: boolean }[];
  cobraments: { import: number; metode: string }[];
  previstos: { import: number; pagat: boolean }[];
}

export interface FilaOcupacio {
  id: string;
  clients: string[];
  telefon: string | null;
  entrada: string | null;
  sortida: string | null;
  /** Total de l'estada: el cobrat + el que queda previst. null si no n'hi ha cap dada. */
  import: number | null;
  pagat: number;
  pendent: number;
  metodes: string[];
  notes: string | null;
  acabada: boolean;
}

export interface HabitacioOcupacio {
  nom: string;
  files: FilaOcupacio[];
}

const METODE: Record<string, string> = {
  EFECTIU: 'Efectiu',
  TARGETA: 'Targeta',
  TRANSFERENCIA: 'Transf.',
  BIZUM: 'Bizum',
  ALTRES: 'Altres',
};
export const nomMetode = (m: string) => METODE[m] ?? m;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Comparador de noms d'habitació: «2» abans que «10», i les amb lletra al final. */
export const comparaHabitacions = (a: string, b: string) => a.localeCompare(b, 'ca', { numeric: true });

export interface OpcionsConstruccio {
  desde: string;
  fins: string;
  /** Dia d'avui (YYYY-MM-DD): una estada amb la sortida abans és «acabada». */
  avui: string;
  /** Comptes de propietat: s'oculten les estades amb ZP11 i els cobraments «Altres». */
  restringit?: boolean;
}

/**
 * Agrupa les estades per habitació (totes les habitacions, també les lliures), amb
 * només les que toquen el període, ordenades per data d'entrada.
 */
export function construeixOcupacio(
  estades: EstanciaOcupacio[],
  habitacions: string[],
  o: OpcionsConstruccio,
): HabitacioOcupacio[] {
  const grups = new Map<string, FilaOcupacio[]>();
  for (const h of [...habitacions].sort(comparaHabitacions)) grups.set(h, []);

  for (const e of estades) {
    if (o.restringit && ocultaDelLlibre(e.observacions)) continue;
    // Només les que toquen el període.
    if (e.entrada && e.entrada > o.fins) continue;
    if (e.sortida && e.sortida < o.desde) continue;

    const cobraments = o.restringit ? e.cobraments.filter((c) => c.metode !== 'ALTRES') : e.cobraments;
    const pagat = r2(cobraments.reduce((a, c) => a + c.import, 0));
    const pendent = r2(e.previstos.filter((p) => !p.pagat).reduce((a, p) => a + p.import, 0));
    const metodes = [...new Set(cobraments.map((c) => nomMetode(c.metode)))];
    const viatgers = [...e.viatgers].sort((a, b) => Number(b.esTitular) - Number(a.esTitular));

    const fila: FilaOcupacio = {
      id: e.id,
      clients: viatgers.map((v) => v.nom),
      telefon: viatgers.find((v) => v.telefon)?.telefon ?? null,
      entrada: e.entrada,
      sortida: e.sortida,
      import: pagat + pendent > 0 ? r2(pagat + pendent) : null,
      pagat,
      pendent,
      metodes,
      notes: o.restringit ? null : e.observacions?.trim() || null,
      acabada: !!e.sortida && e.sortida < o.avui,
    };
    const clau = e.habitacio ?? 'Sense habitació';
    if (!grups.has(clau)) grups.set(clau, []);
    grups.get(clau)!.push(fila);
  }

  return [...grups.entries()].map(([nom, files]) => ({
    nom,
    files: files.sort((a, b) => (a.entrada ?? '').localeCompare(b.entrada ?? '')),
  }));
}
