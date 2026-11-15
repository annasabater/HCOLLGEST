import { describe, expect, it } from 'vitest';
import { efecteAlBalanc, nitsPerMes, ocupaMesDunMes, periodesCoberts, resumNitsPerMes } from './repartiment';

describe('periodesCoberts', () => {
  // 15/10 → 15/12: 61 nits (17 oct, 30 nov, 14 des) a 10 €/nit = 610 €.
  const [e, s, total] = ['2026-10-15', '2026-12-15', 610];

  it('un pagament de tota l’estada es reparteix per les nits de cada mes', () => {
    expect(periodesCoberts(e, s, total, 0, 610)).toEqual([
      { dataInici: '2026-10-15', dataFi: '2026-10-31', nits: 17, import: 170 },
      { dataInici: '2026-11-01', dataFi: '2026-11-30', nits: 30, import: 300 },
      { dataInici: '2026-12-01', dataFi: '2026-12-14', nits: 14, import: 140 },
    ]);
  });

  it('pagaments a trossos: cadascun cobreix les nits següents', () => {
    const p1 = periodesCoberts(e, s, total, 0, 300); // 30 nits: 15/10–13/11
    expect(p1).toEqual([
      { dataInici: '2026-10-15', dataFi: '2026-10-31', nits: 17, import: 170 },
      { dataInici: '2026-11-01', dataFi: '2026-11-13', nits: 13, import: 130 },
    ]);
    const p2 = periodesCoberts(e, s, total, 300, 310); // la resta
    expect(p2).toEqual([
      { dataInici: '2026-11-14', dataFi: '2026-11-30', nits: 17, import: 170 },
      { dataInici: '2026-12-01', dataFi: '2026-12-14', nits: 14, import: 140 },
    ]);
  });

  it('un pagament d’un sol mes queda tot en aquell mes', () => {
    expect(periodesCoberts(e, s, total, 170, 300)).toEqual([
      { dataInici: '2026-11-01', dataFi: '2026-11-30', nits: 30, import: 300 },
    ]);
  });

  it('el que passa del preu va a l’última nit; la suma sempre és l’import', () => {
    const p = periodesCoberts(e, s, total, 600, 50);
    expect(p).toEqual([{ dataInici: '2026-12-14', dataFi: '2026-12-14', nits: 1, import: 50 }]);
    const q = periodesCoberts(e, s, 100, 0, 333.33);
    expect(q.reduce((a, x) => a + x.import, 0)).toBeCloseTo(333.33, 2);
  });
});

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
