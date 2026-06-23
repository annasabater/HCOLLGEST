import { describe, it, expect } from 'vitest';
import { fillTemplate, waLink, descriuTasques } from './plantilles';

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
