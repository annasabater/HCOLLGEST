import { describe, expect, it } from 'vitest';
import { desglossa, mesSencer, nitsPerBloc, type Preus } from './preu-estada';

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
    expect(total(desglossa(20, DOBLE, true, 35))).toBe(433.33);
    expect(total(desglossa(15, INDIVIDUAL, true, 35))).toBe(245);
  });
  it('forçat a mà, 10 nits: setmana ÷ 7', () => {
    expect(total(desglossa(10, DOBLE, true))).toBe(500);
  });
  it('forçat a «per nits»: mes sencer + setmanes i dies', () => {
    expect(total(desglossa(31, DOBLE, false))).toBe(706); // 650 + 56
    expect(desglossa(32, DOBLE, false).map((l) => [l.concepte, l.quantitat])).toEqual([['Mes', 1], ['Dia', 2]]); // 650 + 2 × 56
    expect(total(desglossa(45, DOBLE, false))).toBe(1156); // 650 + 450 + 56
    expect(total(desglossa(67, DOBLE, false))).toBe(1650); // 2 × 650 + 350
  });
  it('regla de 3 forçada en estades curtes: el bloc més gran que hi cap', () => {
    expect(desglossa(16, DOBLE, true)).toEqual([{ concepte: '450 €/2 setmanes ÷ 14', quantitat: 16, preuUnitat: 32.14, subtotal: 514.29, bloc: { preu: 450, dies: 14, nom: '2 setmanes' } }]);
    expect(total(desglossa(14, DOBLE, true))).toBe(450);
    expect(total(desglossa(9, DOBLE, true))).toBe(450); // 350 ÷ 7 × 9
    expect(total(desglossa(5, DOBLE, true))).toBe(108.33); // menys d'una setmana: mes ÷ 30
  });
  it('el bloc el decideixen les nits de l’estada sencera, no les del tram', () => {
    expect(total(desglossa(10, DOBLE, true, 35))).toBe(216.67); // tram de 10 d'una estada de 35: mes ÷ 30
    expect(total(desglossa(10, DOBLE, true, 16))).toBe(321.43); // tram de 10 d'una de 16: 450 ÷ 14
  });
  it('una línia amb el preu/nit i les nits', () => {
    expect(desglossa(31, DOBLE)).toEqual([{ concepte: '650 €/mes ÷ 30', quantitat: 31, preuUnitat: 21.67, subtotal: 671.67, bloc: { preu: 650, dies: 30, nom: 'mes' } }]);
  });
});

describe('desglossa: bloc de la regla de 3 triat a mà', () => {
  it('ha estat un mes i allarga 2 setmanes: les 14 nits a mes ÷ 30', () => {
    expect(total(desglossa(14, DOBLE, true, 14, 'mes'))).toBe(303.33); // 650 × 14 / 30
  });
  it('ha estat una setmana i allarga una setmana: setmana ÷ 7', () => {
    expect(total(desglossa(7, DOBLE, true, 7, 'setmana'))).toBe(350);
    expect(total(desglossa(16, DOBLE, true, 16, 'setmana'))).toBe(800); // 350 ÷ 7 × 16
  });
  it('si la temporada no té preu del bloc triat, torna a l’automàtic', () => {
    const nomesMes: Preus = { preuDia: null, preuDia4: null, preuSetmana: null, preuDosSetmanes: null, preuMes: 600 };
    expect(total(desglossa(10, nomesMes, true, 10, 'setmana'))).toBe(200); // 600 ÷ 30 × 10
  });
});

describe('mesSencer / nitsPerBloc: l’excepció del febrer', () => {
  it('l’1/2 → 1/3 (28 nits) és un mes i compta com a mes', () => {
    expect(mesSencer('2027-02-01', '2027-03-01')).toBe(true);
    expect(nitsPerBloc('2027-02-01', '2027-03-01')).toBe(30);
    expect(total(desglossa(28, DOBLE, true, nitsPerBloc('2027-02-01', '2027-03-01')))).toBe(606.67); // 650 × 28 / 30
  });
  it('l’1/2 → 2/3 (29 nits): 650 ÷ 30 × 29', () => {
    expect(total(desglossa(29, DOBLE, true, nitsPerBloc('2027-02-01', '2027-03-02')))).toBe(628.33);
  });
  it('15/2 → 15/3 també és un mes; 28 nits que no fan un mes, no', () => {
    expect(mesSencer('2027-02-15', '2027-03-15')).toBe(true);
    expect(mesSencer('2026-04-03', '2026-05-01')).toBe(false);
    expect(nitsPerBloc('2026-04-03', '2026-05-01')).toBe(28);
  });
  it('31/1 → 28/2 (dia que no existeix al febrer): fins a l’últim dia', () => {
    expect(mesSencer('2027-01-31', '2027-02-28')).toBe(true);
    expect(mesSencer('2027-01-31', '2027-02-27')).toBe(false);
  });
  it('la resta de mesos no canvia (31 nits = 31)', () => {
    expect(nitsPerBloc('2026-01-01', '2026-02-01')).toBe(31);
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
