import { describe, expect, it } from 'vitest';
import { calculaIeet, clauPeriode, contracteVisible, infoPeriode, periodePerDefecte, resumIeet, type EstadaIeet, type ViatgerIeet } from './ieet';

const CFG = { tarifa: 0.9, maxNits: 7, edatMinima: 17 };
const AVUI = new Date('2026-10-12T10:00:00Z');
const d = (s: string) => new Date(`${s}T00:00:00Z`);

function viatger(id: string, naixement: string | null, extra: Partial<ViatgerIeet> = {}): ViatgerIeet {
  return {
    huespedId: id, habitacio: null, nom: id, cognom1: 'COGNOM', cognom2: null,
    tipusDocument: 'DNI_NIF', numDocument: '12345678Z', nacionalitat: 'ESP',
    dataNaixement: naixement ? d(naixement) : null, adreca: 'C/ Major 1', codiPostal: '08370',
    municipi: 'CALELLA', localitat: null, pais: 'Espanya', telefon: '600000000', email: 'a@b.cat', ...extra,
  };
}
function estada(id: string, num: string | null, entrada: string, sortida: string, viatgers: ViatgerIeet[], origen: string | null = null): EstadaIeet {
  return { id, numContracte: num, dataEntrada: d(entrada), dataSortida: d(sortida), estanciaOrigenId: origen, habitacio: '1', viatgers };
}

describe('calculaIeet', () => {
  const laia = viatger('laia', '1994-03-14');
  const pau = viatger('pau', '2024-02-10', { tipusDocument: null, numDocument: null, telefon: null, email: null });

  it('primera estada: màxim 7 nits × 0,90 per persona; el menor a 0 €', () => {
    const f = calculaIeet([estada('e1', '26005', '2026-07-01', '2026-08-01', [laia, pau])], CFG, AVUI);
    expect(f.map((x) => [x.nitsEstada, x.nitsPaguen, x.import, x.menor])).toEqual([[31, 7, 6.3, false], [31, 7, 0, true]]);
    expect(f[1]!.falten).toEqual([]); // menor de 14: ni document ni contacte
    expect(f[0]!.periode).toBe('2026-1');
  });

  it('les continuacions (mateix dia, l’endemà o ampliació) no surten', () => {
    const f = calculaIeet([
      estada('e1', '26005', '2026-07-01', '2026-08-01', [laia]),
      estada('e2', '26005_1', '2026-08-01', '2026-09-01', [laia]),
      estada('e3', '26005_2', '2026-09-02', '2026-10-01', [laia]),
      estada('e4', '26009_1', '2026-03-01', '2026-03-05', [viatger('x', '1980-01-01')], 'e0'),
    ], CFG, AVUI);
    expect(f.map((x) => x.contracte)).toEqual(['26009.1', '26005']); // per data d'entrada; l'origen e0 no hi és → compta com a primera
  });

  it('tornar mesos després és una estada nova (sí que paga)', () => {
    const f = calculaIeet([
      estada('e1', '26001', '2026-06-01', '2026-06-04', [laia]),
      estada('e2', '26020', '2026-09-10', '2026-09-12', [laia]),
    ], CFG, AVUI);
    expect(f.map((x) => [x.contracte, x.import])).toEqual([['26001', 2.7], ['26020', 1.8]]);
  });

  it('sense contracte o encara no acabada: no surt', () => {
    const f = calculaIeet([
      estada('e1', null, '2026-07-01', '2026-07-05', [laia]),
      estada('e2', '_1', '2026-07-01', '2026-07-05', [laia]),
      estada('e3', '26030', '2026-10-10', '2026-10-20', [viatger('y', '1990-01-01')]),
    ], CFG, AVUI);
    expect(f).toEqual([]);
  });

  it('marca les dades que falten', () => {
    const f = calculaIeet([estada('e1', '26007', '2026-08-09', '2026-09-09', [viatger('j', '1977-11-02', { email: null, adreca: null })])], CFG, AVUI);
    expect(f[0]!.falten).toEqual(['domicili', 'correu']);
  });

  it('resum per període', () => {
    const f = calculaIeet([estada('e1', '26005', '2026-07-01', '2026-08-01', [laia, pau])], CFG, AVUI);
    expect(resumIeet(f)).toEqual([{ periode: '2026-1', persones: 2, personesPaguen: 1, nitsPaguen: 7, import: 6.3 }]);
  });
});

describe('contracteVisible', () => {
  it('canvia _ per . i descarta els buits', () => {
    expect(contracteVisible('26002_1')).toBe('26002.1');
    expect(contracteVisible('_1')).toBeNull();
    expect(contracteVisible('')).toBeNull();
  });
});

describe('periodes de declaracio', () => {
  it('abril-setembre i octubre-marc (que passa d any)', () => {
    expect(clauPeriode(d('2026-04-01'))).toBe('2026-1');
    expect(clauPeriode(d('2026-09-30'))).toBe('2026-1');
    expect(clauPeriode(d('2026-10-01'))).toBe('2026-2');
    expect(clauPeriode(d('2027-03-31'))).toBe('2026-2');
    expect(clauPeriode(d('2026-02-15'))).toBe('2025-2');
  });
  it('dates i termini de pagament', () => {
    expect(infoPeriode('2026-1')).toMatchObject({ inici: '2026-04-01', fi: '2026-09-30', pagamentDes: '2026-10-01', pagamentFins: '2026-10-20' });
    expect(infoPeriode('2026-2')).toMatchObject({ inici: '2026-10-01', fi: '2027-03-31', pagamentFins: '2027-04-20' });
  });
  it('per defecte, l anterior mentre s es a temps de pagar-lo', () => {
    expect(periodePerDefecte(d('2026-10-12'))).toBe('2026-1');
    expect(periodePerDefecte(d('2026-10-20'))).toBe('2026-1');
    expect(periodePerDefecte(d('2026-10-21'))).toBe('2026-2');
    expect(periodePerDefecte(d('2027-04-05'))).toBe('2026-2');
    expect(periodePerDefecte(d('2027-05-01'))).toBe('2027-1');
  });
});
