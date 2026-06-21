import { describe, it, expect } from 'vitest';
import { computeFacturaTotals, round2 } from './factura-calc';

describe('round2', () => {
  it('redondea a 2 decimales', () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(10.004)).toBe(10);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe('computeFacturaTotals (§3)', () => {
  it('suma líneas, aplica IVA y tasa turística', () => {
    // 2 líneas = 100 € base; IVA 10% = 10; tasa = 4 nits × 2 pers × 1.50 = 12
    const r = computeFacturaTotals({
      linies: [{ import: 80 }, { import: 20 }],
      ivaPercent: 10,
      nits: 4,
      persones: 2,
      ieet: 1.5,
      aplicarTasa: true,
    });
    expect(r.base).toBe(100);
    expect(r.iva).toBe(10);
    expect(r.tasaTotal).toBe(12);
    expect(r.total).toBe(122);
  });

  it('no aplica tasa si aplicarTasa=false', () => {
    const r = computeFacturaTotals({
      linies: [{ import: 100 }],
      ivaPercent: 10,
      nits: 3,
      persones: 2,
      ieet: 1.5,
      aplicarTasa: false,
    });
    expect(r.tasaTotal).toBe(0);
    expect(r.total).toBe(110);
  });

  it('no aplica tasa si IEET = 0 (no configurada §9.7)', () => {
    const r = computeFacturaTotals({
      linies: [{ import: 50 }],
      ivaPercent: 10,
      nits: 2,
      persones: 1,
      ieet: 0,
      aplicarTasa: true,
    });
    expect(r.tasaTotal).toBe(0);
    expect(r.total).toBe(55);
  });

  it('un descompte (import negatiu) resta de la base', () => {
    const r = computeFacturaTotals({
      linies: [{ import: 100 }, { import: -20 }],
      ivaPercent: 10,
      nits: 0,
      persones: 0,
      ieet: 0,
      aplicarTasa: true,
    });
    expect(r.base).toBe(80);
    expect(r.iva).toBe(8);
    expect(r.total).toBe(88);
  });
});
