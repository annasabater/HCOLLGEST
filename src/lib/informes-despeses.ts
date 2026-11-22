/**
 * Informes de despeses agrupades (Balanç → Imprimir): per proveïdor o per categoria,
 * amb el nombre de factures, la base, l'IVA, les fiances i el total pagat. Lògica pura:
 * no toca la BD (la càrrega és a `services/informes-despeses.ts`).
 *
 * - Sense fiances (per defecte): les fiances (`esFianca`) NO hi són, com al Balanç.
 * - Amb fiances: s'hi afegeixen, a part (columna «Fiança»), i sumen al total pagat.
 * - Base i IVA surten de les línies d'IVA de les despeses REALS (`gasto-iva.ts`); si no
 *   n'hi ha, es dedueixen del total al 21 % inclòs, com al llibre d'IVA. Una fiança no
 *   porta base ni IVA: no és despesa.
 * - El total és l'import PAGAT (ja descomptada la retenció d'IRPF, si n'hi ha), per
 *   això base + IVA pot no coincidir amb el total en lloguers amb retenció.
 */
import { liniesIva } from './gasto-iva';

export type AgruparPer = 'proveidor' | 'categoria';
/** Com tractar les fiances: sense, amb (sumades a part) o les dues vistes en un sol informe. */
export type ModeFiances = 'sense' | 'amb' | 'tot';

/** Nombre tal com arriba de la BD (Decimal), d'un formulari o directe. */
type Num = number | string | { toString(): string };

/** El mínim d'una despesa per a l'informe. */
export interface DespesaInforme {
  import: Num;
  esFianca: boolean;
  baseImposable?: Num | null;
  ivaPercent?: Num | null;
  desglossamentIva?: unknown;
  descripcio?: string;
  proveidor: { nom: string; cif: string | null } | null;
  categoria: { nom: string };
}

export interface FilaInforme {
  /** Proveïdor o categoria. */
  nom: string;
  /** NIF (només per proveïdor, si en té). */
  nif: string;
  /** Categoria(es) del proveïdor, separades per «, » (només per proveïdor). */
  categories: string;
  factures: number;
  base: number;
  iva: number;
  /** Part del total que són fiances (només amb fiances; si no, 0). */
  fianca: number;
  total: number;
}

export interface TotalInforme {
  factures: number;
  base: number;
  iva: number;
  fianca: number;
  total: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const SENSE_PROVEIDOR = 'Sense proveïdor';

export function agrupaDespeses(
  gastos: DespesaInforme[],
  per: AgruparPer,
  ambFiances = false,
): { files: FilaInforme[]; total: TotalInforme } {
  const m = new Map<string, FilaInforme & { cats: Set<string> }>();
  for (const g of gastos) {
    if (g.esFianca && !ambFiances) continue;
    const nom = per === 'proveidor' ? (g.proveidor?.nom?.trim() || SENSE_PROVEIDOR) : g.categoria.nom;
    // Un mateix proveïdor escrit amb majúscules diferents es compta junt.
    const clau = nom.toLocaleLowerCase('ca');
    const f = m.get(clau) ?? { nom, nif: '', categories: '', factures: 0, base: 0, iva: 0, fianca: 0, total: 0, cats: new Set<string>() };
    const import_ = Number(g.import.toString());
    f.factures += 1;
    f.total += import_;
    if (g.esFianca) {
      f.fianca += import_;
    } else {
      const linies = liniesIva(g);
      f.base += linies.reduce((a, l) => a + l.base, 0);
      f.iva += linies.reduce((a, l) => a + l.iva, 0);
    }
    if (per === 'proveidor') {
      if (!f.nif && g.proveidor?.cif) f.nif = g.proveidor.cif.trim().toUpperCase();
      f.cats.add(g.categoria.nom);
    }
    m.set(clau, f);
  }
  const files = [...m.values()]
    .map(({ cats, ...f }) => ({
      ...f,
      categories: [...cats].sort((a, b) => a.localeCompare(b, 'ca')).join(', '),
      base: r2(f.base),
      iva: r2(f.iva),
      fianca: r2(f.fianca),
      total: r2(f.total),
    }))
    .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, 'ca'));
  const total: TotalInforme = {
    factures: files.reduce((a, f) => a + f.factures, 0),
    base: r2(files.reduce((a, f) => a + f.base, 0)),
    iva: r2(files.reduce((a, f) => a + f.iva, 0)),
    fianca: r2(files.reduce((a, f) => a + f.fianca, 0)),
    total: r2(files.reduce((a, f) => a + f.total, 0)),
  };
  return { files, total };
}

/** Format de la web: 1.234,56 (sense símbol). */
export const fmtImport = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });

/** Un bloc de CSV (sense BOM). Amb `titol`, una primera fila el posa. */
export function csvInforme(files: FilaInforme[], total: TotalInforme, per: AgruparPer, ambFiances = false, titol?: string): string {
  const cel = (c: string | number) => `"${String(c).replace(/"/g, '""')}"`;
  const dec = (n: number) => n.toFixed(2).replace('.', ',');
  const prov = per === 'proveidor';
  const cap = [per === 'proveidor' ? 'Proveïdor' : 'Categoria', ...(prov ? ['NIF', 'Categoria'] : []), 'Factures', 'Base', 'IVA', ...(ambFiances ? ['Fiança'] : []), 'Total'];
  const fila = (f: FilaInforme) => [f.nom, ...(prov ? [f.nif, f.categories] : []), f.factures, dec(f.base), dec(f.iva), ...(ambFiances ? [dec(f.fianca)] : []), dec(f.total)];
  const peu = ['Total', ...(prov ? ['', ''] : []), total.factures, dec(total.base), dec(total.iva), ...(ambFiances ? [dec(total.fianca)] : []), dec(total.total)];
  const files_ = [...(titol ? [[titol]] : []), cap, ...files.map(fila), peu];
  return files_.map((r) => r.map(cel).join(';')).join('\r\n');
}

/** El fitxer: BOM UTF-8 (Excel ho necessita) i els blocs separats per una línia en blanc. */
export const csvFitxer = (blocs: string[]) => `﻿${blocs.join('\r\n\r\n')}`;
