import { describe, expect, it } from 'vitest';
import { construeixOcupacio, type EstanciaOcupacio } from './ocupacio';

const est = (p: Partial<EstanciaOcupacio> & { id: string }): EstanciaOcupacio => ({
  habitacio: '1',
  entrada: '2026-11-16',
  sortida: '2026-12-16',
  observacions: null,
  viatgers: [{ nom: 'Ziya Guzel', telefon: '611', esTitular: true }],
  cobraments: [],
  previstos: [],
  ...p,
});
const base = { desde: '2026-11-22', fins: '2027-01-31', avui: '2026-11-22' };

describe('construeixOcupacio', () => {
  it('surten totes les habitacions (també les lliures), ordenades com a números', () => {
    const r = construeixOcupacio([est({ id: 'a', habitacio: '10' })], ['10', '2', '1'], base);
    expect(r.map((h) => h.nom)).toEqual(['1', '2', '10']);
    expect(r[0]!.files).toEqual([]);
    expect(r[2]!.files).toHaveLength(1);
  });

  it('el titular va primer i el telèfon és el primer que n\'hi ha', () => {
    const e = est({
      id: 'a',
      viatgers: [
        { nom: 'Firooz Imani', telefon: null, esTitular: false },
        { nom: 'Ziya Guzel', telefon: '611', esTitular: true },
      ],
    });
    const f = construeixOcupacio([e], ['1'], base)[0]!.files[0]!;
    expect(f.clients).toEqual(['Ziya Guzel', 'Firooz Imani']);
    expect(f.telefon).toBe('611');
  });

  it('import = cobrat + el previst pendent; mètodes sense repetir', () => {
    const e = est({
      id: 'a',
      cobraments: [{ import: 300, metode: 'EFECTIU' }, { import: 100, metode: 'EFECTIU' }, { import: 50, metode: 'BIZUM' }],
      previstos: [{ import: 200, pagat: false }, { import: 80, pagat: true }],
    });
    const f = construeixOcupacio([e], ['1'], base)[0]!.files[0]!;
    expect(f.pagat).toBe(450);
    expect(f.pendent).toBe(200);
    expect(f.import).toBe(650);
    expect(f.metodes).toEqual(['Efectiu', 'Bizum']);
  });

  it('sense cap import, no n\'inventa cap', () => {
    expect(construeixOcupacio([est({ id: 'a' })], ['1'], base)[0]!.files[0]!.import).toBeNull();
  });

  it('només les estades que toquen el període, ordenades per entrada', () => {
    const r = construeixOcupacio(
      [
        est({ id: 'tard', entrada: '2026-12-20', sortida: '2027-01-20' }),
        est({ id: 'abans', entrada: '2026-09-01', sortida: '2026-10-01' }),
        est({ id: 'ara', entrada: '2026-11-02', sortida: '2026-12-02' }),
        est({ id: 'massaTard', entrada: '2027-03-01', sortida: '2027-04-01' }),
      ],
      ['1'],
      base,
    );
    expect(r[0]!.files.map((f) => f.id)).toEqual(['ara', 'tard']);
  });

  it('marca com a acabada la que té la sortida abans d\'avui', () => {
    const r = construeixOcupacio(
      [est({ id: 'vella', entrada: '2026-10-01', sortida: '2026-11-25' }), est({ id: 'ok' })],
      ['1'],
      { ...base, desde: '2026-10-01', avui: '2026-12-01' },
    );
    expect(r[0]!.files.find((f) => f.id === 'vella')!.acabada).toBe(true);
    expect(r[0]!.files.find((f) => f.id === 'ok')!.acabada).toBe(false);
  });

  it('vista restringida: amaga ZP11, els cobraments «Altres» i les notes', () => {
    const r = construeixOcupacio(
      [
        est({ id: 'zp', observacions: 'efectiu zp11' }),
        est({ id: 'ok', observacions: 'cal factura', cobraments: [{ import: 100, metode: 'ALTRES' }, { import: 50, metode: 'TARGETA' }] }),
      ],
      ['1'],
      { ...base, restringit: true },
    );
    expect(r[0]!.files.map((f) => f.id)).toEqual(['ok']);
    expect(r[0]!.files[0]!.pagat).toBe(50);
    expect(r[0]!.files[0]!.notes).toBeNull();
  });

  it('una estada sense habitació surt a part', () => {
    const r = construeixOcupacio([est({ id: 'a', habitacio: null })], ['1'], base);
    expect(r.map((h) => h.nom)).toEqual(['1', 'Sense habitació']);
  });
});
