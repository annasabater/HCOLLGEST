import { describe, expect, it } from 'vitest';
import { construeixFull, type EstadaFull } from './ocupacio-contractes';

const est = (p: Partial<EstadaFull> & { id: string }): EstadaFull => ({
  origenId: null,
  numContracte: null,
  habitacio: '1',
  entrada: '2026-11-16',
  sortida: '2026-12-16',
  observacions: null,
  viatgers: [{ id: 'h1', nom: 'Firooz Imani', telefon: '651', esTitular: true }],
  cobraments: [],
  previstos: [],
  ...p,
});
const o = {};

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

  it('el pendent suma a l import i es veu tot l historial (també les estades acabades)', () => {
    const r = construeixFull(
      [
        est({ id: 'a', previstos: [{ import: 325, dataPrevista: '2026-12-06', pagat: false }], cobraments: [{ import: 325, data: '2026-11-17', metode: 'EFECTIU', factura: null }] }),
        est({ id: 'old', entrada: '2025-10-01', sortida: '2025-11-10' }),
      ],
      o,
    );
    expect(r).toHaveLength(2);
    expect(r.find((c) => c.clau === 'a')!.trams[0]!.import).toBe(650);
    expect(r.find((c) => c.clau === 'a')!.trams[0]!.pendents).toHaveLength(1);
  });
});

describe('construeixFull · dipòsits', () => {
  it('els dipòsits compten com a pagaments; els comptes de propietat no els veuen', () => {
    const e = est({ id: 'a', cobraments: [{ import: 650, data: '2026-10-15', metode: 'EFECTIU', factura: null, diposit: true }] });
    const r = construeixFull([e], {});
    expect(r[0]!.trams[0]!.pagaments).toEqual([{ import: 650, data: '2026-10-15', factura: null, diposit: true }]);
    expect(r[0]!.trams[0]!.import).toBe(650);
    expect(construeixFull([e], { restringit: true })[0]!.trams[0]!.pagaments).toEqual([]);
  });
});
