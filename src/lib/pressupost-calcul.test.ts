import { describe, it, expect } from 'vitest';
import { planificaHabitacions, liniesPressupost, baseDeTotal, isoMesDies } from './pressupost-calcul';

describe('isoMesDies', () => {
  it('suma dies sense salts d’hora (canvi d’horari d’octubre)', () => {
    expect(isoMesDies('2026-10-24', 2)).toBe('2026-10-26');
    expect(isoMesDies('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('planificaHabitacions', () => {
  it('5 lliure les 2 primeres nits i 6 les 2 últimes → canvi el 26', () => {
    const pla = planificaHabitacions('2026-10-24', 4, [
      { nom: '5', ocupades: new Set([2, 3]) },
      { nom: '6', ocupades: new Set([0, 1]) },
    ]);
    expect(pla).toEqual([
      { habitacio: '5', desde: '2026-10-24', fins: '2026-10-26', nits: 2 },
      { habitacio: '6', desde: '2026-10-26', fins: '2026-10-28', nits: 2 },
    ]);
  });

  it('null si una habitació està lliure tota l’estada', () => {
    expect(planificaHabitacions('2026-10-24', 2, [{ nom: '5', ocupades: new Set() }, { nom: '6', ocupades: new Set([0]) }])).toBeNull();
  });

  it('null si alguna nit no té cap habitació lliure', () => {
    expect(planificaHabitacions('2026-10-24', 1, [{ nom: '5', ocupades: new Set([0]) }, { nom: '6', ocupades: new Set([0]) }])).toBeNull();
  });

  it('tria el mínim de canvis (la que dura més)', () => {
    const pla = planificaHabitacions('2026-10-01', 5, [
      { nom: '1', ocupades: new Set([1, 2, 3, 4]) },
      { nom: '2', ocupades: new Set([4]) },
      { nom: '3', ocupades: new Set([0]) },
    ]);
    expect(pla?.map((t) => [t.habitacio, t.nits])).toEqual([['2', 4], ['3', 1]]);
  });
});

describe('baseDeTotal', () => {
  it('base + IVA 10% quadra amb el total', () => {
    for (const t of [43, 172, 620, 820, 56.5, 1234.56]) {
      const b = baseDeTotal(t);
      expect(Math.round((b + Math.round(b * 10) / 100) * 100) / 100).toBe(t);
    }
  });
});

describe('liniesPressupost', () => {
  const base = {
    tipus: 'Habitació Individual',
    entrada: '2026-10-24',
    sortida: '2026-10-28',
    nits: 4,
    total: 172,
    segments: [{ desde: '2026-10-24', fins: '2026-10-28', nits: 4, subtotal: 172 }],
    pla: [
      { habitacio: '5', desde: '2026-10-24', fins: '2026-10-26', nits: 2 },
      { habitacio: '6', desde: '2026-10-26', fins: '2026-10-28', nits: 2 },
    ],
  };

  it('sense mostrar el canvi: una línia i sense nota', () => {
    const r = liniesPressupost({ ...base, mostrarCanvi: false });
    expect(r.ivaPercent).toBe(10);
    expect(r.linies).toEqual([{ descripcio: 'Habitació Individual · del 24/10/2026 al 28/10/2026 · 4 nits', import: 156.36 }]);
    expect(r.notes).toBe('');
  });

  it('mostrant el canvi: una línia per habitació que suma la mateixa base, i nota', () => {
    const r = liniesPressupost({ ...base, mostrarCanvi: true });
    expect(r.linies.map((l) => l.descripcio)).toEqual([
      'Habitació Individual (Hab. 5) · del 24/10/2026 al 26/10/2026 · 2 nits',
      'Habitació Individual (Hab. 6) · del 26/10/2026 al 28/10/2026 · 2 nits',
    ]);
    expect(r.linies.reduce((a, l) => a + l.import, 0)).toBeCloseTo(156.36, 2);
    expect(r.notes).toContain('el 26/10/2026 (de la 5 a la 6)');
  });
});
