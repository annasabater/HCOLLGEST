import { describe, it, expect } from 'vitest';
import { computeActiuInfo } from './actiu-alerts';

const now = new Date('2026-06-21');

describe('computeActiuInfo (§5)', () => {
  it('calcula la antigüedad en años', () => {
    const r = computeActiuInfo(
      { dataCompra: new Date('2023-06-21'), estat: 'BO' },
      now,
    );
    expect(r.anysAntiguitat).toBeCloseTo(3, 0);
    expect(r.alerta).toBe(false);
  });

  it('detecta garantía próxima a vencer (≤ 30 días)', () => {
    const r = computeActiuInfo(
      { dataCompra: new Date('2024-01-01'), garantiaFins: new Date('2026-07-10'), estat: 'BO' },
      now,
    );
    expect(r.garantiaProxima).toBe(true);
    expect(r.alerta).toBe(true);
    expect(r.motiu).toMatch(/vèncer/);
  });

  it('detecta garantía vencida', () => {
    const r = computeActiuInfo(
      { dataCompra: new Date('2020-01-01'), garantiaFins: new Date('2025-01-01'), estat: 'BO' },
      now,
    );
    expect(r.garantiaVencuda).toBe(true);
    expect(r.alerta).toBe(true);
  });

  it('alerta si el estado es SUBSTITUCIO_RECOMANADA u OBSOLET', () => {
    expect(computeActiuInfo({ dataCompra: now, estat: 'SUBSTITUCIO_RECOMANADA' }, now).alerta).toBe(true);
    expect(computeActiuInfo({ dataCompra: now, estat: 'OBSOLET' }, now).alerta).toBe(true);
  });

  it('sin garantía y estado bueno → sin alerta', () => {
    const r = computeActiuInfo({ dataCompra: new Date('2025-01-01'), estat: 'NOU' }, now);
    expect(r.alerta).toBe(false);
    expect(r.motiu).toBeNull();
  });
});
