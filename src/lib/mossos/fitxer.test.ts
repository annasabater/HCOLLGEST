import { describe, it, expect } from 'vitest';
import {
  buildFileName,
  buildFitxer,
  buildFitxerBuffer,
  validaParte,
  helpers,
  isLayoutReady,
  isFormatConfirmat,
  type ParteViatgers,
} from './fitxer';

// Parte complet (CONTRACTE EN CURS) amb un viatger NIE resident a Barcelona i
// nacionalitat francesa: exercita la codificació INE (província/municipi) i ISO.
function parteContracte(): ParteViatgers {
  return {
    establiment: { fileIdentifier: '08043AAR02', idPolicial: '000000550', nom: 'Hostal Coll' },
    generatedAt: new Date(2026, 0, 16, 15, 23), // 2026-01-16 15:23
    contracte: {
      tipusRegistre: 'CONTRACTE_EN_CURS',
      numContracte: '12',
      anyContracte: 2026,
      dataFormalitzacio: new Date(2026, 0, 10),
      dataEntrada: new Date(2026, 1, 1),
      dataSortida: new Date(2026, 1, 5),
      numViatgers: 1,
      tipusPagament: 'EFECTIU',
      numHabitacions: 2,
      teInternet: true,
    },
    viatgers: [
      {
        tipusDocument: 'NIE',
        numDocument: 'X1234567L',
        numSuport: 'ABC123456',
        nom: 'Maria',
        cognom1: 'Garcia',
        cognom2: 'López',
        sexe: 'DONA',
        dataNaixement: new Date(1990, 4, 5),
        nacionalitat: 'França',
        email: 'maria@x.cat',
        telefon: '600123123',
        adreca: 'C/ Major 1',
        pais: 'Espanya',
        provincia: 'Barcelona',
        municipi: 'Barcelona',
        codiPostal: '08001',
      },
    ],
  };
}

describe('buildFileName (§4)', () => {
  it('formata {identificador}.{seq 3 dígits}.txt', () => {
    expect(buildFileName('08043AAR02', 1)).toBe('08043AAR02.001.txt');
    expect(buildFileName('08043AAR02', 42)).toBe('08043AAR02.042.txt');
    expect(buildFileName('08043AAR02', 999)).toBe('08043AAR02.999.txt');
  });
  it('reinicia la seqüència després de 999 → 001', () => {
    expect(buildFileName('08043AAR02', 1000)).toBe('08043AAR02.001.txt');
    expect(buildFileName('08043AAR02', 1001)).toBe('08043AAR02.002.txt');
  });
  it('rebutja identificadors no alfanumèrics de 9-10 caràcters', () => {
    expect(() => buildFileName('short', 1)).toThrow();
    expect(() => buildFileName('TIENE-GUION', 1)).toThrow();
    expect(() => buildFileName('012345678901', 1)).toThrow(); // 12 car.
  });
});

describe('estructura del fitxer (manual v8 §4)', () => {
  it('format confirmat i layout llest', () => {
    expect(isLayoutReady()).toBe(true);
    expect(isFormatConfirmat()).toBe(true);
  });

  it('línia establiment (tipus 1): 7 camps, data/hora confecció, V24', () => {
    const out = buildFitxer(parteContracte());
    const linies = out.trimEnd().split('\r\n');
    expect(linies[0]).toBe('1|08043AAR02|HOSTAL COLL|20260116|1523|1|V24');
  });

  it('línia viatger (tipus 2): ordre, codis, INE i ISO exactes + "|" final', () => {
    const out = buildFitxer(parteContracte());
    const linies = out.trimEnd().split('\r\n');
    expect(linies[1]).toBe(
      '2||X1234567L|N||GARCIA|LÓPEZ|MARIA|F|19900505|FRA|20260201|0000|20260205|0000|' +
        '20260110|C|12|1|2|S|EFECT|600123123||maria@x.cat|ABC123456|C/ MAJOR 1|08|080193||ESP|08001|',
    );
  });

  it('la línia de viatger té 32 camps (+ pipe final)', () => {
    const out = buildFitxer(parteContracte());
    const liniaViatger = out.trimEnd().split('\r\n')[1]!;
    // 32 camps → 32 separadors comptant el "|" final.
    expect(liniaViatger.split('|')).toHaveLength(33);
    expect(liniaViatger.endsWith('|')).toBe(true);
  });

  it('una línia d’establiment + una per viatger; acaba en CRLF', () => {
    const parte = parteContracte();
    parte.contracte.numViatgers = 2;
    parte.viatgers.push({ ...parte.viatgers[0]!, nom: 'Joan', cognom1: 'Soler' });
    const out = buildFitxer(parte);
    expect(out.endsWith('\r\n')).toBe(true);
    expect(out.trimEnd().split('\r\n')).toHaveLength(3); // 1 establiment + 2 viatgers
  });

  it('conserva accents (alfabet occidental) i codifica a latin1', () => {
    const buf = buildFitxerBuffer(parteContracte(), 'latin1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.includes(0xd3)).toBe(true); // 'Ó' (LÓPEZ) en latin1 = 0xD3
  });

  it('llança si un camp conté el separador "|"', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.nom = 'Ma|ria';
    expect(() => buildFitxer(parte)).toThrow(/separador/);
  });

  it('document espanyol (DNI) va al camp 2; estranger (NIE) al camp 3', () => {
    const parte = parteContracte();
    const v = parte.viatgers[0]!;
    v.tipusDocument = 'DNI_NIF';
    v.numDocument = '12345678Z';
    v.cognom2 = 'López'; // oblig. amb DNI/NIF
    const linia = buildFitxer(parte).trimEnd().split('\r\n')[1]!.split('|');
    expect(linia[1]).toBe('12345678Z'); // camp 2 (espanyol)
    expect(linia[2]).toBe(''); // camp 3 (estranger)
    expect(linia[3]).toBe('D'); // tipus document
  });
});

describe('normalizaCognom (cognoms compostos)', () => {
  it('separa cognoms compostos per un sol espai', () => {
    expect(helpers.normalizaCognom('  de   la    Fuente ')).toBe('de la Fuente');
  });
});

describe('validaParte (§2.3 + codificació)', () => {
  it('accepta un contracte en curs complet', () => {
    expect(() => validaParte(parteContracte())).not.toThrow();
  });
  it('rebutja data de sortida <= entrada', () => {
    const parte = parteContracte();
    parte.contracte.dataSortida = parte.contracte.dataEntrada;
    expect(() => validaParte(parte)).toThrow(/sortida/);
  });
  it('exigeix número de suport (9 car.) amb NIE', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.numSuport = 'ABC12'; // < 9
    expect(() => validaParte(parte)).toThrow(/suport/);
  });
  it('exigeix cognom2 amb DNI/NIF', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.tipusDocument = 'DNI_NIF';
    parte.viatgers[0]!.numDocument = '12345678Z';
    parte.viatgers[0]!.cognom2 = undefined;
    expect(() => validaParte(parte)).toThrow(/segon cognom/);
  });
  it('rebutja municipi no trobat al padró INE', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.municipi = 'Vilanova Inexistent';
    expect(() => validaParte(parte)).toThrow(/padró INE/);
  });
  it('rebutja província sense codi INE', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.provincia = 'Provincia Falsa';
    expect(() => validaParte(parte)).toThrow(/INE/);
  });
  it('en RESERVA només exigeix nom, cognom1 i (email o telèfon)', () => {
    const parte = parteContracte();
    parte.contracte.tipusRegistre = 'RESERVA';
    parte.viatgers[0] = { nom: 'Anna', cognom1: 'Sabater', email: 'a@b.cat' };
    expect(() => validaParte(parte)).not.toThrow();
  });
  it('en RESERVA falla si falta email i telèfon', () => {
    const parte = parteContracte();
    parte.contracte.tipusRegistre = 'RESERVA';
    parte.viatgers[0] = { nom: 'Anna', cognom1: 'Sabater' };
    expect(() => validaParte(parte)).toThrow(/email o telèfon/);
  });
  it('no exigeix document a un menor, però sí parentesc', () => {
    const parte = parteContracte();
    parte.viatgers[0] = {
      nom: 'Nen',
      cognom1: 'Petit',
      esMenor: true,
      adreca: 'C/ Major 1',
      codiPostal: '08001',
      pais: 'Espanya',
      provincia: 'Barcelona',
      municipi: 'Barcelona',
    };
    expect(() => validaParte(parte)).toThrow(/parentesc/);
    parte.viatgers[0]!.parentesc = 'FILL_FILLA';
    expect(() => validaParte(parte)).not.toThrow();
  });
  it('si país estranger exigeix localitat (i no INE)', () => {
    const parte = parteContracte();
    const v = parte.viatgers[0]!;
    v.pais = 'França';
    v.provincia = undefined;
    v.municipi = undefined;
    v.localitat = undefined;
    expect(() => validaParte(parte)).toThrow(/localitat/);
    v.localitat = 'Lyon';
    expect(() => validaParte(parte)).not.toThrow();
  });
});
