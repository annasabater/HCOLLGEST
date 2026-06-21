import { describe, it, expect } from 'vitest';
import { RegistreSchema, type RegistreInput } from './registre';

function hasIssueAt(error: { issues: { path: (string | number)[] }[] }, path: (string | number)[]) {
  return error.issues.some((i) => i.path.join('.') === path.join('.'));
}

function validContracte(): RegistreInput {
  return {
    estancia: {
      tipusRegistre: 'CONTRACTE_EN_CURS',
      numContracte: '12',
      anyContracte: 2026,
      dataFormalitzacio: '2026-01-10',
      dataEntrada: '2026-07-01',
      dataSortida: '2026-07-05',
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
        dataNaixement: '1990-05-05',
        adreca: 'C/ Major 1',
        pais: 'Espanya',
        provincia: 'Barcelona',
        municipi: 'Barcelona',
        codiPostal: '08001',
        esTitular: true,
      },
    ],
  };
}

describe('RegistreSchema — contracte en curs (§2.3)', () => {
  it('acepta un contrato en curso completo', () => {
    expect(RegistreSchema.safeParse(validContracte()).success).toBe(true);
  });

  it('exige tipus_document i num_document (adult)', () => {
    const data = validContracte();
    data.viatgers[0]!.tipusDocument = undefined;
    data.viatgers[0]!.numDocument = '';
    const res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(hasIssueAt(res.error, ['viatgers', 0, 'tipusDocument'])).toBe(true);
      expect(hasIssueAt(res.error, ['viatgers', 0, 'numDocument'])).toBe(true);
    }
  });

  it('exige num_suport con DNI/NIF', () => {
    const data = validContracte();
    data.viatgers[0]!.numSuport = '';
    const res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) expect(hasIssueAt(res.error, ['viatgers', 0, 'numSuport'])).toBe(true);
  });

  it('exige cognom2 con DNI/NIF', () => {
    const data = validContracte();
    data.viatgers[0]!.cognom2 = '';
    const res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) expect(hasIssueAt(res.error, ['viatgers', 0, 'cognom2'])).toBe(true);
  });

  it('exige província i municipi si país = Espanya', () => {
    const data = validContracte();
    data.viatgers[0]!.provincia = '';
    data.viatgers[0]!.municipi = '';
    const res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(hasIssueAt(res.error, ['viatgers', 0, 'provincia'])).toBe(true);
      expect(hasIssueAt(res.error, ['viatgers', 0, 'municipi'])).toBe(true);
    }
  });

  it('exige localitat si país estranger', () => {
    const data = validContracte();
    const v = data.viatgers[0]!;
    v.pais = 'França';
    v.provincia = '';
    v.municipi = '';
    v.localitat = '';
    const res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) expect(hasIssueAt(res.error, ['viatgers', 0, 'localitat'])).toBe(true);
  });

  it('un menor (por fecha de nacimiento) no necesita documento, pero sí parentesc', () => {
    const data = validContracte();
    const v = data.viatgers[0]!;
    v.dataNaixement = '2020-01-01'; // 6 años en 2026 → menor
    v.tipusDocument = undefined;
    v.numDocument = '';
    v.numSuport = '';
    v.cognom2 = '';
    // sin parentesc → debe fallar
    let res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) expect(hasIssueAt(res.error, ['viatgers', 0, 'parentesc'])).toBe(true);
    // con parentesc → debe pasar
    v.parentesc = 'FILL_FILLA';
    res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(true);
  });

  it('rechaza data_sortida <= data_entrada', () => {
    const data = validContracte();
    data.estancia.dataSortida = '2026-07-01';
    const res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) expect(hasIssueAt(res.error, ['estancia', 'dataSortida'])).toBe(true);
  });

  it('rechaza data_formalitzacio futura', () => {
    const data = validContracte();
    data.estancia.dataFormalitzacio = '2099-01-01';
    const res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) expect(hasIssueAt(res.error, ['estancia', 'dataFormalitzacio'])).toBe(true);
  });

  it('exige al menos un titular', () => {
    const data = validContracte();
    data.viatgers[0]!.esTitular = false;
    const res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) expect(hasIssueAt(res.error, ['viatgers'])).toBe(true);
  });
});

describe('RegistreSchema — reserva (§2.3)', () => {
  function validReserva(): RegistreInput {
    return {
      estancia: {
        tipusRegistre: 'RESERVA',
        numContracte: 'R-5',
        anyContracte: 2026,
        dataFormalitzacio: '2026-06-01',
        dataEntrada: '2026-08-01',
        dataSortida: '2026-08-03',
        numViatgers: 1,
        tipusPagament: 'TARGETA_CREDIT',
      },
      viatgers: [{ nom: 'Anna', cognom1: 'Sabater', email: 'anna@example.cat', esTitular: true }],
    };
  }

  it('acepta una reserva con solo nom, cognom1 y email', () => {
    expect(RegistreSchema.safeParse(validReserva()).success).toBe(true);
  });

  it('acepta una reserva con teléfono en lugar de email', () => {
    const data = validReserva();
    data.viatgers[0]!.email = '';
    data.viatgers[0]!.telefon = '600111222';
    expect(RegistreSchema.safeParse(data).success).toBe(true);
  });

  it('falla si la reserva no tiene ni email ni teléfono', () => {
    const data = validReserva();
    data.viatgers[0]!.email = '';
    const res = RegistreSchema.safeParse(data);
    expect(res.success).toBe(false);
    if (!res.success) expect(hasIssueAt(res.error, ['viatgers', 0, 'email'])).toBe(true);
  });

  it('NO exige documento ni dirección en reserva', () => {
    const data = validReserva();
    // sin documento, sin dirección → debe pasar igualmente
    expect(RegistreSchema.safeParse(data).success).toBe(true);
  });
});
