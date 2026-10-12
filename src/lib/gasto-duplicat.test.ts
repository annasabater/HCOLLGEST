import { describe, expect, it } from 'vitest';
import { esDuplicat, normalitzaNumFactura } from './gasto-duplicat';

const base = { dia: '2026-07-13', import: 116.46, numFactura: '344531', proveidorId: 'p1' };

describe('normalitzaNumFactura', () => {
  it('ignora espais, guions, barres, punts i majúscules', () => {
    expect(normalitzaNumFactura('E225 - 60933542')).toBe(normalitzaNumFactura('e225-60933542'));
    expect(normalitzaNumFactura('1/2026/VTA00338')).toBe('12026vta00338');
    expect(normalitzaNumFactura(null)).toBe('');
  });
});

describe('esDuplicat', () => {
  it('mateix número i mateix proveïdor → repetida (encara que canviï l’import o la data)', () => {
    expect(esDuplicat(base, { ...base, import: 99, dia: '2026-08-01' })).toBe(true);
    expect(esDuplicat(base, { ...base, numFactura: '344 531' })).toBe(true);
  });

  it('mateix número però un altre proveïdor → no', () => {
    expect(esDuplicat(base, { ...base, proveidorId: 'p2', dia: '2026-08-01' })).toBe(false);
  });

  it('mateix número, sense proveïdor i mateix import → repetida', () => {
    expect(esDuplicat({ ...base, proveidorId: null }, { ...base, dia: '2026-09-09' })).toBe(true);
  });

  it('mateix import i mateixa data, mateix proveïdor i sense número → repetida', () => {
    expect(esDuplicat({ ...base, numFactura: null }, { ...base, numFactura: '' })).toBe(true);
  });

  it('mateix import i data però proveïdors diferents → no', () => {
    expect(esDuplicat({ ...base, numFactura: null }, { ...base, numFactura: null, proveidorId: 'p2' })).toBe(false);
  });

  it('mateix import però un altre dia i un altre número → no', () => {
    expect(esDuplicat(base, { ...base, numFactura: '344488', dia: '2026-07-14' })).toBe(false);
  });

  it('import diferent el mateix dia → no', () => {
    expect(esDuplicat({ ...base, numFactura: null }, { ...base, numFactura: null, import: 27 })).toBe(false);
  });
});
