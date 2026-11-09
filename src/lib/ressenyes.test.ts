import { describe, expect, it } from 'vitest';
import { estrelles, mouOrdre, ordenaPublicades, textCurt } from './ressenyes';

const r = (id: string, ordre: number, destacada = false, dia = 1) => ({
  id,
  ordre,
  destacada,
  dataRessenya: new Date(2026, 9, dia),
});

describe('ordenaPublicades', () => {
  it('destacades primer, després per ordre i, en empat, la més recent', () => {
    const out = ordenaPublicades([r('a', 1), r('b', 0), r('c', 5, true), r('d', 0, false, 9)]);
    expect(out.map((x) => x.id)).toEqual(['c', 'd', 'b', 'a']);
  });
});

describe('mouOrdre', () => {
  const llista = [r('x', 0, true), r('a', 0), r('b', 1), r('c', 2)];

  it('puja una posició i renumera tota la llista', () => {
    const m = mouOrdre(llista, 'c', 'AMUNT');
    expect(m && [...m.entries()]).toEqual([
      ['x', 0],
      ['a', 1],
      ['c', 2],
      ['b', 3],
    ]);
  });

  it('baixa una posició', () => {
    const m = mouOrdre(llista, 'a', 'AVALL');
    expect(m?.get('b')).toBe(1);
    expect(m?.get('a')).toBe(2);
  });

  it('no creua destacades i no destacades, ni surt dels extrems', () => {
    expect(mouOrdre(llista, 'a', 'AMUNT')).toBeNull();
    expect(mouOrdre(llista, 'x', 'AVALL')).toBeNull();
    expect(mouOrdre(llista, 'c', 'AVALL')).toBeNull();
    expect(mouOrdre(llista, 'zz', 'AMUNT')).toBeNull();
  });
});

describe('textCurt', () => {
  it('deixa igual un text curt i talla per paraula un de llarg', () => {
    expect(textCurt('  Molt   bé ')).toBe('Molt bé');
    expect(textCurt('una dues tres quatre cinc', 15)).toBe('una dues tres…');
  });
});

describe('estrelles', () => {
  it('limita a 0..5', () => {
    expect(estrelles(4)).toBe('★★★★☆');
    expect(estrelles(9)).toBe('★★★★★');
    expect(estrelles(-1)).toBe('☆☆☆☆☆');
  });
});
