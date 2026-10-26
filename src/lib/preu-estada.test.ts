import { describe, expect, it } from 'vitest';
import { desglossa, type Preus } from './preu-estada';

// Preus reals d'hivern (Tarifes, octubre 2026).
const DOBLE: Preus = { preuDia: 56, preuDia4: null, preuSetmana: 350, preuDosSetmanes: 450, preuMes: 650 };
const INDIVIDUAL: Preus = { preuDia: 43, preuDia4: 40, preuSetmana: 195, preuDosSetmanes: 365, preuMes: 490 };
const total = (l: { subtotal: number }[]) => Math.round(l.reduce((a, x) => a + x.subtotal, 0) * 100) / 100;

describe('desglossa: estada de 30 nits o més (mes ÷ 30)', () => {
  it('30 nits = el mes exacte', () => {
    expect(total(desglossa(30, DOBLE))).toBe(650);
    expect(total(desglossa(30, INDIVIDUAL))).toBe(490);
  });
  it('31 nits = mes × 31/30, sense arrodonir el preu/nit', () => {
    expect(total(desglossa(31, DOBLE))).toBe(671.67); // 650 × 31 / 30
    expect(total(desglossa(31, INDIVIDUAL))).toBe(506.33); // 490 × 31 / 30
  });
  it('45 nits = mes i mig', () => {
    expect(total(desglossa(45, DOBLE))).toBe(975);
  });
  it('un tros curt d\'una estada llarga també va a ÷ 30 (canvi doble → individual)', () => {
    // 20 nits a la doble + 15 a la individual (estada de 35 nits).
    expect(total(desglossa(20, DOBLE, true))).toBe(433.33);
    expect(total(desglossa(15, INDIVIDUAL, true))).toBe(245);
  });
  it('forçat a mà: allargar 10 nits una estada d\'un mes', () => {
    expect(total(desglossa(10, DOBLE, true))).toBe(216.67);
  });
  it('forçat a «per nits»: mes sencer + setmanes i dies', () => {
    expect(total(desglossa(31, DOBLE, false))).toBe(706); // 650 + 56
    expect(desglossa(32, DOBLE, false).map((l) => [l.concepte, l.quantitat])).toEqual([['Mes', 1], ['Dia', 2]]); // 650 + 2 × 56
    expect(total(desglossa(45, DOBLE, false))).toBe(1156); // 650 + 450 + 56
    expect(total(desglossa(67, DOBLE, false))).toBe(1650); // 2 × 650 + 350
  });
  it('una línia amb el preu/nit i les nits', () => {
    expect(desglossa(31, DOBLE)).toEqual([{ concepte: '650 €/mes ÷ 30', quantitat: 31, preuUnitat: 21.67, subtotal: 671.67 }]);
  });
});

describe('desglossa: estada de menys de 30 nits (tarifa)', () => {
  it('dies, setmanes i 2 setmanes com sempre', () => {
    expect(total(desglossa(3, DOBLE))).toBe(168); // 3 × 56
    expect(total(desglossa(7, DOBLE))).toBe(350);
    expect(total(desglossa(10, DOBLE))).toBe(518); // 350 + 3 × 56
    expect(total(desglossa(14, DOBLE))).toBe(450);
    expect(total(desglossa(5, INDIVIDUAL))).toBe(200); // 5 × 40 (4 dies)
  });
  it('sense límit: es paga la tarifa encara que passi del mes', () => {
    expect(total(desglossa(21, DOBLE))).toBe(800); // 450 + 350
    expect(total(desglossa(29, DOBLE))).toBe(956); // 2 × 450 + 56
  });
  it('temporada només amb preu de mes: ÷ 30 també per a estades curtes', () => {
    expect(total(desglossa(10, { preuDia: null, preuDia4: null, preuSetmana: null, preuDosSetmanes: null, preuMes: 1026 }))).toBe(342);
  });
});
