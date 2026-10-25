import { describe, it, expect } from 'vitest';
import { situacioProrroga, estatProrroga, diesEntre } from './prorroga';

const d = (iso: string) => new Date(`${iso}T00:00:00`);
const avui = d('2026-10-25');
const base = {
  dataEntrada: d('2026-10-01'),
  dataSortida: d('2026-11-12'), // 18 dies
  prorrogaEstat: null,
  prorrogaSortida: null,
  prorrogaAplacatFins: null,
};

describe('situacioProrroga', () => {
  it('surt 18 dies abans d’una estada llarga', () => {
    expect(diesEntre(avui, base.dataSortida)).toBe(18);
    expect(situacioProrroga(base, avui)).toBe('avis');
  });

  it('encara no surt 19 dies abans', () => {
    expect(situacioProrroga({ ...base, dataSortida: d('2026-11-13') }, avui)).toBeNull();
  });

  it('no surt per a estades de menys de 20 nits', () => {
    expect(situacioProrroga({ ...base, dataEntrada: d('2026-10-24'), dataSortida: d('2026-11-12') }, avui)).toBeNull();
    expect(situacioProrroga({ ...base, dataEntrada: d('2026-10-23'), dataSortida: d('2026-11-12') }, avui)).toBe('avis');
  });

  it('aplaçada fins a una data futura, i torna a sortir aquell dia', () => {
    const e = { ...base, prorrogaSortida: base.dataSortida, prorrogaAplacatFins: d('2026-10-30') };
    expect(situacioProrroga(e, avui)).toBe('aplacada');
    expect(situacioProrroga(e, d('2026-10-30'))).toBe('avis');
  });

  it('desapareix amb sí o no', () => {
    expect(situacioProrroga({ ...base, prorrogaEstat: 'SI', prorrogaSortida: base.dataSortida }, avui)).toBeNull();
    expect(situacioProrroga({ ...base, prorrogaEstat: 'NO', prorrogaSortida: base.dataSortida }, avui)).toBeNull();
  });

  it('si la sortida canvia, es torna a preguntar', () => {
    const e = { ...base, prorrogaEstat: 'SI', prorrogaSortida: d('2026-11-05') };
    expect(estatProrroga(e)).toBe('PER_PREGUNTAR');
    expect(situacioProrroga(e, avui)).toBe('avis');
  });
});
