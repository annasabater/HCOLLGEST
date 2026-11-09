import { describe, expect, it } from 'vitest';
import { aparellaAmbWeb, normalitzaNom, puntuacioGoogle, textOriginal } from './google-ressenyes';

describe('puntuacioGoogle', () => {
  it('converteix l’enum de Google', () => {
    expect(puntuacioGoogle('FIVE')).toBe(5);
    expect(puntuacioGoogle('ONE')).toBe(1);
    expect(puntuacioGoogle('STAR_RATING_UNSPECIFIED')).toBeNull();
    expect(puntuacioGoogle(undefined)).toBeNull();
  });
});

describe('textOriginal', () => {
  it('treu la traducció automàtica de Google i deixa l’original', () => {
    expect(textOriginal('(Translated by Google) Very clean.\n\n(Original)\nMolt net.')).toBe('Molt net.');
    expect(textOriginal('Molt net.\n\n(Translated by Google)\nVery clean.')).toBe('Molt net.');
  });
  it('deixa igual un comentari normal i torna null si és buit', () => {
    expect(textOriginal('  Hostal molt tranquil  ')).toBe('Hostal molt tranquil');
    expect(textOriginal('')).toBeNull();
    expect(textOriginal(undefined)).toBeNull();
  });
});

describe('aparellaAmbWeb', () => {
  const web = [
    { id: '1', autor: 'Andrea Barragán Soberón', puntuacio: 5 },
    { id: '2', autor: 'Mihai A.', puntuacio: 5 },
  ];
  it('troba la mateixa ressenya encara que canviïn accents o majúscules', () => {
    expect(normalitzaNom('Andrea BARRAGAN soberón')).toBe('andrea barragan soberon');
    expect(aparellaAmbWeb('andrea barragan soberon', 5, web)?.id).toBe('1');
    expect(aparellaAmbWeb('Mihai A', 5, web)?.id).toBe('2');
  });
  it('no aparella si canvien les estrelles o el nom', () => {
    expect(aparellaAmbWeb('Mihai A.', 4, web)).toBeNull();
    expect(aparellaAmbWeb('Mihai B.', 5, web)).toBeNull();
    expect(aparellaAmbWeb('', 5, web)).toBeNull();
  });
});
