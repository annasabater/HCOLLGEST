import { describe, expect, it } from 'vitest';
import { construeixSetmanes, copiaSetmana, dillunsDe, rangSencer, tipusProposat } from './neteja-planificacio';

describe('dillunsDe / rangSencer', () => {
  it('dilluns de la setmana', () => {
    expect(dillunsDe('2026-11-22')).toBe('2026-11-16'); // diumenge
    expect(dillunsDe('2026-11-23')).toBe('2026-11-23'); // dilluns
    expect(dillunsDe('2026-11-26')).toBe('2026-11-23');
  });
  it('el mes en curs arriba a final de mes (no s\'atura avui)', () => {
    expect(rangSencer({ tipus: 'mes', off: 0 }, '2026-11-22')).toEqual({ desde: '2026-11-01', fins: '2026-11-30' });
    expect(rangSencer({ tipus: 'tri', off: 0 }, '2026-11-22')).toEqual({ desde: '2026-10-01', fins: '2026-12-31' });
    expect(rangSencer({ tipus: 'per', desde: '2026-07-21', fins: '2026-11-30' }, '2026-11-22')).toEqual({ desde: '2026-07-21', fins: '2026-11-30' });
  });
});

describe('construeixSetmanes', () => {
  const base = { desde: '2026-11-16', fins: '2026-11-29', notes: [], jornades: [] };
  it('agrupa per setmanes i la feta mana sobre la planificada de la mateixa habitació', () => {
    const r = construeixSetmanes({
      ...base,
      tasques: [{ id: 't1', data: '2026-11-16', habitacioId: 'h5', habitacio: '5', tipus: 'CANVI_COMPLET', estat: 'FETA', treballadorId: 'e', notes: null, bugaderia: true }],
      plans: [
        { id: 'p1', data: '2026-11-16', habitacioId: 'h5', habitacio: '5', tipus: 'REPAS', treballadorId: 'e', nota: null },
        { id: 'p2', data: '2026-11-26', habitacioId: 'h6', habitacio: '6', tipus: 'REPAS', treballadorId: 'e', nota: 'falta un coixí' },
      ],
    });
    expect(r.map((s) => s.dilluns)).toEqual(['2026-11-16', '2026-11-23']);
    expect(r[0]!.dies[0]!.habitacions).toHaveLength(1);
    expect(r[0]!.dies[0]!.habitacions[0]!.origen).toBe('FETA');
    expect(r[0]!.dies[0]!.fet).toBe(true);
    expect(r[0]!.dies[0]!.pendent).toBe(false);
    expect(r[1]!.dies[0]!.habitacions[0]!.nota).toBe('falta un coixí');
    expect(r[1]!.dies[0]!.fet).toBe(false);
  });
  it('notes del dia i de la setmana, i l\'estat del pagament', () => {
    const r = construeixSetmanes({
      ...base,
      tasques: [{ id: 't1', data: '2026-11-19', habitacioId: 'h1', habitacio: '1', tipus: 'REPAS', estat: 'FETA', treballadorId: 'e', notes: null, bugaderia: false }],
      plans: [],
      notes: [
        { id: 'n1', data: '2026-11-19', ambit: 'DIA', text: 'Passadís' },
        { id: 'n2', data: '2026-11-16', ambit: 'SETMANA', text: 'Bugaderia dijous' },
      ],
      jornades: [{ data: '2026-11-19', pagada: false }],
    });
    expect(r[0]!.nota?.text).toBe('Bugaderia dijous');
    expect(r[0]!.dies[0]!.nota?.text).toBe('Passadís');
    expect(r[0]!.dies[0]!.pagament).toBe('PER_PAGAR');
  });
});

describe('copiaSetmana', () => {
  it('una setmana més tard, sortida només si aquell dia marxa algú, sense duplicar', () => {
    const sortides = new Set(['2026-11-30|h3']);
    const r = copiaSetmana(
      [
        { data: '2026-11-23', habitacioId: 'h3', treballadorId: 'e' },
        { data: '2026-11-23', habitacioId: 'h4', treballadorId: 'e' },
        { data: '2026-11-26', habitacioId: 'h6', treballadorId: 'e' },
      ],
      sortides,
      new Set(['2026-12-03|h6']),
    );
    expect(r).toEqual([
      { data: '2026-11-30', habitacioId: 'h3', treballadorId: 'e', tipus: 'CANVI_COMPLET' },
      { data: '2026-11-30', habitacioId: 'h4', treballadorId: 'e', tipus: 'REPAS' },
    ]);
    expect(tipusProposat('2026-11-30', 'h4', sortides)).toBe('REPAS');
  });
});
