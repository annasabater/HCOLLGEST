/**
 * Fitxers d'autoliquidació de l'AEAT en format «diseño de registro» (posicional,
 * ISO-8859-1, sense salts de línia). Són els fitxers que el formulari de la Sede
 * importa («Importar») i que el servei de Presentació Directa (PresBasicaDos)
 * rep al camp F01.
 *
 * Cada pàgina es descriu camp a camp amb la POSICIÓ i la LONGITUD del disseny
 * oficial; `pagina()` comprova que les posicions quadren exactament (si no,
 * llença un error) — així un camp mal comptat no arriba mai a l'AEAT.
 * Funcions PURES i testejables.
 */

/**
 * Tipus de camp del disseny de registre:
 *  - An: alfanumèric, alineat a l'esquerra i farcit amb blancs.
 *  - Num: numèric sense signe, alineat a la dreta i farcit amb zeros.
 *  - N: numèric amb signe; els negatius porten una «N» a la primera posició.
 */
export type TipusCamp = 'An' | 'Num' | 'N';

export interface Camp {
  /** Posició inicial (1-based) segons el disseny oficial. */
  pos: number;
  lon: number;
  tipus: TipusCamp;
  /** Text (An), enter ja en el format final (Num) o import en euros (imports). */
  valor: string | number | null | undefined;
  /** El valor és un import en euros: es posa en cèntims (15 enters + 2 decimals). */
  import?: boolean;
}

/** Text en majúscules, sense accents (excepte Ñ i Ç) i només lletres, números i blancs. */
export function netejaText(s: string): string {
  return s
    .toUpperCase()
    .replace(/[ÀÁÂÄ]/g, 'A').replace(/[ÈÉÊË]/g, 'E').replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÖ]/g, 'O').replace(/[ÙÚÛÜ]/g, 'U')
    .replace(/[^A-Z0-9ÑÇ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formata(c: Camp): string {
  const v = c.valor;
  if (c.tipus === 'An') {
    const t = v == null ? '' : netejaText(String(v));
    return t.slice(0, c.lon).padEnd(c.lon, ' ');
  }
  // Numèric: imports en cèntims; la resta, enters.
  const n = v == null || v === '' ? 0 : Number(v);
  if (!Number.isFinite(n)) throw new Error(`Valor numèric no vàlid a la posició ${c.pos}: ${v}`);
  const enter = c.import ? Math.round(n * 100) : Math.round(n);
  if (enter < 0 && c.tipus !== 'N') throw new Error(`Import negatiu en un camp sense signe (posició ${c.pos})`);
  const abs = String(Math.abs(enter));
  const amplada = enter < 0 ? c.lon - 1 : c.lon;
  if (abs.length > amplada) throw new Error(`Import massa gran per a la posició ${c.pos}`);
  return (enter < 0 ? 'N' : '') + abs.padStart(amplada, '0');
}

/** Constant alfanumèrica (literal tal qual, sense netejar: «<T», «</AUX>»…). */
export function constant(pos: number, text: string): Camp & { literal: true } {
  return { pos, lon: text.length, tipus: 'An', valor: text, literal: true };
}

/** Blancs (camps reservats). */
export function blancs(pos: number, lon: number): Camp {
  return { pos, lon, tipus: 'An', valor: '' };
}

/**
 * Munta una pàgina: els camps han d'anar en ordre i contigus, i sumar `total`
 * posicions. Si el disseny no quadra, llença un error (mai un fitxer mal format).
 */
export function pagina(camps: (Camp & { literal?: boolean })[], total: number): string {
  let out = '';
  for (const c of camps) {
    if (c.pos !== out.length + 1) {
      throw new Error(`Disseny no quadra: el camp de la posició ${c.pos} cau a la ${out.length + 1}`);
    }
    out += c.literal ? String(c.valor) : formata(c);
  }
  if (out.length !== total) throw new Error(`Disseny no quadra: ${out.length} posicions en lloc de ${total}`);
  return out;
}

export interface Capcalera {
  model: string;
  any: number;
  /** "1T"…"4T", "0A" (anual)… */
  periode: string;
  /** Versió del programa (4 car.) i NIF de l'entitat desenvolupadora (9). */
  versio: string;
  nifDesenvolupador: string;
}

/**
 * Embolcall comú «<T{model}0{any}{periode}0000><AUX>…</AUX>{pàgines}</T…>»
 * (registre DR xxx00 de tots els models d'autoliquidació).
 */
export function fitxer(h: Capcalera, pagines: string[]): string {
  const id = `${h.model}0${h.any}${h.periode}0000>`;
  const aux = pagina(
    [
      constant(1, '<AUX>'),
      blancs(6, 70),
      { pos: 76, lon: 4, tipus: 'An', valor: h.versio },
      blancs(80, 4),
      { pos: 84, lon: 9, tipus: 'An', valor: h.nifDesenvolupador },
      blancs(93, 213),
      constant(306, '</AUX>'),
    ],
    311,
  );
  return `<T${id}${aux}${pagines.join('')}</T${id}`;
}

/** Bytes del fitxer en ISO-8859-1 (la codificació que demana l'AEAT). */
export function bytesFitxer(contingut: string): Buffer {
  return Buffer.from(contingut, 'latin1');
}

/**
 * Separa «Nom Cognom1 Cognom2» en nom i cognoms (persona física): els dos
 * últims mots són els cognoms. Es pot revisar a la pantalla abans de baixar-lo.
 */
export function separaNom(complet: string): { nom: string; cognoms: string } {
  const mots = complet.trim().split(/\s+/).filter(Boolean);
  if (mots.length <= 1) return { nom: '', cognoms: mots.join(' ') };
  if (mots.length === 2) return { nom: mots[0]!, cognoms: mots[1]! };
  return { nom: mots.slice(0, -2).join(' '), cognoms: mots.slice(-2).join(' ') };
}

/** IBAN sense espais, en majúscules (camp de 34 posicions). */
export const netejaIban = (iban: string | null | undefined) => (iban ?? '').replace(/\s+/g, '').toUpperCase();
