import { describe, expect, it } from 'vitest';
import { construeixFull, type EstadaFull } from './ocupacio-contractes';

const est = (p: Partial<EstadaFull> & { id: string }): EstadaFull => ({
  origenId: null,
  numContracte: null,
  habitacio: '1',
  entrada: '2026-11-16',
  sortida: '2026-12-16',
  observacions: null,
  viatgers: [{ nom: 'Firooz Imani', telefon: '651', esTitular: true }],
  cobraments: [],
  previstos: [],
  ...p,
});
const o = { desde: '2026-11-22', fins: '2027-01-31', avui: '2026-11-22' };

describe('construeixFull', () => {
  it('l\'ampliació va dins del mateix contracte i el nom surt un sol cop', () => {
    const r = construeixFull(
      [
        est({ id: 'a', numContracte: '26014', cobraments: [{ import: 325, data: '2026-11-04', metode: 'EFECTIU', factura: '26014' }] }),
        est({ id: 'b', origenId: 'a', numContracte: '26014_1', entrada: '2026-12-16', sortida: '2027-01-16' }),
      ],
      o,
    );
    expect(r).toHaveLength(1);
    expect(r[0]!.numero).toBe('26014');
    expect(r[0]!.persones).toHaveLength(1);
    expect(r[0]!.trams).toHaveLength(2);
  });

  it('el pagament surt sempre; la factura només si en té', () => {
    const r = construeixFull(
      [est({ id: 'a', cobraments: [{ import: 400, data: '2026-11-01', metode: 'EFECTIU', factura: null }, { import: 250, data: '2026-11-13', metode: 'BIZUM', factura: '26012.1' }] })],
      o,
    );
    expect(r[0]!.trams[0]!.pagaments).toEqual([
      { import: 400, data: '2026-11-01', factura: null },
      { import: 250, data: '2026-11-13', factura: '26012.1' },
    ]);
    expect(r[0]!.trams[0]!.import).toBe(650);
  });

  it('sense contracte va al final de la mateixa llista; amb contracte, per número', () => {
    const r = construeixFull(
      [est({ id: 's' }), est({ id: 'b', numContracte: '26013' }), est({ id: 'a', numContracte: '26011' })],
      o,
    );
    expect(r.map((c) => c.numero)).toEqual(['26011', '26013', null]);
  });

  it('el pendent suma a l\'import i les estades acabades s\'amaguen', () => {
    const r = construeixFull(
      [
        est({ id: 'a', previstos: [{ import: 325, dataPrevista: '2026-12-06', pagat: false }], cobraments: [{ import: 325, data: '2026-11-17', metode: 'EFECTIU', factura: null }] }),
        est({ id: 'old', entrada: '2026-10-01', sortida: '2026-11-10' }),
      ],
      o,
    );
    expect(r).toHaveLength(1);
    expect(r[0]!.trams[0]!.import).toBe(650);
    expect(r[0]!.trams[0]!.pendents).toHaveLength(1);
  });
});
