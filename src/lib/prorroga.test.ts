import { describe, it, expect } from 'vitest';
import { situacioProrroga, estatProrroga, diesEntre, dataProposadaProrroga, situacioEstada } from './prorroga';

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

describe('estades en curs', () => {
  const b = { entrada: '2026-11-02', sortida: '2026-12-02', estat: 'PER_PREGUNTAR' as const, aplacatFins: null, teAmpliacio: false };
  it('data proposada: 18 dies abans si és llarga, 3 si és curta, mai abans de l’entrada', () => {
    expect(dataProposadaProrroga('2026-11-02', '2026-12-02')).toBe('2026-11-14');
    expect(dataProposadaProrroga('2026-11-10', '2026-11-16')).toBe('2026-11-13');
    expect(dataProposadaProrroga('2026-11-14', '2026-11-16')).toBe('2026-11-14');
  });
  it('si ja ha allargat: llarga per tota la cadena, però no abans que comenci l’ampliació', () => {
    // 15/10 → 01/12 (ampliació des del 15/11): 18 dies abans seria el 13/11 → 15/11.
    expect(dataProposadaProrroga('2026-10-15', '2026-12-01', '2026-11-15')).toBe('2026-11-15');
    expect(dataProposadaProrroga('2026-10-14', '2026-12-14', '2026-11-14')).toBe('2026-11-26');
    expect(situacioEstada({ entrada: '2026-10-15', sortida: '2026-12-01', estat: 'PER_PREGUNTAR', aplacatFins: null, teAmpliacio: false, entradaTram: '2026-11-15' }, '2026-11-13')).toBe('PER_PREGUNTAR');
  });
  it('situació', () => {
    expect(situacioEstada(b, '2026-11-13')).toBe('PER_PREGUNTAR');
    expect(situacioEstada(b, '2026-11-14')).toBe('TOCA');
    expect(situacioEstada({ ...b, estat: 'PREGUNTAT' }, '2026-11-14')).toBe('ESPERANT');
    expect(situacioEstada({ ...b, estat: 'PREGUNTAT', aplacatFins: '2026-11-17' }, '2026-11-14')).toBe('APLACAT');
    expect(situacioEstada({ ...b, estat: 'PREGUNTAT', aplacatFins: '2026-11-14' }, '2026-11-14')).toBe('ESPERANT');
    expect(situacioEstada({ ...b, estat: 'NO' }, '2026-11-14')).toBe('MARXA');
    expect(situacioEstada({ ...b, teAmpliacio: true }, '2026-11-14')).toBe('ALLARGA');
  });
});
