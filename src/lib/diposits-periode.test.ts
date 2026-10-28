import { describe, expect, it } from 'vitest';
import { importRetingutDe, importTornatDe, movimentsPeriode, type DipositBase } from './diposits-periode';

const d = (s: string) => new Date(`${s}T12:00:00`);
const T3 = { inici: new Date(2026, 6, 1), fi: new Date(2026, 8, 30, 23, 59, 59, 999) };
const T4 = { inici: new Date(2026, 9, 1), fi: new Date(2026, 11, 31, 23, 59, 59, 999) };
const T1 = { inici: new Date(2027, 0, 1), fi: new Date(2027, 2, 31, 23, 59, 59, 999) };

// El dipòsit d'en César: 150 € rebut al 3r trimestre.
const cesar = (canvis: Partial<DipositBase & { id: string }> = {}): DipositBase & { id: string } => ({
  id: 'cesar', import: 150, data: d('2026-08-12'), estat: 'EN_CUSTODIA', dataResolucio: null, importRetingut: null, ...canvis,
});

describe('movimentsPeriode: el dipòsit passa de trimestre en trimestre', () => {
  it('3r trimestre: rebut i pendent al tancament (no és ingrés)', () => {
    const m = movimentsPeriode([cesar()], T3.inici, T3.fi);
    expect(m.totals).toEqual({ anteriors: 0, rebuts: 150, tornats: 0, retinguts: 0, pendents: 150 });
  });
  it('4t trimestre sense resoldre: ve d\'abans i continua pendent', () => {
    const m = movimentsPeriode([cesar()], T4.inici, T4.fi);
    expect(m.totals).toEqual({ anteriors: 150, rebuts: 0, tornats: 0, retinguts: 0, pendents: 150 });
  });
  it('tornat al 4t: surt com a tornat, i al 3r continua pendent', () => {
    const x = cesar({ estat: 'TORNAT', dataResolucio: d('2026-10-30') });
    expect(movimentsPeriode([x], T3.inici, T3.fi).totals.pendents).toBe(150);
    expect(movimentsPeriode([x], T4.inici, T4.fi).totals).toEqual({ anteriors: 150, rebuts: 0, tornats: 150, retinguts: 0, pendents: 0 });
    expect(movimentsPeriode([x], T1.inici, T1.fi).totals.anteriors).toBe(0);
  });
  it('retingut al 4t: és ingrés del 4t', () => {
    const x = cesar({ estat: 'RETINGUT', dataResolucio: d('2026-10-30') });
    const m = movimentsPeriode([x], T4.inici, T4.fi);
    expect(m.totals).toEqual({ anteriors: 150, rebuts: 0, tornats: 0, retinguts: 150, pendents: 0 });
    expect(movimentsPeriode([x], T3.inici, T3.fi).totals.retinguts).toBe(0);
  });
  it('retenció parcial: 50 € d\'ingrés i 100 € tornats', () => {
    const x = cesar({ estat: 'RETINGUT', dataResolucio: d('2026-10-30'), importRetingut: 50 });
    expect(importRetingutDe(x)).toBe(50);
    expect(importTornatDe(x)).toBe(100);
    expect(movimentsPeriode([x], T4.inici, T4.fi).totals).toEqual({ anteriors: 150, rebuts: 0, tornats: 100, retinguts: 50, pendents: 0 });
  });
  it('diversos dipòsits a la mateixa estada, cadascun pel seu compte', () => {
    const a = cesar();
    const b = cesar({ id: 'b', import: 50, data: d('2026-11-02'), estat: 'TORNAT', dataResolucio: d('2026-11-04') });
    const m = movimentsPeriode([a, b], T4.inici, T4.fi);
    expect(m.totals).toEqual({ anteriors: 150, rebuts: 50, tornats: 50, retinguts: 0, pendents: 150 });
    expect(m.pendents.map((x) => x.id)).toEqual(['cesar']);
  });
  it('quadra: anteriors + rebuts − tornats − retinguts = pendents', () => {
    const ds = [
      cesar({ estat: 'RETINGUT', dataResolucio: d('2026-12-01'), importRetingut: 30 }),
      cesar({ id: 'x', import: 80, data: d('2026-10-05') }),
      cesar({ id: 'y', import: 40, data: d('2026-09-01'), estat: 'TORNAT', dataResolucio: d('2026-09-10') }),
    ];
    const t = movimentsPeriode(ds, T4.inici, T4.fi).totals;
    expect(t.anteriors + t.rebuts - t.tornats - t.retinguts).toBe(t.pendents);
  });
});
