import { describe, it, expect } from 'vitest';
import {
  fillTemplate,
  waLink,
  descriuTasques,
  PLANTILLA_NETEJA,
  PASILLO_TXT,
  PATI_TXT,
  HORA_NETEJA_TXT,
} from './plantilles';

describe('fillTemplate', () => {
  it('substitueix les claus', () => {
    expect(fillTemplate('Bones {nom}, a les {hora}', { nom: 'Anna', hora: '11h' })).toBe(
      'Bones Anna, a les 11h',
    );
  });
  it('claus absents queden buides', () => {
    expect(fillTemplate('Hola {x}', {})).toBe('Hola ');
  });
});

describe('waLink', () => {
  it('genera wa.me amb número net i text codificat', () => {
    expect(waLink('+34 600 11 22 33', 'hola mon')).toBe('https://wa.me/34600112233?text=hola%20mon');
  });
  it('sense número obre el selector de contactes', () => {
    expect(waLink('', 'hi')).toBe('https://wa.me/?text=hi');
  });
});

describe('descriuTasques', () => {
  it('descriu salida/repaso en castellà', () => {
    expect(
      descriuTasques(
        [
          { habitacio: '1', tipus: 'CANVI_COMPLET' },
          { habitacio: '2', tipus: 'REPAS' },
        ],
        'es',
      ),
    ).toBe('la habitación 1: salida (a fondo), la 2: repaso');
  });
  it('descriu en català', () => {
    expect(
      descriuTasques([{ habitacio: '3', tipus: 'CANVI_COMPLET' }], 'ca'),
    ).toBe('l’habitació 3: sortida (a fons)');
  });
  it('descriu en anglès', () => {
    expect(
      descriuTasques([{ habitacio: '4', tipus: 'REPAS' }], 'en'),
    ).toBe('room 4: touch-up');
  });
  it('sense tasques', () => {
    expect(descriuTasques([], 'es')).toBe('no hay habitaciones asignadas');
  });
});

describe('plantilla de neteja (passadís, pati i hora)', () => {
  const habitacions = descriuTasques([{ habitacio: '1', tipus: 'CANVI_COMPLET' }], 'es');

  it('passadís + pati + hora tots actius', () => {
    const msg = fillTemplate(PLANTILLA_NETEJA.es, {
      nom: 'Tania',
      data: '24/06/2026',
      habitacions,
      pasillo: PASILLO_TXT.es,
      pati: PATI_TXT.es,
      hora: fillTemplate(HORA_NETEJA_TXT.es, { hora: '11:00' }),
    });
    expect(msg).toBe(
      'Buenas Tania, mañana (24/06/2026) tienes: la habitación 1: salida (a fondo). También el pasillo. También el patio. Puedes venir sobre las 11:00. ¡Gracias!',
    );
  });

  it('opcions desactivades no deixen rastre', () => {
    const msg = fillTemplate(PLANTILLA_NETEJA.es, {
      nom: 'Tania',
      data: '24/06/2026',
      habitacions,
      pasillo: '',
      pati: '',
      hora: '',
    });
    expect(msg).toBe('Buenas Tania, mañana (24/06/2026) tienes: la habitación 1: salida (a fondo). ¡Gracias!');
  });
});
