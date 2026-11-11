import { describe, expect, it } from 'vitest';
import { nitsPerMes, ocupaMesDunMes, resumNitsPerMes } from './repartiment';

describe('nitsPerMes', () => {
  it('compta les nits de cada mes (la sortida no és nit)', () => {
    expect(nitsPerMes('2026-10-25', '2026-11-25')).toEqual([
      { mes: '2026-10', nits: 7 },
      { mes: '2026-11', nits: 24 },
    ]);
  });
  it('una estada que surt el dia 1 no ocupa el mes següent', () => {
    expect(nitsPerMes('2026-10-20', '2026-11-01')).toEqual([{ mes: '2026-10', nits: 12 }]);
    expect(ocupaMesDunMes('2026-10-20', '2026-11-01')).toBe(false);
  });
  it('travessa canvi d’any', () => {
    expect(nitsPerMes('2026-12-30', '2027-01-02')).toEqual([
      { mes: '2026-12', nits: 2 },
      { mes: '2027-01', nits: 1 },
    ]);
  });
  it('dates buides o al revés: cap nit', () => {
    expect(nitsPerMes('2026-11-05', '2026-11-05')).toEqual([]);
    expect(nitsPerMes('', '2026-11-05')).toEqual([]);
  });
});

describe('resumNitsPerMes', () => {
  it('text curt per a la llista', () => {
    expect(resumNitsPerMes('2026-10-25', '2026-11-25')).toBe('oct 7 nits · nov 24 nits');
    expect(resumNitsPerMes('2026-10-31', '2026-11-02')).toBe('oct 1 nit · nov 1 nit');
  });
});
