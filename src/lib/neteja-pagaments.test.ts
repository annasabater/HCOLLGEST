import { describe, expect, it } from 'vitest';
import { agrupaPerMes, resumeixDies, type TascaDia } from './neteja-pagaments';
import type { MovimentCompte } from './services/compte-treballador';

const mov = (p: Partial<MovimentCompte> & { id: string; dia: string }): MovimentCompte => ({
  tipus: 'NETEJA', concepte: 'Neteja', import: 60, pagat: false, pagatEl: null, hores: 0, preuHora: 0, ...p,
});
const t = (p: Partial<TascaDia> & { dia: string }): TascaDia => ({ habitacio: '2', tipus: 'REPAS', nota: null, ...p });

describe('resumeixDies', () => {
  const moviments = [
    mov({ id: 'a', dia: '2026-10-05', pagat: true, pagatEl: '2026-10-10' }),
    mov({ id: 'b', dia: '2026-11-16', import: 80 }),
    mov({ id: 'c', dia: '2026-11-16', tipus: 'BUGADERIA', import: 12 }),
  ];
  const tasques = [t({ dia: '2026-10-05' }), t({ dia: '2026-11-16', habitacio: '5', tipus: 'CANVI_COMPLET' }), t({ dia: '2026-11-16', habitacio: '3' }), t({ dia: '2026-11-16', habitacio: null })];

  it('suma jornada i bugaderia al mateix dia i ordena de l\'antic al recent', () => {
    const r = resumeixDies(moviments, tasques, new Map(), false);
    expect(r.map((d) => d.dia)).toEqual(['2026-10-05', '2026-11-16']);
    const d = r[1]!;
    expect(d.total).toBe(92);
    expect(d.bugaderia).toBe(12);
    expect(d.pendent).toBe(92);
    expect(d.pagat).toBe(0);
    expect(d.habitacions).toEqual(['3 mant.', '5 sortida', 'Zones comunes']);
    expect(d.sortides).toBe(1);
    expect(d.manteniments).toBe(1);
    expect(r[0]!.pagatEl).toBe('2026-10-10');
  });

  it('amb «només pendent» sol queda el que falta i els dies pagats desapareixen', () => {
    const r = resumeixDies(moviments, tasques, new Map(), true);
    expect(r).toHaveLength(1);
    expect(r[0]!.total).toBe(92);
  });

  it('un dia amb part pagada i part pendent queda parcial', () => {
    const r = resumeixDies([mov({ id: 'x', dia: '2026-11-02', import: 60, pagat: true, pagatEl: '2026-11-03' }), mov({ id: 'y', dia: '2026-11-02', tipus: 'BUGADERIA', import: 6 })], [], new Map(), false);
    expect(r[0]!.pagat).toBe(60);
    expect(r[0]!.pendent).toBe(6);
  });

  it('porta l\'observació del dia', () => {
    const r = resumeixDies(moviments, tasques, new Map([['2026-11-16', 'Falten tovalloles']]), false);
    expect(r[1]!.nota).toBe('Falten tovalloles');
  });
});

describe('agrupaPerMes', () => {
  it('agrupa per mes', () => {
    const dies = resumeixDies([mov({ id: '1', dia: '2026-10-05' }), mov({ id: '2', dia: '2026-10-12' }), mov({ id: '3', dia: '2026-11-02' })], [], new Map(), false);
    expect(agrupaPerMes(dies).map((m) => [m.mes, m.dies.length])).toEqual([['2026-10', 2], ['2026-11', 1]]);
  });
});
