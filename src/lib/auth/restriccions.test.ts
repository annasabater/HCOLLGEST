import { describe, it, expect } from 'vitest';
import { teVistaRestringida, ocultaDelLlibre, MARCA_OCULTA_LLIBRE } from './restriccions';

describe('teVistaRestringida', () => {
  it('és cert per al compte de propietat (insensible a majúscules)', () => {
    expect(teVistaRestringida({ email: 'hcoll@gmail.com' })).toBe(true);
    expect(teVistaRestringida({ email: 'HColl@Gmail.com' })).toBe(true);
  });

  it('és fals per a l’admin i altres comptes', () => {
    expect(teVistaRestringida({ email: 'hostalcoll@gmail.com' })).toBe(false);
    expect(teVistaRestringida({ email: 'recepcio@hostalcoll.com' })).toBe(false);
  });

  it('és fals sense usuari o sense email', () => {
    expect(teVistaRestringida(null)).toBe(false);
    expect(teVistaRestringida(undefined)).toBe(false);
    expect(teVistaRestringida({ email: null })).toBe(false);
    expect(teVistaRestringida({})).toBe(false);
  });
});

describe('ocultaDelLlibre', () => {
  it('detecta la marca ZP11 a observacions (insensible a majúscules, com a subcadena)', () => {
    expect(ocultaDelLlibre('ZP11')).toBe(true);
    expect(ocultaDelLlibre('habitació zp11 reservada')).toBe(true);
    expect(ocultaDelLlibre(`nota ${MARCA_OCULTA_LLIBRE} fi`)).toBe(true);
  });

  it('no oculta observacions normals, buides o nul·les', () => {
    expect(ocultaDelLlibre('observació normal')).toBe(false);
    expect(ocultaDelLlibre('')).toBe(false);
    expect(ocultaDelLlibre(null)).toBe(false);
    expect(ocultaDelLlibre(undefined)).toBe(false);
  });
});
