import { describe, expect, it } from 'vitest';
import {
  agrupaPerMesos,
  agrupaFiancesPerMesos,
  coincideix,
  mesosDelRang,
  normalitza,
  rangComparacio,
  suggeriments,
  totalDespeses,
  variacio,
  type DespesaFiltrable,
} from './filtre-despeses';

const g = (p: Partial<DespesaFiltrable> & { data: string; import: number }): DespesaFiltrable => ({
  descripcio: '',
  esFianca: false,
  proveidorId: null,
  categoria: { nom: 'Altres' },
  proveidor: null,
  ...p,
});

const aigua1 = g({ data: '2026-08-11', import: 243.86, proveidorId: 'gest', proveidor: { nom: 'GESTAIGUA, S.L.' }, categoria: { nom: 'Aigua' }, descripcio: 'Factura bimestral d’aigua' });
const aigua2 = g({ data: '2026-10-16', import: 252.2, proveidorId: 'gest', proveidor: { nom: 'GESTAIGUA, S.L.' }, categoria: { nom: 'Aigua' } });
const llum = g({ data: '2026-10-09', import: 145, proveidorId: 'endesa', proveidor: { nom: 'Endesa Energía' }, categoria: { nom: 'Electricitat' } });
const bugaderia = g({ data: '2026-10-20', import: 30, categoria: { nom: 'Neteja' }, descripcio: 'Bugaderia de llençols' });
const fianca = g({ data: '2026-10-01', import: 500, esFianca: true, proveidorId: 'gest', proveidor: { nom: 'GESTAIGUA, S.L.' }, categoria: { nom: 'Aigua' } });

describe('normalitza', () => {
  it('treu accents i majúscules', () => {
    expect(normalitza('  AIGÜA Calella ')).toBe('aigua calella');
  });
});

describe('coincideix', () => {
  it('sense filtres surten totes', () => {
    expect(coincideix(llum, [])).toBe(true);
  });
  it('per proveïdor, categoria o paraula', () => {
    expect(coincideix(aigua1, [{ tipus: 'PROVEIDOR', id: 'gest', nom: 'Gestaigua' }])).toBe(true);
    expect(coincideix(llum, [{ tipus: 'PROVEIDOR', id: 'gest', nom: 'Gestaigua' }])).toBe(false);
    expect(coincideix(llum, [{ tipus: 'CATEGORIA', nom: 'electricitat' }])).toBe(true);
    expect(coincideix(bugaderia, [{ tipus: 'TEXT', text: 'bugadería' }])).toBe(true);
    expect(coincideix(aigua2, [{ tipus: 'TEXT', text: 'gestaig' }])).toBe(true);
  });
  it('amb diversos filtres n’hi ha prou que en compleixi un', () => {
    const subministraments = [
      { tipus: 'CATEGORIA' as const, nom: 'Aigua' },
      { tipus: 'CATEGORIA' as const, nom: 'Electricitat' },
    ];
    expect([aigua1, llum, bugaderia].filter((x) => coincideix(x, subministraments))).toEqual([aigua1, llum]);
  });
});

describe('totals i variació', () => {
  it('les fiances no compten', () => {
    expect(totalDespeses([aigua2, fianca])).toEqual({ total: 252.2, n: 1 });
  });
  it('diferència i percentatge', () => {
    expect(variacio(252.2, 325.83)).toEqual({ diff: -73.63, pct: -22.6 });
    expect(variacio(10, 0)).toEqual({ diff: 10, pct: null });
  });
});

describe('rangComparacio', () => {
  const avui = '2026-11-22';
  it('cap', () => {
    expect(rangComparacio('CAP', { tipus: 'mes', off: 0 }, '2026-11-01', '2026-11-22', avui)).toBeNull();
  });
  it('anterior: mes en curs → mateixos dies del mes passat', () => {
    expect(rangComparacio('ANTERIOR', { tipus: 'mes', off: 0 }, '2026-11-01', '2026-11-22', avui)).toEqual({ desde: '2026-10-01', fins: '2026-10-22' });
  });
  it('anterior: rang a mà → els mateixos dies just abans', () => {
    expect(rangComparacio('ANTERIOR', { tipus: 'per', desde: '2026-10-01', fins: '2026-11-30' }, '2026-10-01', '2026-11-30', avui)).toEqual({ desde: '2026-08-01', fins: '2026-09-30' });
  });
  it('any passat', () => {
    expect(rangComparacio('ANY_PASSAT', { tipus: 'mes', off: -1 }, '2026-10-01', '2026-10-31', avui)).toEqual({ desde: '2025-10-01', fins: '2025-10-31' });
  });
  it('un altre rang, només si és vàlid', () => {
    expect(rangComparacio('RANG', { tipus: 'mes', off: 0 }, '2026-11-01', '2026-11-22', avui, { desde: '2026-01-01', fins: '2026-02-28' })).toEqual({ desde: '2026-01-01', fins: '2026-02-28' });
    expect(rangComparacio('RANG', { tipus: 'mes', off: 0 }, '2026-11-01', '2026-11-22', avui, { desde: '2026-03-01', fins: '2026-02-28' })).toBeNull();
  });
});

describe('agrupaPerMesos', () => {
  it('mesos del rang', () => {
    expect(mesosDelRang('2026-11-15', '2027-02-03')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });
  it('per mes i per bimestre (des del primer mes del rang)', () => {
    const gs = [aigua1, aigua2, fianca];
    expect(agrupaPerMesos(gs, '2026-08-01', '2026-11-30', 1).map((x) => x.import)).toEqual([243.86, 0, 252.2, 0]);
    expect(agrupaPerMesos(gs, '2026-08-01', '2026-11-30', 2)).toEqual([
      { etiqueta: 'ag. – set. 2026', import: 243.86, n: 1 },
      { etiqueta: 'oct. – nov. 2026', import: 252.2, n: 1 },
    ]);
  });
  it('no compta el que cau fora del rang', () => {
    expect(agrupaPerMesos([aigua2], '2026-10-20', '2026-10-31', 1)).toEqual([{ etiqueta: 'oct. 2026', import: 0, n: 0 }]);
  });
});

describe('agrupaFiancesPerMesos', () => {
  it('suma només les fiances, amb els mateixos grups que la despesa', () => {
    const f = { ...fianca, data: '2026-10-29T00:00:00.000Z', import: 6186.86 };
    expect(agrupaFiancesPerMesos([f, aigua2], '2026-08-01', '2026-11-30', 1)).toEqual([0, 0, 6186.86, 0]);
    expect(agrupaFiancesPerMesos([f], '2026-08-01', '2026-11-30', 2)).toEqual([0, 6186.86]);
    expect(agrupaFiancesPerMesos([f], '2026-11-01', '2026-11-30', 1)).toEqual([0]);
  });
});

describe('suggeriments', () => {
  const provs = [{ id: 'gest', nom: 'GESTAIGUA, S.L.' }, { id: 'endesa', nom: 'Endesa Energía' }, { id: 'altre', nom: 'Ferreteria' }];
  const cats = [{ nom: 'Aigua' }, { nom: 'Electricitat' }, { nom: 'Neteja' }, { nom: 'Mobiliari' }];
  it('sense text: només el que hi ha al període, de més a menys', () => {
    const s = suggeriments('', [aigua2, llum, bugaderia], provs, cats, []);
    expect(s.categories.map((c) => c.filtre)).toEqual([
      { tipus: 'CATEGORIA', nom: 'Aigua' },
      { tipus: 'CATEGORIA', nom: 'Electricitat' },
      { tipus: 'CATEGORIA', nom: 'Neteja' },
    ]);
    expect(s.proveidors.map((p) => p.import)).toEqual([252.2, 145]);
  });
  it('amb text: busca a tots, encara que no hi siguin al període; treu els ja triats', () => {
    const s = suggeriments('aig', [llum], provs, cats, [{ tipus: 'CATEGORIA', nom: 'Aigua' }]);
    expect(s.categories).toEqual([]);
    expect(s.proveidors).toEqual([{ filtre: { tipus: 'PROVEIDOR', id: 'gest', nom: 'GESTAIGUA, S.L.' }, import: 0, n: 0 }]);
  });
});
