import { describe, expect, it } from 'vitest';
import { campsIva, liniesIva, totalDeLinies } from './gasto-iva';

// Factura real de Gestaigua: aigua 10%, conservació 21% i cànon ACA no subjecte.
const GESTAIGUA = [
  { base: 147.17, ivaPercent: 10 },
  { base: 1.24, ivaPercent: 21 },
  { base: 80.47, ivaPercent: 0 },
];

describe('liniesIva', () => {
  it('usa el desglossament quan té diverses línies', () => {
    const l = liniesIva({ import: 243.86, baseImposable: 228.88, desglossamentIva: GESTAIGUA });
    expect(l.map((x) => x.iva)).toEqual([14.72, 0.26, 0]);
    expect(totalDeLinies(l)).toBe(243.86);
  });
  it('una sola base i % → una línia', () => {
    expect(liniesIva({ import: 279, baseImposable: '230.58', ivaPercent: '21' })).toEqual([{ base: 230.58, ivaPercent: 21, iva: 48.42 }]);
  });
  it('sense base → es dedueix del total al 21% inclòs', () => {
    expect(liniesIva({ import: 12.1 })).toEqual([{ base: 10, ivaPercent: 21, iva: 2.1 }]);
  });
  it('un desglossament d’una sola línia no compta com a desglossament', () => {
    expect(liniesIva({ import: 12.1, desglossamentIva: [{ base: 1, ivaPercent: 10 }] })[0]!.ivaPercent).toBe(21);
  });
});

describe('totalDeLinies', () => {
  it('resta l’IRPF de la base (lloguer)', () => {
    expect(totalDeLinies([{ base: 816.67, ivaPercent: 21 }], 19)).toBe(833);
  });
});

describe('campsIva', () => {
  it('2+ línies → desglossament i base total', () => {
    expect(campsIva(GESTAIGUA)).toEqual({ baseImposable: 228.88, ivaPercent: null, desglossamentIva: GESTAIGUA });
  });
  it('1 línia → camps simples', () => {
    expect(campsIva([{ base: 25.7, ivaPercent: 21 }])).toEqual({ baseImposable: 25.7, ivaPercent: 21, desglossamentIva: null });
  });
  it('cap línia amb base → null (no toca res)', () => {
    expect(campsIva([{ base: 0, ivaPercent: 21 }])).toBeNull();
  });
});
