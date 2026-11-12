/**
 * Registre de Deure i Haver de la CAIXA i del BANC (part pura, testejada).
 *
 * Mirat des de cada compte de diners:
 *   Deure = entren diners · Haver = en surten · Saldo = anterior + Deure − Haver.
 *
 * Els moviments surten sols dels pagaments de les estades, dels dipòsits i de
 * les despeses (efectiu → caixa; targeta, transferència i Bizum → banc). A mà
 * només hi van el SALDO INICIAL (diners que hi havia un dia concret) i els
 * TRASPASSOS (portar l'efectiu de la caixa al banc o treure'n).
 */

export const COMPTES_TRESORERIA = ['BANC', 'CAIXA'] as const;
export type CompteTresoreria = (typeof COMPTES_TRESORERIA)[number];

export const TIPUS_MOVIMENT_TRESORERIA = ['SALDO_INICIAL', 'TRASPAS', 'ENTRADA', 'SORTIDA'] as const;
export type TipusMovimentTresoreria = (typeof TIPUS_MOVIMENT_TRESORERIA)[number];

export const NOM_COMPTE: Record<CompteTresoreria, string> = { BANC: 'Banc', CAIXA: 'Caixa' };
export const altreCompte = (c: CompteTresoreria): CompteTresoreria => (c === 'BANC' ? 'CAIXA' : 'BANC');

/** Forma de pagament → compte on es mouen els diners. `null`: no se sap (Altres). */
export function compteDeMetode(metode: string): CompteTresoreria | null {
  if (metode === 'EFECTIU') return 'CAIXA';
  if (metode === 'TARGETA' || metode === 'TRANSFERENCIA' || metode === 'BIZUM') return 'BANC';
  return null;
}

export type OrigenMoviment = 'COBRAMENT' | 'DIPOSIT' | 'DEVOLUCIO_DIPOSIT' | 'GASTO' | 'MANUAL';

/** Un moviment ja assignat a un compte (sempre un sol costat amb import). */
export interface MovimentCompte {
  compte: CompteTresoreria;
  /** `YYYY-MM-DD`. */
  dia: string;
  concepte: string;
  referencia: string | null;
  deure: number;
  haver: number;
  origen: OrigenMoviment;
  /** Id del moviment manual (per poder-lo esborrar) o de l'origen. */
  id: string;
  /** Enllaç a la fitxa d'on surt (estada, despesa…). */
  href: string | null;
}

/** Saldo que hi havia al COMENÇAR un dia (es fixa a mà). */
export interface SaldoInicial {
  id: string;
  compte: CompteTresoreria;
  dia: string;
  import: number;
}

export interface FilaRegistre {
  dia: string;
  concepte: string;
  referencia: string | null;
  /** `null` a les files de saldo inicial (no són moviment). */
  deure: number | null;
  haver: number | null;
  saldo: number;
  origen: OrigenMoviment | 'SALDO_INICIAL';
  id: string;
  href: string | null;
}

export interface RegistreCompte {
  compte: CompteTresoreria;
  /** Saldo al començar `desde`. */
  saldoInicial: number;
  /** Fals si no hi ha cap saldo inicial anterior: el saldo parteix de 0 i pot no ser real. */
  ambSaldoInicial: boolean;
  files: FilaRegistre[];
  totalDeure: number;
  totalHaver: number;
  saldoFinal: number;
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Un import amb signe → el costat que toca (negatiu = al revés: una devolució). */
export function costats(importEntrada: number): { deure: number; haver: number } {
  const v = round2(importEntrada);
  return v >= 0 ? { deure: v, haver: 0 } : { deure: 0, haver: -v };
}

/**
 * Registre d'un compte entre `desde` i `fins` (inclosos).
 *
 * El saldo de partida és l'últim SALDO INICIAL d'aquell dia o abans, més els
 * moviments que hi ha entre aquell dia i `desde`. Si dins del període n'hi ha
 * un altre, surt com a fila i el saldo hi torna a començar (és un arqueig).
 * Un saldo inicial vol dir «al començar el dia»: els moviments d'aquell dia van després.
 */
export function calculaRegistre(
  compte: CompteTresoreria,
  moviments: MovimentCompte[],
  saldos: SaldoInicial[],
  desde: string,
  fins: string,
): RegistreCompte {
  const meus = moviments
    .filter((m) => m.compte === compte)
    .sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));
  const ancores = saldos.filter((s) => s.compte === compte).sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));

  const base = [...ancores].reverse().find((s) => s.dia <= desde) ?? null;
  let saldo = base ? base.import : 0;
  if (base) {
    for (const m of meus) if (m.dia >= base.dia && m.dia < desde) saldo = round2(saldo + m.deure - m.haver);
  }
  const saldoInicial = round2(saldo);

  type Ev = { dia: string; ordre: number; mov?: MovimentCompte; ancora?: SaldoInicial };
  const evs: Ev[] = [
    ...ancores.filter((s) => s.dia > desde && s.dia <= fins).map((s) => ({ dia: s.dia, ordre: 0, ancora: s })),
    ...meus.filter((m) => m.dia >= desde && m.dia <= fins).map((m) => ({ dia: m.dia, ordre: 1, mov: m })),
  ];
  evs.sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : a.ordre - b.ordre));

  const files: FilaRegistre[] = [];
  let totalDeure = 0;
  let totalHaver = 0;
  for (const e of evs) {
    if (e.ancora) {
      saldo = e.ancora.import;
      files.push({
        dia: e.dia, concepte: 'Saldo inicial (arqueig)', referencia: null, deure: null, haver: null,
        saldo: round2(saldo), origen: 'SALDO_INICIAL', id: e.ancora.id, href: null,
      });
      continue;
    }
    const m = e.mov!;
    saldo = round2(saldo + m.deure - m.haver);
    totalDeure = round2(totalDeure + m.deure);
    totalHaver = round2(totalHaver + m.haver);
    files.push({
      dia: m.dia, concepte: m.concepte, referencia: m.referencia, deure: m.deure || null, haver: m.haver || null,
      saldo, origen: m.origen, id: m.id, href: m.href,
    });
  }

  return {
    compte,
    saldoInicial,
    ambSaldoInicial: !!base,
    files,
    totalDeure,
    totalHaver,
    saldoFinal: round2(saldo),
  };
}
