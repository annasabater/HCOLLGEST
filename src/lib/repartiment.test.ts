import { describe, expect, it } from 'vitest';
import { efecteAlBalanc, nitsPerMes, ocupaMesDunMes, resumNitsPerMes } from './repartiment';

describe('efecteAlBalanc', () => {
  it('treu del mes del cobrament i ho posa a cada mes de l’estada', () => {
    const e = efecteAlBalanc([
      {
        data: '2026-10-28',
        import: 1000,
        proposta: [
          { dataInici: '2026-10-25', import: 225.81 },
          { dataInici: '2026-11-01', import: 774.19 },
        ],
      },
    ]);
    expect(e).toEqual([
      { mes: '2026-10', ara: 1000, despres: 225.81 },
      { mes: '2026-11', ara: 0, despres: 774.19 },
    ]);
  });
  it('amaga els mesos que no canvien', () => {
    const e = efecteAlBalanc([
      { data: '2026-10-01', import: 100, proposta: [{ dataInici: '2026-10-01', import: 100 }] },
    ]);
    expect(e).toEqual([]);
  });
});

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
