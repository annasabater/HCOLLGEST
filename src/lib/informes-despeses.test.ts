import { describe, expect, it } from 'vitest';
import { agrupaDespeses, csvFitxer, csvInforme, type DespesaInforme } from './informes-despeses';

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
const fiancaSola = g({ import: 6186.86, esFianca: true, proveidor: { nom: 'Marchán Serveis', cif: null }, categoria: { nom: 'Manteniment' } });
const sensePro = g({ import: 30, categoria: { nom: 'Neteja' } });

describe('agrupaDespeses · per proveïdor (sense fiances)', () => {
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
    expect(r.total.fianca).toBe(0);
  });
});

describe('agrupaDespeses · amb fiances', () => {
  const r = agrupaDespeses([aigua1, aigua2, llum, fianca, fiancaSola], 'proveidor', true);
  it('les fiances sumen al total i surten a part, sense base ni IVA', () => {
    const gest = r.files.find((f) => f.nom.startsWith('GESTAIGUA'))!;
    expect([gest.fianca, gest.total, gest.base, gest.iva]).toEqual([500, 843.86, 300, 42]);
  });
  it('un proveïdor que només té fiances també hi surt', () => {
    const march = r.files.find((f) => f.nom === 'Marchán Serveis')!;
    expect([march.factures, march.fianca, march.total, march.base]).toEqual([1, 6186.86, 6186.86, 0]);
  });
  it('el total general quadra', () => {
    expect(r.total.fianca).toBe(6686.86);
    expect(r.total.total).toBeCloseTo(343.86 + 121 + 500 + 6186.86, 2);
  });
});

describe('agrupaDespeses · per categoria', () => {
  it('agrupa per categoria', () => {
    const r = agrupaDespeses([aigua1, aigua2, llum, sensePro], 'categoria');
    expect(r.files.map((f) => [f.nom, f.total])).toEqual([['Aigua', 343.86], ['Electricitat', 121], ['Neteja', 30]]);
  });
});

describe('csv', () => {
  it('format per a Excel: «;», decimals amb coma i BOM', () => {
    const r = agrupaDespeses([llum], 'proveidor');
    const csv = csvFitxer([csvInforme(r.files, r.total, 'proveidor')]);
    expect(csv.startsWith('﻿"Proveïdor";"NIF";"Categoria";"Factures";"Base";"IVA";"Total"')).toBe(true);
    expect(csv).toContain('"Endesa";"A00000000";"Electricitat";"1";"100,00";"21,00";"121,00"');
    expect(csv.endsWith('"Total";"";"";"1";"100,00";"21,00";"121,00"')).toBe(true);
  });
  it('amb fiances hi ha la columna «Fiança»', () => {
    const r = agrupaDespeses([llum, fiancaSola], 'proveidor', true);
    const csv = csvInforme(r.files, r.total, 'proveidor', true);
    expect(csv.startsWith('"Proveïdor";"NIF";"Categoria";"Factures";"Base";"IVA";"Fiança";"Total"')).toBe(true);
    expect(csv).toContain('"Marchán Serveis";"";"Manteniment";"1";"0,00";"0,00";"6186,86";"6186,86"');
  });
  it('les dues vistes, en blocs separats amb títol', () => {
    const a = agrupaDespeses([llum, fiancaSola], 'categoria');
    const b = agrupaDespeses([llum, fiancaSola], 'categoria', true);
    const csv = csvFitxer([csvInforme(a.files, a.total, 'categoria', false, 'Sense fiances'), csvInforme(b.files, b.total, 'categoria', true, 'Amb fiances')]);
    expect(csv).toContain('"Sense fiances"\r\n"Categoria"');
    expect(csv).toContain('\r\n\r\n"Amb fiances"\r\n"Categoria";"Factures";"Base";"IVA";"Fiança";"Total"');
  });
});
