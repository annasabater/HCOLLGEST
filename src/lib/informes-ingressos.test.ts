import { describe, expect, it } from 'vitest';
import { csvIngressos, informeIngressos, type IngresInforme } from './informes-ingressos';

const ing: IngresInforme[] = [
  { data: '2026-11-13', import: 250, metode: 'BIZUM', client: 'Daniel Iglesias', habitacio: '2', factura: '26012.1' },
  { data: '2026-11-04', import: 325, metode: 'EFECTIU', client: 'Branimir Cudina', habitacio: '1', factura: '26014' },
  { data: '2026-11-06', import: 325.5, metode: 'EFECTIU', client: 'Branimir Cudina', habitacio: '1', factura: '26014.1' },
  { data: '2026-11-15', import: 325, metode: 'EFECTIU', client: 'Adnan Besic', habitacio: '3', factura: null, fianca: true },
];

describe('informeIngressos', () => {
  it('sense fiances: només cobraments, per forma de cobrament (efectiu primer) i per dia', () => {
    const r = informeIngressos(ing, false);
    expect(r.perMetode.map((f) => [f.metode, f.n, f.total])).toEqual([
      ['EFECTIU', 2, 650.5],
      ['BIZUM', 1, 250],
    ]);
    expect(r.detall.map((i) => i.data)).toEqual(['2026-11-04', '2026-11-06', '2026-11-13']);
    expect(r.total).toEqual({ n: 3, cobrat: 900.5, fianca: 0, total: 900.5 });
  });

  it('amb fiances: les fiances sumen a part', () => {
    const r = informeIngressos(ing, true);
    expect(r.perMetode[0]).toEqual({ metode: 'EFECTIU', n: 3, cobrat: 650.5, fianca: 325, total: 975.5 });
    expect(r.total).toEqual({ n: 4, cobrat: 900.5, fianca: 325, total: 1225.5 });
  });

  it('CSV amb el resum i el detall', () => {
    const csv = csvIngressos(informeIngressos(ing, false), false);
    expect(csv).toContain('"Efectiu";"2";"650,50"');
    expect(csv).toContain('"04/11/2026";"Branimir Cudina";"1";"26014";"Efectiu";"325,00"');
  });
});
