/** Totes les receptes de fotos (una per capítol, perquè es puguin editar per separat). */
import type { Recepta } from './tipus';
import { R_BENVINGUDA } from './benvinguda';
import { R_RECORREGUTS } from './recorreguts';
import { R_ESTADES } from './estades';
import { R_HOSTES } from './hostes';
import { R_MOSSOS } from './mossos';
import { R_FACTURES } from './factures';
import { R_COMPTABILITAT } from './comptabilitat';
import { R_DIA_A_DIA } from './dia-a-dia';
import { R_CONFIGURACIO } from './configuracio';
import { R_INSPECCIO } from './inspeccio';

export type { Recepta, Accio } from './tipus';
export const RECEPTES: Record<string, Recepta> = {
  ...R_BENVINGUDA,
  ...R_RECORREGUTS,
  ...R_ESTADES,
  ...R_HOSTES,
  ...R_MOSSOS,
  ...R_FACTURES,
  ...R_COMPTABILITAT,
  ...R_DIA_A_DIA,
  ...R_CONFIGURACIO,
  ...R_INSPECCIO,
};
