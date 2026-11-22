import { describe, expect, it } from 'vitest';
import { agrupaDespeses, csvInforme, type DespesaInforme } from './informes-despeses';

const g = (p: Partial<DespesaInforme> & { import: number }): DespesaInforme => ({
  esFianca: false,
  proveidor: null,
  categoria: { nom: 'Altres' },
  ...p,
});

const aigua1 = g({ import: 243.86, proveidor: { nom: 'GESTAIGUA, S.L.', cif: 'b12345678' }, categoria: { nom: 'Aigua' }, baseImposable: 200, ivaPercent: 21 });
const aigua2 = g({ import: 100, proveidor: { nom: 'Gestaigua, S.L.', cif: null }, categoria: { nom: 'Aigua' }, baseImposable: 100, ivaPercent: 0 });
const llum = g({ import: 121, proveidor: { nom: 'Endesa', cif: 'A00000000' }, categoria: { nom: 'Electricitat' } }); // sense base → 21 % inclòs
const fianca = g({ import: 500, esFianca: true, proveidor: { nom: 'Gestaigua, S.L.', cif: null }, categoria: { nom: 'Aigua' } });
const sensePro = g({ import: 30, categoria: { nom: 'Neteja' } });

describe('agrupaDespeses · per proveïdor', () => {
  const r = agrupaDespeses([aigua1, aigua2, llum, fianca, sensePro], 'proveidor');
  it('suma per proveïdor (majúscules diferents compten junt) i ordena de més a menys', () => {
    expect(r.files.map((f) => [f.nom, f.factures, f.total])).toEqual([
      ['GESTAIGUA, S.L.', 2, 343.86],
      ['Endesa', 1, 121],
      ['Sense proveïdor', 1, 30],
    ]);
  });
  it('base i IVA de les línies d’IVA; sense base, 21 % inclòs', () => {
    const gest = r.files[0]!;
    expect([gest.base, gest.iva]).toEqual([300, 42]);
    const endesa = r.files[1]!;
    expect([endesa.base, endesa.iva]).toEqual([100, 21]);
  });
  it('porta el NIF (en majúscules) i les categories', () => {
    expect(r.files[0]!.nif).toBe('B12345678');
    expect(r.files[0]!.categories).toBe('Aigua');
  });
  it('les fiances no hi són i el total quadra', () => {
    expect(r.total.total).toBe(494.86);
    expect(r.total.factures).toBe(4);
  });
});

describe('agrupaDespeses · per categoria', () => {
  it('agrupa per categoria', () => {
    const r = agrupaDespeses([aigua1, aigua2, llum, sensePro], 'categoria');
    expect(r.files.map((f) => [f.nom, f.total])).toEqual([['Aigua', 343.86], ['Electricitat', 121], ['Neteja', 30]]);
  });
});

describe('csvInforme', () => {
  it('format per a Excel: «;», decimals amb coma i BOM', () => {
    const r = agrupaDespeses([llum], 'proveidor');
    const csv = csvInforme(r.files, r.total, 'proveidor');
    expect(csv.startsWith('﻿"Proveïdor";"NIF";"Categoria";"Factures";"Base";"IVA";"Total"')).toBe(true);
    expect(csv).toContain('"Endesa";"A00000000";"Electricitat";"1";"100,00";"21,00";"121,00"');
    expect(csv.endsWith('"Total";"";"";"1";"100,00";"21,00";"121,00"')).toBe(true);
  });
});
