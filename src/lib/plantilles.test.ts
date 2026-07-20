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

describe('descriuTasques (una línia per habitació)', () => {
  it('una línia per habitació amb guió (castellà)', () => {
    expect(
      descriuTasques(
        [
          { habitacio: '1', tipus: 'REPAS' },
          { habitacio: '4', tipus: 'REPAS' },
          { habitacio: '5', tipus: 'CANVI_COMPLET' },
        ],
        'es',
      ),
    ).toBe('- Núm. 1: mantenimiento.\n- Núm. 4: mantenimiento.\n- Núm. 5: salida.');
  });
  it('afegeix la nota d’animal (català)', () => {
    expect(
      descriuTasques([{ habitacio: '2', tipus: 'REPAS', animal: 'un gat' }], 'ca'),
    ).toBe('- Núm. 2: manteniment. Hi ha un animal de companyia, un gat.');
  });
  it('descriu en català', () => {
    expect(descriuTasques([{ habitacio: '3', tipus: 'CANVI_COMPLET' }], 'ca')).toBe('- Núm. 3: sortida.');
  });
  it('descriu en anglès', () => {
    expect(descriuTasques([{ habitacio: '4', tipus: 'REPAS' }], 'en')).toBe('- Room 4: maintenance.');
  });
  it('sense tasques', () => {
    expect(descriuTasques([], 'es')).toBe('no hay habitaciones asignadas');
  });
});

describe('zonesComunesTxt', () => {
  it('combina les tres zones en una frase (recordatori diari)', () => {
    expect(zonesComunesTxt('es', { pasillo: true, pati: true, vorera: true })).toBe(
      'Ten en cuenta que cada día también habrá que hacer el pasillo, el patio y la acera.',
    );
  });
  it('dues zones', () => {
    expect(zonesComunesTxt('es', { pasillo: true, pati: true })).toBe(
      'Ten en cuenta que cada día también habrá que hacer el pasillo y el patio.',
    );
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
        habitacions,
        zones: zonesComunesTxt('es', { pasillo: true, pati: true, vorera: true }),
        hora: fillTemplate(HORA_NETEJA_TXT.es, { hora: '11:00' }),
      }),
    );
    expect(msg).toBe(
      '¡Hola Rossy! 😊\n' +
        'Te paso el trabajo de mañana:\n' +
        '🛏️ Habitaciones:\n' +
        '- Núm. 1: mantenimiento.\n' +
        '- Núm. 4: mantenimiento.\n' +
        '- Núm. 5: salida.\n' +
        'Ten en cuenta que cada día también habrá que hacer el pasillo, el patio y la acera. Puedes venir sobre las 11:00.\n' +
        '¡Muchas gracias!',
    );
  });

  it('opcions desactivades no deixen rastre (ni línies buides)', () => {
    const msg = netejaLinies(
      fillTemplate(PLANTILLA_NETEJA.es, {
        nom: 'Rossy',
        habitacions: descriuTasques([{ habitacio: '1', tipus: 'CANVI_COMPLET' }], 'es'),
        zones: '',
        hora: '',
      }),
    );
    expect(msg).toBe(
      '¡Hola Rossy! 😊\nTe paso el trabajo de mañana:\n🛏️ Habitaciones:\n- Núm. 1: salida.\n¡Muchas gracias!',
    );
  });
});
