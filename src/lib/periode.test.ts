import { describe, it, expect } from 'vitest';
import { mesEnrere, duradaDies, periodeAnterior, ultimDiaDeMes } from './periode';

describe('ultimDiaDeMes', () => {
  it('sap els mesos de 30, 31 i 28 dies', () => {
    expect(ultimDiaDeMes(2026, 1)).toBe(31);
    expect(ultimDiaDeMes(2026, 2)).toBe(28);
    expect(ultimDiaDeMes(2026, 4)).toBe(30);
  });

  it('compta el 29 de febrer als anys de traspàs', () => {
    expect(ultimDiaDeMes(2028, 2)).toBe(29);
  });
});

describe('mesEnrere', () => {
  it('resta un mes', () => {
    expect(mesEnrere('2026-09-08')).toBe('2026-08-08');
  });

  it('passa a l’any anterior des del gener', () => {
    expect(mesEnrere('2026-01-15')).toBe('2025-12-15');
  });

  it('es queda a l’últim dia quan el mes de destí és més curt', () => {
    // El 31 de març menys un mes NO és el 3 de març.
    expect(mesEnrere('2026-03-31')).toBe('2026-02-28');
    expect(mesEnrere('2026-05-31')).toBe('2026-04-30');
    expect(mesEnrere('2028-03-30')).toBe('2028-02-29');
  });

  it('accepta restar més d’un mes', () => {
    expect(mesEnrere('2026-09-08', 3)).toBe('2026-06-08');
    expect(mesEnrere('2026-02-10', 14)).toBe('2024-12-10');
  });
});

describe('duradaDies', () => {
  it('compta els dos extrems', () => {
    expect(duradaDies('2026-09-01', '2026-09-01')).toBe(1);
    expect(duradaDies('2026-09-01', '2026-09-08')).toBe(8);
  });

  it('travessa el canvi d’hora sense perdre un dia', () => {
    // A Espanya el 25/10/2026 es canvia l'hora: si es comptés en local, sortiria 31.
    expect(duradaDies('2026-10-01', '2026-10-31')).toBe(31);
  });
});

describe('periodeAnterior', () => {
  it('fins a un mes, compara amb els mateixos dies del mes anterior', () => {
    expect(periodeAnterior('2026-09-01', '2026-09-08')).toEqual({
      desde: '2026-08-01',
      fins: '2026-08-08',
    });
  });

  it('un mes sencer es compara amb el mes sencer anterior', () => {
    expect(periodeAnterior('2026-03-01', '2026-03-31')).toEqual({
      desde: '2026-02-01',
      fins: '2026-02-28',
    });
  });

  it('més d’un mes, compara amb els mateixos dies just abans', () => {
    // Un trimestre: els 92 dies anteriors.
    expect(periodeAnterior('2026-07-01', '2026-09-30')).toEqual({
      desde: '2026-03-31',
      fins: '2026-06-30',
    });
  });

  it('el període anterior mai encavalca el que es mira', () => {
    const casos: [string, string][] = [
      ['2026-01-01', '2026-01-31'],
      ['2026-09-01', '2026-09-08'],
      ['2026-01-01', '2026-09-08'],
    ];
    for (const [desde, fins] of casos) {
      expect(periodeAnterior(desde, fins).fins < desde).toBe(true);
    }
  });
});
