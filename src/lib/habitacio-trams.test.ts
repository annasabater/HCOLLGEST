import { describe, it, expect } from 'vitest';
import { tramsHabitacio, tramsSolapats, habitacioEnData } from './habitacio-trams';

const d = (s: string) => new Date(`${s}T00:00:00Z`);

// Cas real: l'hoste entra a la 2 l'1/10 i passa a la 4 el 10/10 (sortida 31/10).
const cesar = {
  habitacioId: 'h4',
  dataEntrada: d('2026-10-01'),
  dataSortida: d('2026-10-31'),
  canvisHabitacio: [{ data: d('2026-10-10'), habitacioAnteriorId: 'h2' }],
};

describe('tramsHabitacio', () => {
  it('sense canvis: un sol tram amb tota l’estada', () => {
    expect(tramsHabitacio({ habitacioId: 'h1', dataEntrada: d('2026-10-01'), dataSortida: d('2026-10-05') })).toEqual([
      { habitacioId: 'h1', desde: d('2026-10-01'), fins: d('2026-10-05') },
    ]);
  });

  it('un canvi parteix l’estada en dos trams', () => {
    expect(tramsHabitacio(cesar)).toEqual([
      { habitacioId: 'h2', desde: d('2026-10-01'), fins: d('2026-10-10') },
      { habitacioId: 'h4', desde: d('2026-10-10'), fins: d('2026-10-31') },
    ]);
  });

  it('ordena els canvis per data i descarta trams sense nits', () => {
    const t = tramsHabitacio({
      habitacioId: 'h3',
      dataEntrada: d('2026-10-01'),
      dataSortida: d('2026-10-20'),
      canvisHabitacio: [
        { data: d('2026-10-15'), habitacioAnteriorId: 'h2' },
        { data: d('2026-10-01'), habitacioAnteriorId: 'h1' }, // canvi el mateix dia d'entrada
        { data: d('2026-10-05'), habitacioAnteriorId: 'h4' },
      ],
    });
    expect(t.map((x) => x.habitacioId)).toEqual(['h4', 'h2', 'h3']);
  });
});

describe('tramsSolapats', () => {
  it('l’habitació antiga queda lliure des del dia del canvi', () => {
    expect(tramsSolapats(cesar, d('2026-10-12'), d('2026-10-15'), { habitacioId: 'h2' })).toEqual([]);
    expect(tramsSolapats(cesar, d('2026-10-10'), d('2026-10-15'), { habitacioId: 'h2' })).toEqual([]); // rotació
    expect(tramsSolapats(cesar, d('2026-10-09'), d('2026-10-15'), { habitacioId: 'h2' })).toHaveLength(1);
  });

  it('la nova no compta abans del canvi (no xoca amb qui hi era abans)', () => {
    expect(tramsSolapats(cesar, d('2026-10-01'), d('2026-10-10'), { habitacioId: 'h4' })).toEqual([]);
    expect(tramsSolapats(cesar, d('2026-10-01'), d('2026-10-11'), { habitacioId: 'h4' })).toHaveLength(1);
  });

  it('inclusiu també compta els trams que només toquen l’extrem', () => {
    expect(tramsSolapats(cesar, d('2026-10-10'), d('2026-10-12'), { habitacioId: 'h2', inclusiu: true })).toHaveLength(1);
  });
});

describe('habitacioEnData', () => {
  it('retorna l’habitació de cada nit', () => {
    expect(habitacioEnData(cesar, d('2026-10-09'))).toBe('h2');
    expect(habitacioEnData(cesar, d('2026-10-10'))).toBe('h4');
    expect(habitacioEnData(cesar, d('2026-11-05'))).toBe('h4');
  });
});
