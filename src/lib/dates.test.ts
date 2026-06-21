import { describe, it, expect } from 'vitest';
import { ageAt, isMenor, nights, toISODate, startOfWeekMonday, weekDays, addDays } from './dates';

describe('ageAt', () => {
  it('calcula años cumplidos', () => {
    expect(ageAt(new Date('2000-06-21'), new Date('2026-06-21'))).toBe(26);
    expect(ageAt(new Date('2000-06-22'), new Date('2026-06-21'))).toBe(25); // aún no cumple
  });
});

describe('isMenor (§2.3, menor de 14)', () => {
  it('detecta menores de 14 en la fecha de entrada', () => {
    expect(isMenor(new Date('2015-01-01'), new Date('2026-07-01'))).toBe(true); // 11
    expect(isMenor(new Date('2010-01-01'), new Date('2026-07-01'))).toBe(false); // 16
  });
  it('sin fecha de nacimiento → no es menor', () => {
    expect(isMenor(null, new Date('2026-07-01'))).toBe(false);
  });
});

describe('nights', () => {
  it('cuenta las noches entre entrada y salida', () => {
    expect(nights(new Date('2026-07-01'), new Date('2026-07-05'))).toBe(4);
    expect(nights(new Date('2026-07-01'), new Date('2026-07-01'))).toBe(0);
  });
});

describe('helpers de calendario', () => {
  it('toISODate formatea YYYY-MM-DD local', () => {
    expect(toISODate(new Date(2026, 5, 21))).toBe('2026-06-21');
  });
  it('addDays suma días', () => {
    expect(toISODate(addDays(new Date(2026, 5, 21), 3))).toBe('2026-06-24');
  });
  it('startOfWeekMonday devuelve el lunes', () => {
    // 2026-06-21 es domingo → lunes de su semana es 2026-06-15
    expect(toISODate(startOfWeekMonday(new Date(2026, 5, 21)))).toBe('2026-06-15');
    // 2026-06-15 es lunes → se mantiene
    expect(toISODate(startOfWeekMonday(new Date(2026, 5, 15)))).toBe('2026-06-15');
  });
  it('weekDays devuelve 7 días lunes→domingo', () => {
    const days = weekDays(new Date(2026, 5, 21)).map(toISODate);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-06-15');
    expect(days[6]).toBe('2026-06-21');
  });
});
