import { describe, expect, it } from 'vitest';
import { nomPropi } from './nom-propi';

describe('nomPropi', () => {
  it('passa a majúscula inicial els noms tot en majúscules', () => {
    expect(nomPropi('ADNAN BESIC')).toBe('Adnan Besic');
    expect(nomPropi('DUVAN ANDRÉS DIAZ')).toBe('Duvan Andrés Diaz');
    expect(nomPropi('JEAN-PIERRE D’ARC')).toBe('Jean-Pierre D’Arc');
  });
  it('deixa com estan els que ja tenen minúscules', () => {
    expect(nomPropi('Mònica Auladell')).toBe('Mònica Auladell');
    expect(nomPropi('María de la Fuente')).toBe('María de la Fuente');
  });
  it('no toca el que no és un nom', () => {
    expect(nomPropi('26011')).toBe('26011');
    expect(nomPropi('')).toBe('');
  });
});
