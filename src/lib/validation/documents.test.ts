import { describe, it, expect } from 'vitest';
import { lletraDni, validaDni, validaNie, validaCodiPostal, formatWarnings } from './documents';

describe('lletraDni', () => {
  it('calcula la lletra de control', () => {
    expect(lletraDni(12345678)).toBe('Z'); // 12345678Z és vàlid
    expect(lletraDni(0)).toBe('T');
  });
});

describe('validaDni', () => {
  it('accepta DNI correctes', () => {
    expect(validaDni('12345678Z')).toBe(true);
    expect(validaDni('00000000T')).toBe(true);
  });
  it('rebutja lletra incorrecta o format dolent', () => {
    expect(validaDni('12345678A')).toBe(false);
    expect(validaDni('1234567Z')).toBe(false);
    expect(validaDni('ABCDEFGHZ')).toBe(false);
  });
});

describe('validaNie', () => {
  it('accepta NIE correctes', () => {
    expect(validaNie('X1234567L')).toBe(true); // X1234567 -> 01234567 -> L
    expect(validaNie('Z1234567R')).toBe(true); // Z1234567 -> 21234567 -> R
  });
  it('rebutja NIE incorrectes', () => {
    expect(validaNie('X1234567A')).toBe(false);
    expect(validaNie('12345678Z')).toBe(false);
  });
});

describe('validaCodiPostal', () => {
  it('5 xifres', () => {
    expect(validaCodiPostal('08001')).toBe(true);
    expect(validaCodiPostal('8001')).toBe(false);
    expect(validaCodiPostal('0800A')).toBe(false);
  });
});

describe('formatWarnings', () => {
  it('avisa de DNI incorrecte amb suggeriment de lletra', () => {
    const w = formatWarnings([{ tipusDocument: 'DNI_NIF', numDocument: '12345678A' }]);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('Z'); // suggereix la lletra correcta
  });
  it('no avisa si el DNI és correcte', () => {
    expect(formatWarnings([{ tipusDocument: 'DNI_NIF', numDocument: '12345678Z' }])).toHaveLength(0);
  });
  it('avisa de codi postal dolent a Espanya', () => {
    const w = formatWarnings([{ codiPostal: '123', pais: 'Espanya' }]);
    expect(w).toHaveLength(1);
  });
  it('no avisa de codi postal a l’estranger', () => {
    expect(formatWarnings([{ codiPostal: 'AB12', pais: 'França' }])).toHaveLength(0);
  });
});
