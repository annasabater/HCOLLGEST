import type { Recepta } from './tipus';

/** Receptes de les fotos del capítol «benvinguda». */
export const R_BENVINGUDA: Record<string, Recepta> = {
  // Pantalla alta perquè el menú granat es vegi sencer (amb el bloc «Ajuda»).
  'bv-menu-complet': { mida: { width: 1180, height: 1060 } },
  // Tauleta (menys de 1024 px): el menú està amagat; l'obrim amb les tres ratlles.
  'bv-tauleta-menu': { mida: { width: 820, height: 1180 }, abans: [{ clic: 'Obrir menú' }, { espera: 500 }] },
};
