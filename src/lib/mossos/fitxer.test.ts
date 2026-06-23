import { describe, it, expect } from 'vitest';
import {
  buildFileName,
  buildFitxer,
  buildFitxerBuffer,
  validaParte,
  helpers,
  isLayoutReady,
  isFormatConfirmat,
  FIELD_LAYOUT,
  type FieldDef,
  type ParteViatgers,
} from './fitxer';

// Layout de PRUEBA (no es el orden real del manual — §9). Sirve para ejercitar
// el motor de formato (separadores, campos vacíos, salto de línea).
const TEST_LAYOUT: FieldDef[] = [
  { name: 'tipus_registre', value: (p) => p.contracte.tipusRegistre },
  { name: 'num_contracte', value: (p) => p.contracte.numContracte },
  { name: 'nom', value: (_, v) => v.nom },
  { name: 'cognom1', value: (_, v) => v.cognom1 },
  { name: 'cognom2', value: (_, v) => v.cognom2 ?? '' },
  { name: 'email', value: (_, v) => v.email ?? '' },
];

function parteContracte(): ParteViatgers {
  return {
    establiment: { fileIdentifier: '08043AAR02', idPolicial: '000000550', nom: 'HOSTAL COLL' },
    contracte: {
      tipusRegistre: 'CONTRACTE_EN_CURS',
      numContracte: '12',
      anyContracte: 2026,
      dataFormalitzacio: new Date('2026-01-10'),
      dataEntrada: new Date('2026-02-01'),
      dataSortida: new Date('2026-02-05'),
      numViatgers: 1,
      tipusPagament: 'EFECTIU',
    },
    viatgers: [
      {
        nom: 'Maria',
        cognom1: 'Garcia',
        cognom2: 'López',
        tipusDocument: 'DNI_NIF',
        numDocument: '12345678Z',
        numSuport: 'ABC123456',
        dataNaixement: new Date('1990-05-05'),
        adreca: 'C/ Major 1',
        pais: 'Espanya',
        provincia: 'Barcelona',
        municipi: 'Barcelona',
        codiPostal: '08001',
      },
    ],
  };
}

describe('buildFileName (§2.2)', () => {
  it('formatea {identificador}.{seq 3 dígitos}.txt', () => {
    expect(buildFileName('08043AAR02', 1)).toBe('08043AAR02.001.txt');
    expect(buildFileName('08043AAR02', 42)).toBe('08043AAR02.042.txt');
    expect(buildFileName('08043AAR02', 999)).toBe('08043AAR02.999.txt');
  });

  it('reinicia la secuencia tras 999 → 001', () => {
    expect(buildFileName('08043AAR02', 1000)).toBe('08043AAR02.001.txt');
    expect(buildFileName('08043AAR02', 1001)).toBe('08043AAR02.002.txt');
  });

  it('rechaza identificadores no alfanuméricos de 9-10 caracteres', () => {
    expect(() => buildFileName('short', 1)).toThrow();
    expect(() => buildFileName('TIENE-GUION', 1)).toThrow();
    expect(() => buildFileName('012345678901', 1)).toThrow(); // 12 chars
  });
});

describe('motor de formato (§2.2)', () => {
  it('usa "|" como separador y CRLF al final de cada línea', () => {
    const out = buildFitxer(parteContracte(), TEST_LAYOUT);
    expect(out).toContain('|');
    expect(out.endsWith('\r\n')).toBe(true);
    expect(out).toBe('CONTRACTE_EN_CURS|12|Maria|Garcia|López|\r\n');
  });

  it('conserva el "|" de los campos vacíos (no se omiten)', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.cognom2 = undefined;
    parte.viatgers[0]!.email = undefined;
    // cognom2 obligatorio con DNI/NIF → quitamos el doc para que valide
    parte.viatgers[0]!.tipusDocument = 'PASSAPORT';
    parte.viatgers[0]!.numSuport = undefined;
    const out = buildFitxer(parte, TEST_LAYOUT);
    // ...López vacío, email vacío → dos pipes finales antes del CRLF
    expect(out).toBe('CONTRACTE_EN_CURS|12|Maria|Garcia||\r\n');
  });

  it('conserva acentos (é, ç, ñ) — alfabeto occidental', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.nom = 'Begoña';
    parte.viatgers[0]!.cognom1 = 'Peçanha';
    const out = buildFitxer(parte, TEST_LAYOUT);
    expect(out).toContain('Begoña');
    expect(out).toContain('Peçanha');
  });

  it('lanza si un campo contiene el separador "|"', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.nom = 'Ma|ria';
    expect(() => buildFitxer(parte, TEST_LAYOUT)).toThrow(/separador/);
  });

  it('genera una línea por viajero', () => {
    const parte = parteContracte();
    parte.viatgers.push({ ...parte.viatgers[0]!, nom: 'Joan', cognom2: 'Soler' });
    const out = buildFitxer(parte, TEST_LAYOUT);
    expect(out.trimEnd().split('\r\n')).toHaveLength(2);
  });

  it('codifica a latin1 por defecto (Buffer)', () => {
    const buf = buildFitxerBuffer(parteContracte(), 'latin1', TEST_LAYOUT);
    expect(Buffer.isBuffer(buf)).toBe(true);
    // 'ó' en latin1 es un solo byte 0xF3
    expect(buf.includes(0xf3)).toBe(true);
  });

  it('el layout de PRODUCCIÓN (provisional) está cargado → isLayoutReady true', () => {
    expect(FIELD_LAYOUT.length).toBeGreaterThan(0);
    expect(isLayoutReady()).toBe(true);
    // El formato es provisional hasta confirmarlo con el manual oficial (§9).
    expect(isFormatConfirmat()).toBe(false);
  });

  it('genera el fitxer con el layout de PRODUCCIÓN sin lanzar', () => {
    const out = buildFitxer(parteContracte());
    expect(out.endsWith('\r\n')).toBe(true);
    // Conté dades clau del viatger i de l'operació.
    expect(out).toContain('Garcia');
    expect(out).toContain('2026'); // any_contracte
    expect(out).toContain('000000550'); // establiment (id policial)
    expect(out.split('|').length).toBe(FIELD_LAYOUT.length); // una línia, N columnes
  });
});

describe('normalizaCognom (apellidos compuestos)', () => {
  it('separa apellidos compuestos por un solo espacio', () => {
    expect(helpers.normalizaCognom('  de   la    Fuente ')).toBe('de la Fuente');
  });
});

describe('validaParte (§2.3)', () => {
  it('acepta un contrato en curso completo', () => {
    expect(() => validaParte(parteContracte())).not.toThrow();
  });

  it('rechaza data_sortida <= data_entrada', () => {
    const parte = parteContracte();
    parte.contracte.dataSortida = parte.contracte.dataEntrada;
    expect(() => validaParte(parte)).toThrow(/data_sortida/);
  });

  it('exige num_suport con DNI/NIF', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.numSuport = undefined;
    expect(() => validaParte(parte)).toThrow(/num_suport/);
  });

  it('exige cognom2 con DNI/NIF', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.cognom2 = undefined;
    expect(() => validaParte(parte)).toThrow(/cognom2/);
  });

  it('en RESERVA solo exige nom, cognom1 y (email o telèfon)', () => {
    const parte = parteContracte();
    parte.contracte.tipusRegistre = 'RESERVA';
    parte.viatgers[0] = { nom: 'Anna', cognom1: 'Sabater', email: 'a@b.cat' };
    expect(() => validaParte(parte)).not.toThrow();
  });

  it('en RESERVA falla si falta email y telèfon', () => {
    const parte = parteContracte();
    parte.contracte.tipusRegistre = 'RESERVA';
    parte.viatgers[0] = { nom: 'Anna', cognom1: 'Sabater' };
    expect(() => validaParte(parte)).toThrow(/email o telèfon/);
  });

  it('no exige documento a un menor, pero sí parentesc', () => {
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
    parte.viatgers[0]!.parentesc = 'Fill/filla';
    expect(() => validaParte(parte)).not.toThrow();
  });

  it('si país = Espanya exige província i municipi', () => {
    const parte = parteContracte();
    parte.viatgers[0]!.provincia = undefined;
    expect(() => validaParte(parte)).toThrow(/província/);
  });

  it('si país estranger exige localitat', () => {
    const parte = parteContracte();
    const v = parte.viatgers[0]!;
    v.pais = 'França';
    v.provincia = undefined;
    v.municipi = undefined;
    v.localitat = undefined;
    expect(() => validaParte(parte)).toThrow(/localitat/);
  });
});
