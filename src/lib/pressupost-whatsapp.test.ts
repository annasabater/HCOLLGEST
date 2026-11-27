import { describe, it, expect } from 'vitest';
import { dataAmbDia, missatgePressupost, nomSalutacio, telefonWhatsApp } from './pressupost-whatsapp';

describe('dataAmbDia', () => {
  it('posa el dia de la setmana i el mes en cada idioma', () => {
    expect(dataAmbDia('2026-12-07', 'ca')).toBe('dilluns 7 de desembre');
    expect(dataAmbDia('2026-04-02', 'ca')).toBe('dijous 2 d’abril');
    expect(dataAmbDia('2026-12-07', 'es')).toBe('lunes 7 de diciembre');
    expect(dataAmbDia('2026-12-07', 'fr')).toBe('lundi 7 décembre');
    expect(dataAmbDia('2026-12-07', 'en')).toBe('Monday 7 December');
  });
});

describe('nomSalutacio', () => {
  it('agafa el primer nom i el posa en format propi', () => {
    expect(nomSalutacio('GEMA CORTES GARCIA')).toBe('Gema');
    expect(nomSalutacio('  ')).toBe('');
    expect(nomSalutacio(null)).toBe('');
  });
});

describe('missatgePressupost', () => {
  const base = {
    idioma: 'ca' as const,
    clientNom: 'GEMA CORTES GARCIA',
    entrada: '2026-12-07',
    sortida: '2026-12-14',
    total: 306.43,
    iva: 27.86,
    signatura: 'Anna · Hostal Coll',
  };

  it('una línia: tipus d’habitació i total, amb les dates a la frase', () => {
    const m = missatgePressupost({ ...base, linies: [{ descripcio: 'Habitació Doble · del 07/12/2026 al 14/12/2026 · 7 nits' }] });
    expect(m).toBe(
      [
        'Bones, Gema!',
        '',
        'T’envio el pressupost per a l’estada a l’Hostal Coll del dilluns 7 de desembre al dilluns 14 de desembre (7 nits):',
        'Habitació Doble — *306,43 €* (IVA inclòs)',
        '',
        'Qualsevol cosa, em dius. Gràcies!',
        'Anna · Hostal Coll',
      ].join('\n'),
    );
  });

  it('diverses línies: les llista senceres i posa el total', () => {
    const m = missatgePressupost({
      ...base,
      idioma: 'es',
      linies: [{ descripcio: 'Habitació Doble · del 07/12/2026 al 10/12/2026 · 3 nits' }, { descripcio: 'Habitació Individual · del 10/12/2026 al 14/12/2026 · 4 nits' }, { descripcio: ' ' }],
    });
    expect(m).toContain('¡Hola, Gema!');
    expect(m).toContain('del lunes 7 de diciembre al lunes 14 de diciembre (7 noches):');
    expect(m).toContain('- Habitació Doble · del 07/12/2026 al 10/12/2026 · 3 nits\n- Habitació Individual');
    expect(m).toContain('*Total: 306,43 €* (IVA incluido)');
    expect(m.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(2);
  });

  it('sense dates ni nom ni IVA', () => {
    const m = missatgePressupost({ ...base, clientNom: '', entrada: null, sortida: null, iva: 0, idioma: 'en', linies: [{ descripcio: 'Room · 3 nights' }] });
    expect(m.split('\n').slice(0, 4)).toEqual(['Hi!', '', 'Here is the quote for your stay at Hostal Coll:', 'Room · 3 nights — *306,43 €*']);
  });
});

describe('telefonWhatsApp', () => {
  it('normalitza el número per a wa.me', () => {
    expect(telefonWhatsApp('+34 612 345 678')).toBe('34612345678');
    expect(telefonWhatsApp('612345678')).toBe('34612345678');
    expect(telefonWhatsApp('0033 6 12 34 56 78')).toBe('33612345678');
    expect(telefonWhatsApp('+44 7700 900123')).toBe('447700900123');
    expect(telefonWhatsApp('123')).toBe('');
    expect(telefonWhatsApp(null)).toBe('');
  });
});
