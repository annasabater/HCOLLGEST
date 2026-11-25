import { describe, expect, it } from 'vitest';
import { ambGen, fusionaLlibre, type FilaLlibre } from './llibre-desat';

const f = (ns: string, total: number, extra: Partial<FilaLlibre> = {}): FilaLlibre => ({
  data: '01/10/2026', numeroSimple: ns, numeroFiscal: '', client: 'ANNA', periode: '', nif: '',
  base: Math.round((total / 1.1) * 100) / 100, ivaPercent: 10, iva: Math.round((total - total / 1.1) * 100) / 100, total, diposit: 0, ...extra,
});

describe('fusionaLlibre', () => {
  it('conserva el retoc fet a mà si la factura no ha canviat', () => {
    const desades = ambGen([f('26001', 100, { client: 'ANNA SL' })], [f('26001', 100)]);
    const r = fusionaLlibre(desades, [f('26001', 100)], new Set(), new Set());
    expect(r.files[0]!.client).toBe('ANNA SL');
    expect(r.canvis).toBe(0);
  });

  it('si la factura ha canviat després de desar, mana la factura', () => {
    const desades = ambGen([f('26001', 100, { client: 'ANNA SL' })], [f('26001', 100)]);
    const r = fusionaLlibre(desades, [f('26001', 150)], new Set(), new Set());
    expect(r.files[0]!.total).toBe(150);
    expect(r.files[0]!.client).toBe('ANNA');
    expect(r.files[0]).not.toHaveProperty('gen');
  });

  it('treu la fila si la factura ja no hi és, i deixa les escrites a mà', () => {
    const desades = ambGen([f('26001', 100), f('', 50, { client: 'A MÀ' })], [f('26001', 100)]);
    const r = fusionaLlibre(desades, [], new Set(), new Set());
    expect(r.files.map((x) => x.client)).toEqual(['A MÀ']);
  });

  it('afegeix les noves i les ordena per número', () => {
    const desades = ambGen([f('26002', 100)], [f('26002', 100)]);
    const r = fusionaLlibre(desades, [f('26001', 80), f('26002', 100), f('26003', 90)], new Set(['S:26001', 'S:26003']), new Set());
    expect(r.files.map((x) => x.numeroSimple)).toEqual(['26001', '26002', '26003']);
  });

  it('llibre desat antic (sense gen): només canvia si la factura s\'ha tocat després', () => {
    const r1 = fusionaLlibre([f('26001', 100)], [f('26001', 150)], new Set(), new Set());
    expect(r1.files[0]!.total).toBe(100);
    const r2 = fusionaLlibre([f('26001', 100)], [f('26001', 150)], new Set(), new Set(['S:26001']));
    expect(r2.files[0]!.total).toBe(150);
  });
});
