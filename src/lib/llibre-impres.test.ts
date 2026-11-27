import { describe, it, expect } from 'vitest';
import { llibrePerImprimir } from './llibre-impres';

const base = { llibreImpresEl: null, esBorrany: false, estat: 'EN_CURS', deletedAt: null };

describe('llibrePerImprimir', () => {
  it('una estada nova (o ampliació) sense marcar és per imprimir', () => {
    expect(llibrePerImprimir(base)).toBe(true);
    expect(llibrePerImprimir({ ...base, estat: 'RESERVA' })).toBe(true);
  });

  it('un cop marcada com a impresa, ja no', () => {
    expect(llibrePerImprimir({ ...base, llibreImpresEl: new Date('2026-11-27') })).toBe(false);
    expect(llibrePerImprimir({ ...base, llibreImpresEl: '2026-11-27T10:00:00.000Z' })).toBe(false);
  });

  it('els esborranys també compten (com qualsevol estada)', () => {
    expect(llibrePerImprimir({ ...base, esBorrany: true })).toBe(true);
  });

  it('cancel·lades i eliminades no compten', () => {
    expect(llibrePerImprimir({ ...base, estat: 'CANCELLADA' })).toBe(false);
    expect(llibrePerImprimir({ ...base, deletedAt: new Date() })).toBe(false);
  });
});
