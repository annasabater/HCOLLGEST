import { describe, expect, it } from 'vitest';
import { periodeDelText } from './periode-factura';

describe('periodeDelText', () => {
  it('llegeix el període de la línia de la factura', () => {
    expect(periodeDelText('Habitació individual · Del 01/09/2026 al 01/10/2026\nA compte de l´import')).toBe(
      '01/09/26 - 01/10/26',
    );
  });
  it('normalitza dies/mesos d’una xifra i barres repetides', () => {
    expect(periodeDelText('Habitació doble · Del 01/09/2026 al 1/10//2026')).toBe('01/09/26 - 01/10/26');
  });
  it('accepta any de dues xifres', () => {
    expect(periodeDelText('Del 9/8/26 al 9/9/26')).toBe('09/08/26 - 09/09/26');
  });
  it('null si el text no porta període', () => {
    expect(periodeDelText('Reducción de factura simplificada Nº26001.')).toBeNull();
  });
});
