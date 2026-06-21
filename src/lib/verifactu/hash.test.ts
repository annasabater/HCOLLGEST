import { describe, it, expect } from 'vitest';
import { computeHuellaAlta, buildHuellaString, formatImporte, type HuellaFields } from './hash';

const base: HuellaFields = {
  idEmisor: '40331905W',
  numSerie: 'FAC-2026-0001',
  fechaExpedicion: '21-06-2026',
  tipoFactura: 'F1',
  cuotaTotal: '12.10',
  importeTotal: '133.10',
  huellaAnterior: '',
  fechaHoraHuso: '2026-06-21T19:20:30+02:00',
};

describe('formatImporte', () => {
  it('formatea con 2 decimales y punto', () => {
    expect(formatImporte(133.1)).toBe('133.10');
    expect(formatImporte(0)).toBe('0.00');
    expect(formatImporte(-5)).toBe('-5.00');
  });
});

describe('buildHuellaString (orden AEAT)', () => {
  it('encadena los campos en el orden exacto', () => {
    const s = buildHuellaString(base);
    expect(s).toBe(
      'IDEmisorFactura=40331905W&NumSerieFactura=FAC-2026-0001&FechaExpedicionFactura=21-06-2026' +
        '&TipoFactura=F1&CuotaTotal=12.10&ImporteTotal=133.10&Huella=&FechaHoraHusoGenRegistro=2026-06-21T19:20:30+02:00',
    );
  });
});

describe('computeHuellaAlta', () => {
  it('produce SHA-256 hex en mayúsculas (64 chars)', () => {
    const h = computeHuellaAlta(base);
    expect(h).toMatch(/^[0-9A-F]{64}$/);
  });

  it('es determinista', () => {
    expect(computeHuellaAlta(base)).toBe(computeHuellaAlta({ ...base }));
  });

  it('cambia si cambia cualquier campo', () => {
    const h0 = computeHuellaAlta(base);
    expect(computeHuellaAlta({ ...base, importeTotal: '133.11' })).not.toBe(h0);
    expect(computeHuellaAlta({ ...base, tipoFactura: 'F2' })).not.toBe(h0);
  });

  it('encadena: la huella anterior afecta el resultado', () => {
    const primer = computeHuellaAlta(base);
    const segon = computeHuellaAlta({ ...base, numSerie: 'FAC-2026-0002', huellaAnterior: primer });
    const segonSenseCadena = computeHuellaAlta({ ...base, numSerie: 'FAC-2026-0002', huellaAnterior: '' });
    expect(segon).not.toBe(segonSenseCadena);
  });
});
