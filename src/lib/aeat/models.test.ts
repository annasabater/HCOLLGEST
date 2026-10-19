import { describe, it, expect } from 'vitest';
import { calc115, calc130, calc303, type TotalsTrimestre } from '../impostos';
import { netejaText, pagina, constant } from './fitxer';
import { fitxer115, fitxer130, fitxer303, tipus303, type DadesDeclarant } from './models';

const D: DadesDeclarant = {
  nif: '12345678Z',
  nom: 'Elisabeth',
  cognoms: 'Nualart Coll',
  any: 2026,
  trimestre: 3,
  formaPagament: 'U',
  iban: 'ES91 2100 0418 4502 0005 1332',
};

const totals = (ingBase: number, ingIva: number, gBase: number, gIva: number): TotalsTrimestre => ({
  ingressos: { base: ingBase, iva: ingIva, perTipus: { 10: { base: ingBase, iva: ingIva } } },
  gastos: { baseAmbIva: gBase, iva: gIva, perTipus: {}, senseIva: 0, nomines: 0 },
  lloguer: [],
});

/** Valor del camp a la posició `pos` (1-based) dins d'una pàgina. */
const camp = (s: string, pos: number, lon: number) => s.slice(pos - 1, pos - 1 + lon);

/** Separa el fitxer en capçalera i pàgines «<T…>…</T…>». */
function pagines(f: string, model: string): string[] {
  const cos = f.slice(328, f.length - 18);
  return cos.match(new RegExp(`<T${model}[0-9A-Z]{2,5}0{0,3}>.*?</T${model}[0-9A-Z]{5}>`, 'g')) ?? [];
}

describe('fitxer — utilitats', () => {
  it('neteja el text: majúscules, sense accents, conserva Ñ', () => {
    expect(netejaText('Núñez, Martí-Àlex')).toBe('NUÑEZ MARTI ALEX');
  });
  it('detecta un disseny que no quadra', () => {
    expect(() => pagina([constant(1, '<T'), constant(4, 'X')], 4)).toThrow(/no quadra/);
  });
});

describe('fitxer303 (DR303e26v101)', () => {
  const c = calc303(totals(10000, 1000, 2000, 300), { pendentAnterior: 0, ultimTrimestre: false });
  const f = fitxer303(c, D);

  it('capçalera i tancament', () => {
    expect(f.startsWith('<T303020263T0000><AUX>')).toBe(true);
    expect(camp(f, 93, 4)).toBe('HC01');
    expect(camp(f, 101, 9)).toBe('12345678Z');
    expect(camp(f, 323, 6)).toBe('</AUX>');
    expect(f.endsWith('</T303020263T0000>')).toBe(true);
  });

  it('pàgines 1, 3 i DID amb la longitud oficial', () => {
    const p = pagines(f, '303');
    expect(p.map((x) => x.length)).toEqual([1581, 1017, 823]);
  });

  it('pàgina 1: identificació i IVA al 10 %', () => {
    const [p1] = pagines(f, '303');
    expect(camp(p1!, 13, 1)).toBe('U');
    expect(camp(p1!, 14, 9)).toBe('12345678Z');
    expect(camp(p1!, 23, 80).trim()).toBe('NUALART COLL ELISABETH');
    expect(camp(p1!, 103, 6)).toBe('20263T');
    expect(camp(p1!, 287, 17)).toBe('00000000001000000'); // [04] base 10.000,00
    expect(camp(p1!, 304, 5)).toBe('01000'); // [05] 10 %
    expect(camp(p1!, 309, 17)).toBe('00000000000100000'); // [06] quota 1.000,00
    expect(camp(p1!, 713, 17)).toBe('00000000000200000'); // [28]
    expect(camp(p1!, 730, 17)).toBe('00000000000030000'); // [29]
    expect(camp(p1!, 1019, 17)).toBe('00000000000070000'); // [46] 700,00
  });

  it('pàgina 3: resultat i % atribuïble', () => {
    const [, p3] = pagines(f, '303');
    expect(camp(p3!, 216, 5)).toBe('10000'); // [65] 100,00 %
    expect(camp(p3!, 408, 17)).toBe('00000000000070000'); // [71]
  });

  it('pàgina DID amb l\'IBAN de domiciliació', () => {
    const [, , did] = pagines(f, '303');
    expect(camp(did!, 23, 34).trim()).toBe('ES9121000418450200051332');
  });

  it('negatiu: C a compensar (1T-3T), D a retornar (4T), N si és zero', () => {
    const neg = calc303(totals(1000, 100, 5000, 1050), { pendentAnterior: 0, ultimTrimestre: false });
    expect(tipus303(neg, 'U', false)).toBe('C');
    expect(tipus303(neg, 'U', true)).toBe('D');
    expect(tipus303({ '71': 0 }, 'U', false)).toBe('N');
    // A compensar: pàgina DID sense IBAN (no en cal); [71] negatiu amb «N».
    const f2 = fitxer303(neg, { ...D, iban: null });
    const p = pagines(f2, '303');
    expect(p.length).toBe(3);
    expect(camp(p[1]!, 408, 1)).toBe('N');
    expect(camp(p[1]!, 425, 1)).toBe(' ');
    expect(camp(p[2]!, 23, 34).trim()).toBe('');
  });

  it('resultat zero: tipus N i «sense activitat» marcat', () => {
    const zero = calc303(totals(0, 0, 0, 0), { pendentAnterior: 0, ultimTrimestre: false });
    const p = pagines(fitxer303(zero, { ...D, iban: null }), '303');
    expect(camp(p[0]!, 13, 1)).toBe('N');
    expect(camp(p[1]!, 425, 1)).toBe('X');
    expect(camp(p[0]!, 115, 2)).toBe('22'); // prorrata especial: NO
  });

  it('domiciliar sense IBAN vàlid dona error clar', () => {
    expect(() => fitxer303(c, { ...D, iban: '' })).toThrow(/IBAN/);
  });
});

describe('fitxer130 (DR130e15v12)', () => {
  const c = calc130({ ingressos: 30000, gastos: 10000 }, []);
  const f = fitxer130(c, { ...D, formaPagament: 'I' });
  it('una pàgina de 600 posicions amb les caselles al seu lloc', () => {
    const [p1] = pagines(f, '130');
    expect(p1!.length).toBe(600);
    expect(camp(p1!, 13, 1)).toBe('I');
    expect(camp(p1!, 23, 60).trim()).toBe('NUALART COLL');
    expect(camp(p1!, 83, 20).trim()).toBe('ELISABETH');
    expect(camp(p1!, 109, 17)).toBe('00000000003000000'); // [01]
    expect(camp(p1!, 160, 17)).toBe('00000000000400000'); // [04] 20 % de 20.000
    expect(camp(p1!, 415, 17)).toBe('00000000000400000'); // [19]
    expect(camp(p1!, 446, 34).trim()).toBe(''); // sense domiciliació
    expect(f.endsWith('</T130020263T0000>')).toBe(true);
  });
});

describe('fitxer115 (DR115e15v13)', () => {
  const c = calc115([{ nif: 'B12345678', nom: 'Lloguers SL', base: 2400, retencio: 456, percent: 19 }]);
  const f = fitxer115(c, D);
  it('una pàgina de 500 posicions, perceptors i retenció', () => {
    const [p1] = pagines(f, '115');
    expect(p1!.length).toBe(500);
    expect(camp(p1!, 109, 15)).toBe('000000000000001');
    expect(camp(p1!, 141, 17)).toBe('00000000000045600'); // [03]
    expect(camp(p1!, 206, 34).trim()).toBe('ES9121000418450200051332');
  });
});
