/**
 * Receptes de les fotos del manual: què cal fer a la pantalla abans de la
 * captura (obrir un formulari, una pestanya…) quan no n'hi ha prou amb obrir la
 * ruta. La clau és l'id de la marca [FOTO id=…] del capítol.
 */
export type Accio = { clic: string } | { omple: [string, string] } | { espera: number } | { scroll: string };

export interface Recepta {
  /** Ruta que substitueix la de la marca (amb els ids ja resolts o fixos). */
  ruta?: string;
  /** Accions abans de buscar les marques. */
  abans?: Accio[];
  /** Marques que substitueixen les del text (quan el text de la UI és diferent). */
  marques?: string[];
  /** Pàgina sencera en lloc de només el que es veu. */
  sencera?: boolean;
  /** Sense sessió iniciada (p. ex. la pantalla d'entrada). */
  sensesessio?: boolean;
  /** No obrir les targetes plegables. */
  noObrir?: boolean;
  /** Mida de pantalla diferent (p. ex. mòbil). */
  mida?: { width: number; height: number };
  /** Text on centrar la vista si no es troba cap marca. */
  scrollA?: string;
  /** No fer aquesta foto (es treu del manual o es fa a mà). */
  ometre?: boolean;
}


