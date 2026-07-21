import { describe, it, expect } from 'vitest';
import { checkDigit, findMrzLines, parseMrz, mrzToViatger, parseDniFront, dniCheckLetter } from './mrz';

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

  it('DNI espanyol: número real al camp opcional, suport (IDESP) al camp document', () => {
    // Al DNI espanyol la MRZ posa el nº de SUPORT (BAA000589) al camp "document
    // number" (pos 5-13) i el DNI/NIF real (12345678Z) al camp opcional (pos 15-29).
    const dni = [
      'IDESPBAA000589512345678Z<<<<<<',
      '8001014M3001019ESP<<<<<<<<<<<0',
      'GARCIA<LOPEZ<<JOAN<<<<<<<<<<<<',
    ];
    const r = parseMrz(dni)!;
    expect(r.valid).toBe(true);
    expect(r.numDocument).toBe('12345678Z'); // DNI/NIF real, no el suport
    expect(r.numSuport).toBe('BAA000589'); // número de suport (IDESP)
    const v = mrzToViatger(r);
    expect(v.tipusDocument).toBe('DNI_NIF');
    expect(v.numDocument).toBe('12345678Z');
    expect(v.numSuport).toBe('BAA000589');
  });
});

describe('dniCheckLetter', () => {
  it('calcula la lletra del DNI (mòdul 23)', () => {
    expect(dniCheckLetter('12345678')).toBe('Z');
    expect(dniCheckLetter('00000000')).toBe('T');
  });
});

describe('parseDniFront (cara del davant)', () => {
  const text = [
    'DOCUMENTO NACIONAL DE IDENTIDAD',
    'APELLIDOS',
    'GARCIA',
    'LOPEZ',
    'NOMBRE',
    'JUAN',
    'SEXO  M   NACIONALIDAD  ESP',
    'FECHA DE NACIMIENTO 15 03 1990',
    'VALIDEZ 01 01 2030',
    'DNI 12345678Z',
  ].join('\n');

  it('extreu document (validat), nom, cognoms, sexe i naixement', () => {
    const v = parseDniFront(text)!;
    expect(v.numDocument).toBe('12345678Z');
    expect(v.tipusDocument).toBe('DNI_NIF');
    expect(v.valid).toBe(true); // la lletra quadra
    expect(v.cognom1).toBe('Garcia');
    expect(v.cognom2).toBe('Lopez');
    expect(v.nom).toBe('Juan');
    expect(v.sexe).toBe('HOME');
    expect(v.dataNaixement).toBe('1990-03-15'); // la data més antiga
    expect(v.nacionalitat).toBe('Espanya');
  });

  it('marca valid=false si la lletra del DNI no quadra', () => {
    const v = parseDniFront('DNI 12345678A')!;
    expect(v.numDocument).toBe('12345678A');
    expect(v.valid).toBe(false);
  });

  it('detecta NIE', () => {
    const v = parseDniFront('NIE X1234567L')!;
    expect(v.tipusDocument).toBe('NIE');
    expect(v.numDocument).toBe('X1234567L');
  });

  it('retorna null si no hi ha res aprofitable', () => {
    expect(parseDniFront('text qualsevol sense dades')).toBeNull();
  });
});
