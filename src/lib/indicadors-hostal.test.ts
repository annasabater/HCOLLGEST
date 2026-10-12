import { describe, expect, it } from 'vitest';
import { indicadorsHostal } from './indicadors-hostal';

const base = { habitacions: 6, desde: '2026-10-01', fins: '2026-10-10', ingressosAllotjament: 0, despeses: 0 };

describe('indicadorsHostal', () => {
  it('dos contractes a la mateixa habitació no la compten dues vegades', () => {
    const r = indicadorsHostal({
      ...base,
      estades: [
        { habitacioId: 'h4', entrada: '2026-09-01', sortida: '2026-11-01' },
        { habitacioId: 'h4', entrada: '2026-09-15', sortida: '2026-10-20' },
      ],
    });
    expect(r.nitsOcupades).toBe(10);
    expect(r.nitsDisponibles).toBe(60);
    expect(r.ocupacio).toBe(17);
  });

  it('el dia de sortida no és una nit (una estada que acaba el dia 1 no compta)', () => {
    const r = indicadorsHostal({ ...base, estades: [{ habitacioId: 'h1', entrada: '2026-09-01', sortida: '2026-10-01' }] });
    expect(r.nitsOcupades).toBe(0);
  });

  it('mai passa del 100%', () => {
    const estades = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].flatMap((h) => [
      { habitacioId: h, entrada: '2026-09-01', sortida: '2026-12-01' },
      { habitacioId: h, entrada: '2026-10-01', sortida: '2026-10-11' },
    ]);
    expect(indicadorsHostal({ ...base, estades }).ocupacio).toBe(100);
  });

  it('preu, cost i benefici per nit ocupada', () => {
    const r = indicadorsHostal({
      ...base,
      ingressosAllotjament: 300,
      despeses: 100,
      estades: [{ habitacioId: 'h2', entrada: '2026-10-01', sortida: '2026-10-11' }],
    });
    expect(r.preuMitjaNit).toBe(30);
    expect(r.costPerNit).toBe(10);
    expect(r.beneficiPerNit).toBe(20);
  });

  it('durada mitjana: nits totals de cada estada, encara que surti del període', () => {
    const r = indicadorsHostal({
      ...base,
      estades: [
        { habitacioId: 'h1', entrada: '2026-09-01', sortida: '2026-10-01' }, // 30 nits
        { habitacioId: 'h2', entrada: '2026-10-05', sortida: '2026-10-15' }, // 10 nits
      ],
    });
    expect(r.duradaMitjana).toBe(20);
  });

  it('sense nits ocupades no divideix per zero', () => {
    const r = indicadorsHostal({ ...base, ingressosAllotjament: 50, estades: [] });
    expect(r).toMatchObject({ ocupacio: 0, preuMitjaNit: 0, costPerNit: 0, beneficiPerNit: 0, duradaMitjana: 0 });
  });
});
