import type { Recepta } from './tipus';

/** Receptes de les fotos del capítol «recorreguts». */
export const R_RECORREGUTS: Record<string, Recepta> = {
  // Dades del dia (sortida avui, benvinguda pendent): scripts/manual/demo-extra/dia-a-dia.ts.
  // Amb una sola sortida el tauler diu «1 sortida avui».
  'rc-mati-tauler': {
    mida: { width: 1180, height: 1400 },
    marques: ['sortida avui', 'Benvingudes pendents', "Pendents d'enviar a Mossos", 'Firmes pendents', 'Cobraments pendents', 'Estades a facturar'],
  },
};
