import { describe, it, expect } from 'vitest';
import { checkDigit, findMrzLines, parseMrz, mrzToViatger } from './mrz';

describe('checkDigit (MRZ)', () => {
  it('calcula el dígit de control ICAO', () => {
    expect(checkDigit('520727')).toBe(3);
    expect(checkDigit('AB2134<<<')).toBe(5);
  });
});

// Vectors ICAO oficials (dígits de control vàlids).
const TD3 = [
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L898902C36UTO7408122F1204159ZE184226B<<<<<10',
];
const TD1 = [
  'I<UTOD231458907<<<<<<<<<<<<<<<',
  '7408122F1204159UTO<<<<<<<<<<<6',
  'ERIKSSON<<ANNA<MARIA<<<<<<<<<<',
];

describe('parseMrz — TD3 (passaport)', () => {
  it('extreu i valida els camps', () => {
    const r = parseMrz(TD3)!;
    expect(r.format).toBe('TD3');
    expect(r.numDocument).toBe('L898902C3');
    expect(r.cognom1).toBe('Eriksson');
    expect(r.nom).toBe('Anna Maria');
    expect(r.nacionalitat).toBe('UTO');
    expect(r.sexe).toBe('DONA');
    expect(r.dataNaixement).toBe('1974-08-12');
    expect(r.valid).toBe(true);
  });

  it('mrzToViatger marca PASSAPORT', () => {
    const v = mrzToViatger(parseMrz(TD3)!);
    expect(v.tipusDocument).toBe('PASSAPORT');
    expect(v.cognom1).toBe('Eriksson');
    expect(v.valid).toBe(true);
  });
});

describe('parseMrz — TD1 (DNI/NIE)', () => {
  it('extreu i valida els camps', () => {
    const r = parseMrz(TD1)!;
    expect(r.format).toBe('TD1');
    expect(r.numDocument).toBe('D23145890');
    expect(r.cognom1).toBe('Eriksson');
    expect(r.nom).toBe('Anna Maria');
    expect(r.dataNaixement).toBe('1974-08-12');
    expect(r.valid).toBe(true);
  });
});

describe('findMrzLines + Spanish DNI', () => {
  it('localitza les línies MRZ dins del text de l\'OCR', () => {
    const ocr = `REINO DE ESPAÑA\nDOCUMENTO NACIONAL DE IDENTIDAD\n${TD1[0]}\n${TD1[1]}\n${TD1[2]}`;
    const lines = findMrzLines(ocr);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(parseMrz(lines)?.numDocument).toBe('D23145890');
  });

  it('detecta DNI espanyol pel patró del número', () => {
    const dni = [
      'IDESPBJC123456<7<<<<<<<<<<<<<<',
      '8001011M3001017ESP<<<<<<<<<<<2',
      'ESPANYOL<GARCIA<<JOAN<<<<<<<<<<',
    ];
    const v = mrzToViatger(parseMrz(dni)!);
    expect(v.cognom1).toBe('Espanyol');
    expect(v.cognom2).toBe('Garcia');
    expect(v.nom).toBe('Joan');
    expect(v.nacionalitat).toBe('Espanya');
  });

  it('retorna null si no hi ha MRZ', () => {
    expect(parseMrz(['HOLA MON', 'SENSE MRZ'])).toBeNull();
  });
});
