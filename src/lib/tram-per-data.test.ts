import { describe, expect, it } from 'vitest';
import { tramPerData } from './tram-per-data';

const d = (s: string) => new Date(`${s}T12:00:00`);
// L'estada d'en César: 26009 (12/08 → 01/10) i l'ampliació 26009_1 (01/10 → 01/11).
const trams = [
  { id: '26009_1', dataEntrada: d('2026-10-01'), dataSortida: d('2026-11-01') },
  { id: '26009', dataEntrada: d('2026-08-12'), dataSortida: d('2026-10-01') },
];

describe('tramPerData', () => {
  it('la devolució del 30/10 va al tram 26009_1', () => {
    expect(tramPerData(trams, d('2026-10-30'))?.id).toBe('26009_1');
  });
  it('el dia de canvi de tram ja és del tram nou', () => {
    expect(tramPerData(trams, d('2026-10-01'))?.id).toBe('26009_1');
  });
  it('una data del primer tram es queda al primer', () => {
    expect(tramPerData(trams, d('2026-09-15'))?.id).toBe('26009');
  });
  it("després de l'últim tram (ja ha marxat) → l'últim", () => {
    expect(tramPerData(trams, d('2026-11-20'))?.id).toBe('26009_1');
  });
  it('sense trams → null', () => {
    expect(tramPerData([], d('2026-10-30'))).toBeNull();
  });
});
