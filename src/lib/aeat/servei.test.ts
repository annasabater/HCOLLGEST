import { describe, it, expect } from 'vitest';
import { cosPresentacio, llegeixPresentacio, llegeixValidacio } from './servei';

describe('llegeixValidacio (ServValiDos)', () => {
  it('resposta real amb PDF (claus en minúscules)', () => {
    const r = llegeixValidacio({ respuesta: { pdf: ['JVBERi0xLjQK', 'AAAA'] } });
    expect(r.ok).toBe(true);
    expect(r.pdfBase64).toBe('JVBERi0xLjQKAAAA');
    expect(r.errors).toEqual([]);
  });

  it('format de l’especificació (majúscules) amb avisos', () => {
    const r = llegeixValidacio({ RESPUESTA: { AVISOS: ['7113 - AVISO: …'], PDF: ['JVBERi'] } });
    expect(r.ok).toBe(true);
    expect(r.avisos).toEqual(['7113 - AVISO: …']);
  });

  it('resposta real d’error', () => {
    const r = llegeixValidacio({ respuesta: { errores: ['E010072 - Declarante no identificado.'] } });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual(['E010072 - Declarante no identificado.']);
  });

  it('resposta buida o estranya no és vàlida', () => {
    expect(llegeixValidacio(null).ok).toBe(false);
  });
});

describe('PresBasicaDos', () => {
  it('cos de la petició segons l’especificació v30', () => {
    const cos = JSON.parse(cosPresentacio({
      model: '303', any: 2026, periode: '3T', fitxer: '<T3030…>\r\n',
      nifPresentador: '38835174l', nomPresentador: 'Nualart Coll Elisabeth',
    }));
    expect(cos).toEqual({
      MODELO: '303', EJERCICIO: '2026', PERIODO: '3T', NRC: '', IDI: 'CA',
      F01: '<T3030…>', FIR: 'FirmaBasica', FIRNIF: '38835174L', FIRNOMBRE: 'NUALART COLL ELISABETH',
    });
  });

  it('resposta correcta de l’especificació (amb l’espai al final de la clau del CSV)', () => {
    const r = llegeixPresentacio({
      respuesta: {
        correcta: {
          'CodigoSeguroVerificacion ': 'AAAAAAAAAAAAAAAA',
          Fecha: '2020-09-03', Hora: '14:04', Expediente: '2020111111111111',
          TipoRepresentacion: 'Nombre propio', Justificante: '9999999999999',
          FormaPago: 'U', ImporteAIngresar: '700.00',
          urlPdf: 'https://www2.agenciatributaria.gob.es/wlpl/x',
          avisos: ['20932 - Verifique…'],
        },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.csv).toBe('AAAAAAAAAAAAAAAA');
    expect(r.justificant).toBe('9999999999999');
    expect(r.importAIngressar).toBe(700);
    expect(r.avisos).toEqual(['20932 - Verifique…']);
  });

  it('resposta d’error', () => {
    const r = llegeixPresentacio({ respuesta: { errores: ['E00 - Error.  Código de error: E00000000000C'] } });
    expect(r.ok).toBe(false);
    expect(r.csv).toBeUndefined();
    expect(r.errors).toHaveLength(1);
  });

  it('sense CSV no es dona mai per presentada', () => {
    const r = llegeixPresentacio({ respuesta: { correcta: { Justificante: '123' } } });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/codi segur/);
  });
});
