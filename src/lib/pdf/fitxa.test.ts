import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { Establiment, Estancia, EstanciaViatger, Huesped, Signatura } from '@prisma/client';
import { buildFitxaPdf } from './fitxa';

const establiment = {
  nom: 'HOSTAL COLL',
  cif: '40331905W',
  idPolicial: '000000550',
  provincia: 'Barcelona',
} as Establiment;

const estancia = {
  tipusRegistre: 'CONTRACTE_EN_CURS',
  numContracte: '12',
  anyContracte: 2026,
  dataFormalitzacio: new Date('2026-06-01'),
  dataEntrada: new Date('2026-06-02'),
  dataSortida: new Date('2026-06-05'),
  numViatgers: 2,
  tipusPagament: 'EFECTIU',
  numHabitacions: 1,
  teInternet: true,
} as Estancia;

function huesped(nom: string, over: Partial<Huesped> = {}): Huesped {
  return {
    nom,
    cognom1: 'Garcia',
    cognom2: 'Lopez',
    sexe: 'HOME',
    dataNaixement: new Date('1990-01-01'),
    nacionalitat: 'Espanya',
    tipusDocument: 'DNI_NIF',
    numDocument: '12345678Z',
    numSuport: 'ABC123',
    dataExpedicio: new Date('2020-01-01'),
    email: 'a@b.com',
    telefon: '600000000',
    adreca: 'Carrer Major 1',
    pais: 'Espanya',
    provincia: 'Barcelona',
    municipi: 'Barcelona',
    localitat: null,
    codiPostal: '08001',
    ...over,
  } as Huesped;
}

// PNG 1×1 vàlid per exercitar la incrustació de la signatura.
const PNG_1x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII=';

type Row = EstanciaViatger & { huesped: Huesped; signatura: Signatura | null };

function viatger(
  h: Huesped,
  opts: { titular?: boolean; sig?: boolean; parentesc?: string } = {},
): Row {
  return {
    esTitular: !!opts.titular,
    parentesc: opts.parentesc ?? null,
    huesped: h,
    signatura: opts.sig
      ? ({ imatge: PNG_1x1, llocSignatura: 'Barcelona', data: new Date('2026-06-02'), hora: '12:00' } as Signatura)
      : null,
  } as Row;
}

describe('buildFitxaPdf', () => {
  // Cada persona = una pàgina de formulari; + 1 pàgina d'informació RGPD al final.
  it('genera un PDF vàlid amb una fitxa per persona (+ pàgina RGPD)', async () => {
    const bytes = await buildFitxaPdf(establiment, estancia, [
      viatger(huesped('Anna'), { titular: true, sig: true }),
      viatger(huesped('Pau'), { parentesc: 'CONJUGE' }),
    ]);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(3); // 2 fitxes + RGPD
    // Manté la mida A4 del formulari oficial (595x842).
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it('amb un únic viatger genera una sola fitxa (+ RGPD)', async () => {
    const bytes = await buildFitxaPdf(establiment, estancia, [
      viatger(huesped('Anna'), { titular: true }),
    ]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
  });

  it('no peta amb dades incompletes (menor sense document, sense signatura)', async () => {
    const bytes = await buildFitxaPdf(establiment, estancia, [
      viatger(
        huesped('Nen', {
          tipusDocument: null,
          numDocument: null,
          numSuport: null,
          dataExpedicio: null,
          email: null,
        }),
        { parentesc: 'FILL_FILLA' },
      ),
    ]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
  });
});
