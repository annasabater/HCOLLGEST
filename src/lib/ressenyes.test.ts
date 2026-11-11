import { describe, expect, it } from 'vitest';
import {
  dataRessenyaText,
  estrelles,
  ordenaPublicades,
  parseTraduccions,
  textCurt,
} from './ressenyes';

describe('parseTraduccions', () => {
  it('accepta només si hi són els 4 idiomes amb text', () => {
    const ok = { es: 'Hola', ca: 'Hola', en: 'Hi', fr: 'Salut' };
    expect(parseTraduccions(ok)).toEqual(ok);
    expect(parseTraduccions({ ...ok, fr: '' })).toBeNull();
    expect(parseTraduccions({ es: 'Hola' })).toBeNull();
    expect(parseTraduccions(null)).toBeNull();
    expect(parseTraduccions(['es'])).toBeNull();
  });
});

const r = (id: string, dia: number, destacada = false) => ({
  id,
  destacada,
  dataRessenya: new Date(2026, 9, dia),
});

describe('ordenaPublicades', () => {
  it('de la més nova a la més antiga', () => {
    const out = ordenaPublicades([r('a', 3), r('b', 20), r('c', 9)]);
    expect(out.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('les destacades van davant encara que siguin més antigues', () => {
    const out = ordenaPublicades([r('a', 3), r('vella', 1, true), r('b', 20)]);
    expect(out.map((x) => x.id)).toEqual(['vella', 'b', 'a']);
  });
});

describe('textCurt', () => {
  it('deixa igual un text curt i talla per paraula un de llarg', () => {
    expect(textCurt('  Molt   bé ')).toBe('Molt bé');
    expect(textCurt('una dues tres quatre cinc', 15)).toBe('una dues tres…');
  });
});

describe('dataRessenyaText', () => {
  it('no inventa dia ni mes si no se saben', () => {
    expect(dataRessenyaText('2025-01-01T00:00:00Z', 'ANY')).toBe('2025');
    expect(dataRessenyaText('2026-05-01T00:00:00Z', 'MES')).toMatch(/maig.*2026/);
    expect(dataRessenyaText('2026-05-12T00:00:00Z', 'DIA')).toBe('12/05/2026');
  });
});

describe('estrelles', () => {
  it('limita a 0..5', () => {
    expect(estrelles(4)).toBe('★★★★☆');
    expect(estrelles(9)).toBe('★★★★★');
    expect(estrelles(-1)).toBe('☆☆☆☆☆');
  });
});
