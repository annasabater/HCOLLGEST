import { describe, it, expect } from 'vitest';
import {
  fillTemplate,
  waLink,
  descriuTasques,
  netejaLinies,
  zonesComunesTxt,
  PLANTILLA_NETEJA,
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

describe('descriuTasques (agrupades per tipus, multilínia)', () => {
  it('agrupa mantenimiento i salida en línies separades (castellà)', () => {
    expect(
      descriuTasques(
        [
          { habitacio: '1', tipus: 'REPAS' },
          { habitacio: '4', tipus: 'REPAS' },
          { habitacio: '5', tipus: 'CANVI_COMPLET' },
        ],
        'es',
      ),
    ).toBe('las habitaciones Nº1 y la Nº4: mantenimiento\nla habitación Nº5: salida');
  });
  it('tres habitacions del mateix tipus', () => {
    expect(
      descriuTasques(
        [
          { habitacio: '1', tipus: 'REPAS' },
          { habitacio: '2', tipus: 'REPAS' },
          { habitacio: '4', tipus: 'REPAS' },
        ],
        'es',
      ),
    ).toBe('las habitaciones Nº1, la Nº2 y la Nº4: mantenimiento');
  });
  it('descriu en català', () => {
    expect(
      descriuTasques([{ habitacio: '3', tipus: 'CANVI_COMPLET' }], 'ca'),
    ).toBe('l’habitació Nº3: sortida');
  });
  it('descriu en anglès', () => {
    expect(
      descriuTasques([{ habitacio: '4', tipus: 'REPAS' }], 'en'),
    ).toBe('room Nº4: maintenance');
  });
  it('sense tasques', () => {
    expect(descriuTasques([], 'es')).toBe('no hay habitaciones asignadas');
  });
});

describe('zonesComunesTxt', () => {
  it('combina les tres zones en una frase', () => {
    expect(zonesComunesTxt('es', { pasillo: true, pati: true, vorera: true })).toBe(
      'También el pasillo, el patio y la acera.',
    );
  });
  it('dues zones', () => {
    expect(zonesComunesTxt('es', { pasillo: true, pati: true })).toBe('También el pasillo y el patio.');
  });
  it('cap zona → buit', () => {
    expect(zonesComunesTxt('es', {})).toBe('');
  });
});

describe('plantilla de neteja (multilínia)', () => {
  const habitacions = descriuTasques(
    [
      { habitacio: '1', tipus: 'REPAS' },
      { habitacio: '4', tipus: 'REPAS' },
      { habitacio: '5', tipus: 'CANVI_COMPLET' },
    ],
    'es',
  );

  it('missatge complet amb zones i hora', () => {
    const msg = netejaLinies(
      fillTemplate(PLANTILLA_NETEJA.es, {
        nom: 'Rossy',
        data: '06/07/2026',
        habitacions,
        zones: zonesComunesTxt('es', { pasillo: true, pati: true, vorera: true }),
        hora: fillTemplate(HORA_NETEJA_TXT.es, { hora: '11:00' }),
      }),
    );
    expect(msg).toBe(
      '¡Hola Rossy! 😊 Para mañana (06/07/2026) tendríamos:\n' +
        'las habitaciones Nº1 y la Nº4: mantenimiento\n' +
        'la habitación Nº5: salida\n' +
        'También el pasillo, el patio y la acera. Puedes venir sobre las 11:00.\n' +
        '¡Muchísimas gracias!',
    );
  });

  it('opcions desactivades no deixen rastre (ni línies buides)', () => {
    const msg = netejaLinies(
      fillTemplate(PLANTILLA_NETEJA.es, {
        nom: 'Rossy',
        data: '06/07/2026',
        habitacions: descriuTasques([{ habitacio: '1', tipus: 'CANVI_COMPLET' }], 'es'),
        zones: '',
        hora: '',
      }),
    );
    expect(msg).toBe(
      '¡Hola Rossy! 😊 Para mañana (06/07/2026) tendríamos:\nla habitación Nº1: salida\n¡Muchísimas gracias!',
    );
  });
});
