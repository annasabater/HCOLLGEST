import { describe, it, expect } from 'vitest';
import type { Huesped } from '@prisma/client';
import { estadaCongelada, snapshotHuesped, viatgerEfectiu } from './registre-snapshot';

const ara = new Date('2026-06-24T10:00:00Z');

const base = {
  nom: 'Anna',
  cognom1: 'Sabater',
  cognom2: 'Coll',
  telefon: '600000000',
  dataNaixement: new Date('1990-03-15T00:00:00Z'),
  dataExpedicio: null,
  numDocument: '12345678Z',
} as unknown as Huesped;

describe('estadaCongelada', () => {
  it('congela si la sortida fa més de 7 dies', () => {
    expect(estadaCongelada(new Date('2026-06-10'), ara)).toBe(true); // fa 14 dies
  });
  it('no congela si fa menys de 7 dies o és futura', () => {
    expect(estadaCongelada(new Date('2026-06-20'), ara)).toBe(false); // fa 4 dies
    expect(estadaCongelada(new Date('2026-07-01'), ara)).toBe(false); // futura
  });
});

describe('viatgerEfectiu', () => {
  it('sense snapshot retorna la fitxa viva', () => {
    expect(viatgerEfectiu(base, null).telefon).toBe('600000000');
  });
  it('amb snapshot prevalen les dades congelades (dates com a Date)', () => {
    const snap = snapshotHuesped(base); // telèfon 600000000
    const viu = { ...base, telefon: '699999999', nom: 'ANNA EDITADA' } as Huesped;
    const eff = viatgerEfectiu(viu, snap);
    expect(eff.telefon).toBe('600000000'); // congelat, no el nou
    expect(eff.nom).toBe('Anna');
    expect(eff.dataNaixement).toBeInstanceOf(Date);
  });
});

describe('snapshotHuesped', () => {
  it('desa les dates com a ISO string', () => {
    const snap = snapshotHuesped(base);
    expect(typeof snap.dataNaixement).toBe('string');
    expect(snap.telefon).toBe('600000000');
  });
});
