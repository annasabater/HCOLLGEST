import { describe, it, expect } from 'vitest';
import { proposaHabitacions } from './propostes-habitacio';

// Preu per nit: doble 1 persona 590/30, individual 490/30 (regla de 3).
const PER_NIT: Record<string, number> = { DOBLE_1P: 590 / 30, INDIVIDUAL: 490 / 30 };
const preu = async (grup: string, i: number, j: number) => Math.round(PER_NIT[grup]! * (j - i) * 100) / 100;
const occ = (desde: number, fins: number) => new Set(Array.from({ length: fins - desde }, (_, k) => desde + k));

describe('proposaHabitacions', () => {
  // 26/10 → 27/11 (32 nits). Hab. 1 doble lliure; 5 individual lliure des del 09/11 (nit 14).
  const habs = [
    { nom: '1', grup: 'DOBLE_1P', ocupades: new Set<number>() },
    { nom: '2', grup: 'DOBLE_1P', ocupades: occ(0, 32) },
    { nom: '5', grup: 'INDIVIDUAL', ocupades: occ(0, 14) },
    { nom: '6', grup: 'INDIVIDUAL', ocupades: occ(0, 25) },
  ];

  it('la més barata primer: la doble fins que queda lliure la individual', async () => {
    const ps = await proposaHabitacions('2026-10-26', 32, habs, preu);
    expect(ps[0]!.trams.map((t) => [t.habitacio, t.desde, t.fins, t.nits])).toEqual([
      ['1', '2026-10-26', '2026-11-09', 14],
      ['5', '2026-11-09', '2026-11-27', 18],
    ]);
    expect(ps[0]!.total).toBe(569.33);
  });

  it('sempre hi és la millor sense canvis, i com a molt 3', async () => {
    const ps = await proposaHabitacions('2026-10-26', 32, habs, preu);
    expect(ps.length).toBe(3);
    expect(ps.some((p) => p.trams.length === 1 && p.trams[0]!.habitacio === '1')).toBe(true);
  });

  it('cap proposta si no hi ha manera de cobrir l’estada', async () => {
    const totes = [{ nom: '1', grup: 'DOBLE_1P', ocupades: occ(0, 5) }, { nom: '5', grup: 'INDIVIDUAL', ocupades: occ(3, 5) }];
    expect(await proposaHabitacions('2026-10-26', 5, totes, preu)).toEqual([]);
  });

  it('canvi entre dues habitacions ocupades a mitges', async () => {
    const dues = [{ nom: '2', grup: 'DOBLE_1P', ocupades: occ(20, 32) }, { nom: '6', grup: 'INDIVIDUAL', ocupades: occ(0, 10) }];
    const ps = await proposaHabitacions('2026-10-26', 32, dues, preu);
    // La individual és més barata: canvi tan aviat com queda lliure (nit 10).
    expect(ps[0]!.trams.map((t) => [t.habitacio, t.nits])).toEqual([['2', 10], ['6', 22]]);
  });
});
