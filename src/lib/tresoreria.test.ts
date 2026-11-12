import { describe, expect, it } from 'vitest';
import { calculaRegistre, compteDeMetode, costats, type MovimentCompte, type SaldoInicial } from './tresoreria';

const mov = (compte: 'BANC' | 'CAIXA', dia: string, deure: number, haver: number, concepte = 'x'): MovimentCompte => ({
  compte, dia, concepte, referencia: null, deure, haver, origen: 'COBRAMENT', id: `${dia}-${deure}-${haver}`, href: null,
});

describe('compteDeMetode', () => {
  it('efectiu a la caixa; targeta, transferència i Bizum al banc; Altres enlloc', () => {
    expect(compteDeMetode('EFECTIU')).toBe('CAIXA');
    expect(compteDeMetode('TARGETA')).toBe('BANC');
    expect(compteDeMetode('TRANSFERENCIA')).toBe('BANC');
    expect(compteDeMetode('BIZUM')).toBe('BANC');
    expect(compteDeMetode('ALTRES')).toBeNull();
  });
});

describe('costats', () => {
  it('positiu al Deure, negatiu (devolució) a l’Haver', () => {
    expect(costats(330)).toEqual({ deure: 330, haver: 0 });
    expect(costats(-45.5)).toEqual({ deure: 0, haver: 45.5 });
  });
});

describe('calculaRegistre', () => {
  // L'exemple del mockup: banc de novembre.
  const banc: MovimentCompte[] = [
    mov('BANC', '2026-11-02', 330, 0),
    mov('BANC', '2026-11-06', 495, 0),
    mov('BANC', '2026-11-10', 0, 145.2),
    mov('BANC', '2026-11-12', 1100, 0),
    mov('BANC', '2026-11-15', 0, 66),
    mov('BANC', '2026-11-18', 264, 0),
    mov('BANC', '2026-11-25', 300, 0),
    mov('CAIXA', '2026-11-25', 0, 300),
  ];
  const saldos: SaldoInicial[] = [{ id: 's1', compte: 'BANC', dia: '2026-11-01', import: 3200 }];

  it('saldo fila a fila i totals', () => {
    const r = calculaRegistre('BANC', banc, saldos, '2026-11-01', '2026-11-30');
    expect(r.saldoInicial).toBe(3200);
    expect(r.ambSaldoInicial).toBe(true);
    expect(r.files.map((f) => f.saldo)).toEqual([3530, 4025, 3879.8, 4979.8, 4913.8, 5177.8, 5477.8]);
    expect(r.totalDeure).toBe(2489);
    expect(r.totalHaver).toBe(211.2);
    expect(r.saldoFinal).toBe(5477.8);
  });

  it('el mes següent parteix del saldo final de l’anterior', () => {
    const r = calculaRegistre('BANC', [...banc, mov('BANC', '2026-12-03', 0, 77.8)], saldos, '2026-12-01', '2026-12-31');
    expect(r.saldoInicial).toBe(5477.8);
    expect(r.saldoFinal).toBe(5400);
  });

  it('un saldo inicial dins del període torna a començar el saldo (arqueig)', () => {
    const r = calculaRegistre(
      'CAIXA',
      [mov('CAIXA', '2026-11-04', 220, 0), mov('CAIXA', '2026-11-20', 154, 0), mov('CAIXA', '2026-11-20', 0, 4)],
      [{ id: 'a', compte: 'CAIXA', dia: '2026-11-01', import: 150 }, { id: 'b', compte: 'CAIXA', dia: '2026-11-20', import: 365 }],
      '2026-11-01',
      '2026-11-30',
    );
    expect(r.files.map((f) => [f.origen, f.saldo])).toEqual([
      ['COBRAMENT', 370],
      ['SALDO_INICIAL', 365],
      ['COBRAMENT', 519],
      ['COBRAMENT', 515],
    ]);
    expect(r.saldoFinal).toBe(515);
    // Els totals només sumen moviments, no l'arqueig.
    expect(r.totalDeure).toBe(374);
  });

  it('sense saldo inicial parteix de 0 i ho diu', () => {
    const r = calculaRegistre('CAIXA', [mov('CAIXA', '2026-11-04', 220, 0)], [], '2026-11-01', '2026-11-30');
    expect(r.ambSaldoInicial).toBe(false);
    expect(r.saldoInicial).toBe(0);
    expect(r.saldoFinal).toBe(220);
  });

  it('els moviments del mateix dia del saldo inicial hi compten', () => {
    const r = calculaRegistre('BANC', [mov('BANC', '2026-11-01', 10, 0)], saldos, '2026-11-01', '2026-11-30');
    expect(r.saldoFinal).toBe(3210);
  });
});
