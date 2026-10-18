import { describe, expect, it } from 'vitest';
import {
  agrupaPerceptors, calc100, calc115, calc130, calc180, calc303, calc390, concepte100, pendentDespres303, termini,
  type TotalsTrimestre,
} from './impostos';

// Xifres reals de 2026 (llibre d'IVA del gestio).
const T2: TotalsTrimestre = {
  ingressos: { base: 2161.85, iva: 216.19, perTipus: { 10: { base: 2161.85, iva: 216.19 } } },
  gastos: { baseAmbIva: 17.56, iva: 3.69, perTipus: { 21: { base: 17.56, iva: 3.69 } }, senseIva: 0, nomines: 0 },
  lloguer: [],
};
const T3: TotalsTrimestre = {
  ingressos: { base: 10719.09, iva: 1071.9, perTipus: { 10: { base: 10719.09, iva: 1071.9 } } },
  gastos: {
    baseAmbIva: 5341.98, iva: 1105.63,
    perTipus: { 10: { base: 147.17, iva: 14.72 }, 21: { base: 5194.81, iva: 1090.91 } },
    senseIva: 157.46, nomines: 0,
  },
  lloguer: [
    { nif: '00000000T', nom: 'Rosa Coll Villa', base: 353.89, retencio: 67.24, percent: 19 },
    { nif: '00000000T', nom: 'Rosa Coll Villa', base: 816.67, retencio: 155.17, percent: 19 },
    { nif: '00000000T', nom: 'Rosa Coll Villa', base: 816.67, retencio: 155.17, percent: 19 },
    { nif: '00000000T', nom: 'Rosa Coll Villa', base: 816.67, retencio: 155.17, percent: 19 },
  ],
};

describe('calc303', () => {
  it('2T: 212,50 a ingressar', () => {
    const c = calc303(T2, { pendentAnterior: 0, ultimTrimestre: false });
    expect(c['04']).toBe(2161.85);
    expect(c['06']).toBe(216.19);
    expect(c['28']).toBe(17.56);
    expect(c['29']).toBe(3.69);
    expect(c['71']).toBe(212.5);
    expect(c['72']).toBeUndefined();
  });

  it('3T: només el trimestre, −33,73 a compensar (72); gastos sense IVA fora de la 28', () => {
    const c = calc303(T3, { pendentAnterior: 0, ultimTrimestre: false });
    expect(c['04']).toBe(10719.09);
    expect(c['27']).toBe(1071.9);
    expect(c['28']).toBe(5341.98);
    expect(c['45']).toBe(1105.63);
    expect(c['46']).toBe(-33.73);
    expect(c['71']).toBe(-33.73);
    expect(c['72']).toBe(33.73);
    expect(pendentDespres303(c)).toBe(33.73);
  });

  it('aplica la quota a compensar anterior només fins a 0 (casella 78) i deixa la resta a la 87', () => {
    const c = calc303(T2, { pendentAnterior: 300, ultimTrimestre: false });
    expect(c['110']).toBe(300);
    expect(c['78']).toBe(212.5);
    expect(c['87']).toBe(87.5);
    expect(c['71']).toBe(0);
  });

  it('4T negatiu: a retornar (73), no a compensar', () => {
    const c = calc303(T3, { pendentAnterior: 0, ultimTrimestre: true });
    expect(c['73']).toBe(33.73);
    expect(c['72']).toBeUndefined();
  });
});

describe('calc130 (acumulat)', () => {
  it('2T: 20 % del rendiment', () => {
    const c = calc130({ ingressos: 2161.85, gastos: 17.56 }, []);
    expect(c['03']).toBe(2144.29);
    expect(c['07']).toBe(428.86);
    expect(c['19']).toBe(428.86);
  });

  it('3T: acumula 2T + 3T i resta el 07 del 2T → 1.043,93', () => {
    const gastos3 = T3.gastos.baseAmbIva + T3.gastos.senseIva + T3.gastos.nomines;
    const c = calc130(
      { ingressos: 2161.85 + 10719.09, gastos: 17.56 + gastos3 },
      [{ c07: 428.86, c16: 0, c19: 428.86, c15: 0 }],
    );
    expect(c['01']).toBe(12880.94);
    expect(c['02']).toBe(5517);
    expect(c['03']).toBe(7363.94);
    expect(c['04']).toBe(1472.79);
    expect(c['05']).toBe(428.86);
    expect(c['07']).toBe(1043.93);
    expect(c['19']).toBe(1043.93);
  });

  it('rendiment negatiu → 04 = 0 i 12 = 0', () => {
    const c = calc130({ ingressos: 100, gastos: 500 }, []);
    expect(c['04']).toBe(0);
    expect(c['12']).toBe(0);
    expect(c['19']).toBe(0);
  });
});

describe('calc115 / calc180', () => {
  it('3T: 1 perceptor, base 2.803,90, retencions 532,75', () => {
    const c = calc115(agrupaPerceptors(T3.lloguer));
    expect(c['01']).toBe(1);
    expect(c['02']).toBe(2803.9);
    expect(c['03']).toBe(532.75);
    expect(c['05']).toBe(532.75);
  });

  it('180 suma tot l’any per perceptor', () => {
    const c = calc180(agrupaPerceptors([...T3.lloguer, { nif: '00000000T', nom: 'Rosa Coll Villa', base: 816.67, retencio: 155.17, percent: 19 }]));
    expect(c['01']).toBe(1);
    expect(c['03']).toBe(687.92);
  });
});

describe('calc390', () => {
  it('suma els 303 de l’any per tipus', () => {
    const c303_2 = calc303(T2, { pendentAnterior: 0, ultimTrimestre: false });
    const c303_3 = calc303(T3, { pendentAnterior: 0, ultimTrimestre: false });
    const c = calc390([{ totals: T2, c303: c303_2 }, { totals: T3, c303: c303_3 }]);
    expect(c['03']).toBe(12880.94);
    expect(c['04']).toBe(1288.09);
    expect(c['47']).toBe(1288.09);
    expect(c['605']).toBe(5212.37);
    expect(c['606']).toBe(1094.6);
    expect(c['603']).toBe(147.17);
    expect(c['49']).toBe(1109.32);
    expect(c['65']).toBe(178.77);
    expect(c['95']).toBe(212.5);
    expect(c['97']).toBe(33.73);
    expect(c['108']).toBe(12880.94);
  });
});

describe('calc100', () => {
  it('5 % de difícil justificació i 20 % per inici d’activitat', () => {
    const r = calc100({ ingressos: 20000, gastos: { arrendaments: 6000, subministraments: 1000, altres: 1000 }, pagamentsFraccionats: 1472.79, iniciActivitat: true });
    expect(r.totalGastos).toBe(8000);
    expect(r.diferencia).toBe(12000);
    expect(r.dificilJustificacio).toBe(600);
    expect(r.rendimentNet).toBe(11400);
    expect(r.reduccioInici).toBe(2280);
    expect(r.rendimentNetReduit).toBe(9120);
  });

  it('la difícil justificació no passa de 2.000 €', () => {
    expect(calc100({ ingressos: 100000, gastos: {}, pagamentsFraccionats: 0, iniciActivitat: false }).dificilJustificacio).toBe(2000);
  });

  it('categories del gestio → conceptes de la renda', () => {
    expect(concepte100('Lloguer')).toBe('arrendaments');
    expect(concepte100('Autònoms')).toBe('ssTitular');
    expect(concepte100('Electricitat')).toBe('subministraments');
    expect(concepte100('Mobiliari')).toBe('altres');
  });
});

describe('termini', () => {
  it('3T 2026: 20 d’octubre (dimarts)', () => expect(termini('303', 2026, 3)).toBe('2026-10-20'));
  it('4T: 303/130 el 30 de gener (dissabte → dilluns 1/2), 115 el 20', () => {
    expect(termini('130', 2026, 4)).toBe('2027-02-01');
    expect(termini('115', 2026, 4)).toBe('2027-01-20');
  });
  it('cap de setmana → dilluns', () => expect(termini('303', 2026, 2)).toBe('2026-07-20'));
  it('390 i 180', () => {
    expect(termini('390', 2026, 0)).toBe('2027-02-01'); // 30/01/2027 és dissabte
    expect(termini('180', 2026, 0)).toBe('2027-02-01'); // 31/01/2027 és diumenge
  });
});

describe('vigilància del BOE', () => {
  it('detecta els models vigilats al títol', async () => {
    const { modelsDelTitol } = await import('./boe-formularis');
    expect(modelsDelTitol('Orden HAC/27/2026, por la que se modifican ... el modelo 303 Impuesto sobre el Valor Añadido ... el modelo 390 de Declaración-resumen anual')).toEqual(['303', '390']);
    expect(modelsDelTitol('Orden por la que se aprueba el modelo 100 de declaración del IRPF, ejercicio 2026')).toEqual(['100']);
    expect(modelsDelTitol('Real Decreto 1303/2026 de subvenciones')).toEqual([]);
    expect(modelsDelTitol('Orden sobre modelos 1303 y 2390')).toEqual([]);
  });
});
