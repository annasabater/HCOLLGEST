/**
 * mossos/fitxer.ts
 * Generador del "fitxer massiu" de viatgers per al portal de Mossos d'Esquadra.
 *
 * Format CONFIRMAT amb el "Manual d'instruccions de l'usuari del web de registre
 * de viatgers d'establiments d'hostalatge" (v8, actualització maig 2025), apartat
 * 4 "Creació i format dels fitxers" + annex "Exemple fitxer .txt".
 *
 * Estructura (un sol .txt):
 *   - LÍNIA TIPUS 1: dades i identificador de l'establiment (7 camps).
 *   - LÍNIES TIPUS 2: una per viatger (32 camps).
 *   (El tipus 0 — agrupació hotelera — no s'usa: un sol establiment.)
 *
 * Regles de format (§4 "ESPECIFICACIONS GENERALS"):
 *   - Separador "|"; els camps buits CONSERVEN el seu "|".
 *   - Sense abreviatures; alfabet occidental (es conserven accents é, ç, ñ).
 *   - Cognoms compostos amb un sol espai. Valors alfabètics en MAJÚSCULES.
 *   - Cada registre en una línia nova (CRLF), excepte l'últim.
 *   - Dates "yyyyMMdd"; hores "HHmm".
 */
import {
  CODES,
  provinciaToINE,
  municipiToINE,
  paisToISO3,
  esEspanya,
} from './codis';

// ----------------------------------------------------------------------------
// 1. TIPUS DE DADES
// ----------------------------------------------------------------------------

export type TipusRegistre = 'CONTRACTE_EN_CURS' | 'RESERVA';
export type TipusDocument = 'DNI_NIF' | 'NIE' | 'PASSAPORT' | 'ALTRES';
export type Sexe = 'HOME' | 'DONA';
export type TipusPagament = keyof typeof CODES.tipusPagament;
export type Parentesc = keyof typeof CODES.parentesc;

export interface Establiment {
  /** Identificador de l'establiment (9-10 car.) del portal ("Dades de
   *  l'establiment"). Va al NOM del fitxer i al camp "Codi establiment". */
  fileIdentifier: string;
  idPolicial: string; // 000000550 (no s'usa al fitxer)
  nom: string; // HOSTAL COLL
}

export interface Contracte {
  tipusRegistre: TipusRegistre;
  numContracte: string;
  anyContracte: number;
  dataFormalitzacio: Date; // <= avui (camp "data contracte")
  dataEntrada: Date;
  dataSortida: Date; // > dataEntrada
  numViatgers: number;
  tipusPagament: TipusPagament;
  numHabitacions?: number;
  teInternet?: boolean;
}

export interface Viatger {
  tipusDocument?: TipusDocument; // no si menor/reserva
  numDocument?: string;
  numSuport?: string; // 9 car. exactes; oblig. si DNI/NIF o NIE
  dataExpedicio?: Date;
  nom: string;
  cognom1: string;
  cognom2?: string; // oblig. si DNI/NIF
  sexe?: Sexe;
  dataNaixement?: Date; // <= avui; oblig. en contracte en curs
  nacionalitat?: string; // nom de país (es converteix a ISO alfa-3)
  email?: string;
  telefon?: string;
  parentesc?: Parentesc; // oblig. si menor (contracte en curs)
  esMenor?: boolean;
  // Adreça (oblig. si contracte en curs)
  adreca?: string;
  pais?: string; // nom de país (→ ISO alfa-3)
  provincia?: string; // nom (→ INE 2 dígits) si país = Espanya
  municipi?: string; // nom o codi (→ INE 6 dígits) si país = Espanya
  localitat?: string; // si país estranger
  codiPostal?: string;
}

export interface ParteViatgers {
  establiment: Establiment;
  contracte: Contracte;
  viatgers: Viatger[];
  /** Data/hora de confecció del fitxer (línia establiment). Per defecte: ara. */
  generatedAt?: Date;
}

// ----------------------------------------------------------------------------
// 2. CONFIGURACIÓ DE FORMAT
// ----------------------------------------------------------------------------

export type Encoding = 'latin1' | 'utf-8';

const pad = (n: number, w: number) => String(n).padStart(w, '0');

export const CONFIG = {
  separador: '|',
  saltLinia: '\r\n',
  /** App legacy del portal → ISO-8859-1 (latin1). */
  encoding: 'latin1' as Encoding,
  formatFitxer: 'V24', // activa les validacions dels camps nous (manual §4)
  /** Data en "yyyyMMdd". */
  formatData: (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`,
  /** Hora en "HHmm". */
  formatHora: (d: Date) => `${pad(d.getHours(), 2)}${pad(d.getMinutes(), 2)}`,
};

/** ¿Hi ha un layout carregat? Sí: l'estructura oficial està implementada. */
export function isLayoutReady(): boolean {
  return true;
}

/**
 * El format (estructura, ordre de camps i codis) està CONFIRMAT contra el
 * "Manual d'instruccions" oficial v8 (maig 2025) i el seu exemple de fitxer.
 */
export const FORMAT_CONFIRMAT = true;
export function isFormatConfirmat(): boolean {
  return FORMAT_CONFIRMAT;
}

// ----------------------------------------------------------------------------
// 3. MOTOR DE FORMAT
// ----------------------------------------------------------------------------

/** Cognoms compostos: separats per un sol espai (no comes, guions...). */
function normalizaCognom(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/** Majúscules conservant accents (alfabet occidental). */
function up(s: string | undefined): string {
  return (s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Un camp no pot contenir el separador. */
function field(raw: string | number | undefined | null): string {
  const s = raw == null ? '' : String(raw);
  if (s.includes(CONFIG.separador)) {
    throw new Error(`Un camp conté el separador "${CONFIG.separador}": "${s}"`);
  }
  return s.trim();
}

/** Decideix on va el número de document (espanyol vs estranger) segons el tipus. */
function documentSlots(v: Viatger): { espanyol: string; estranger: string } {
  const num = v.numDocument ?? '';
  if (!v.tipusDocument || !num) return { espanyol: '', estranger: '' };
  switch (v.tipusDocument) {
    case 'DNI_NIF':
      return { espanyol: num, estranger: '' };
    case 'NIE':
    case 'ALTRES':
      return { espanyol: '', estranger: num };
    case 'PASSAPORT':
      // Passaport espanyol si la nacionalitat és Espanya; si no, estranger.
      return esEspanya(v.nacionalitat)
        ? { espanyol: num, estranger: '' }
        : { espanyol: '', estranger: num };
  }
}

/** Codi INE del municipi del viatger (necessita la província per desambiguar). */
function municipiCodi(v: Viatger): string {
  const cpro = provinciaToINE(v.provincia);
  return municipiToINE(cpro, v.municipi) ?? '';
}

/** LÍNIA ESTABLIMENT (tipus 1): 7 camps. */
function buildEstablimentLine(p: ParteViatgers): string {
  const now = p.generatedAt ?? new Date();
  const cols = [
    '1',
    field(p.establiment.fileIdentifier),
    field(up(p.establiment.nom)),
    field(CONFIG.formatData(now)),
    field(CONFIG.formatHora(now)),
    field(p.viatgers.length),
    field(CONFIG.formatFitxer),
  ];
  return cols.join(CONFIG.separador);
}

/** LÍNIA VIATGER (tipus 2): 32 camps + "|" final (com a l'exemple oficial). */
function buildViatgerLine(p: ParteViatgers, v: Viatger): string {
  const c = p.contracte;
  const doc = documentSlots(v);
  const cols = [
    '2', // 1 tipus registre
    field(doc.espanyol), // 2 núm document espanyol
    field(doc.estranger), // 3 núm document estranger
    field(v.tipusDocument ? CODES.tipusDocument[v.tipusDocument] : ''), // 4 tipus document
    field(v.dataExpedicio ? CONFIG.formatData(v.dataExpedicio) : ''), // 5 data expedició
    field(up(normalizaCognom(v.cognom1))), // 6 primer cognom
    field(v.cognom2 ? up(normalizaCognom(v.cognom2)) : ''), // 7 segon cognom
    field(up(v.nom)), // 8 nom
    field(v.sexe ? CODES.sexe[v.sexe] : ''), // 9 sexe
    field(v.dataNaixement ? CONFIG.formatData(v.dataNaixement) : ''), // 10 data naixement
    field(paisToISO3(v.nacionalitat) ?? ''), // 11 país nacionalitat (ISO3)
    field(CONFIG.formatData(c.dataEntrada)), // 12 data entrada
    field(CONFIG.formatHora(c.dataEntrada)), // 13 hora entrada
    field(CONFIG.formatData(c.dataSortida)), // 14 data sortida
    field(CONFIG.formatHora(c.dataSortida)), // 15 hora sortida
    field(CONFIG.formatData(c.dataFormalitzacio)), // 16 data contracte
    field(CODES.tipusContracte[c.tipusRegistre]), // 17 tipus contracte
    field(up(c.numContracte)), // 18 núm contracte
    field(c.numViatgers), // 19 núm viatgers
    field(c.numHabitacions != null ? c.numHabitacions : ''), // 20 núm habitacions
    field(CODES.boolSiNo(c.teInternet)), // 21 internet S/N
    field(CODES.tipusPagament[c.tipusPagament]), // 22 tipus pagament
    field(v.telefon ?? ''), // 23 telèfon
    field(v.parentesc ? CODES.parentesc[v.parentesc] : ''), // 24 parentesc
    field(v.email ?? ''), // 25 email
    field(up(v.numSuport)), // 26 núm suport (9 car.)
    field(up(v.adreca)), // 27 direcció postal
    field(esEspanya(v.pais) ? provinciaToINE(v.provincia) ?? '' : ''), // 28 província INE
    field(esEspanya(v.pais) ? municipiCodi(v) : ''), // 29 municipi INE
    field(esEspanya(v.pais) ? '' : up(v.localitat)), // 30 localitat
    field(paisToISO3(v.pais) ?? ''), // 31 país postal (ISO3)
    field(v.codiPostal ?? ''), // 32 codi postal
  ];
  return cols.join(CONFIG.separador) + CONFIG.separador; // "|" final
}

/** Construeix totes les línies del fitxer (1 establiment + N viatgers). */
function buildLines(parte: ParteViatgers): string[] {
  return [buildEstablimentLine(parte), ...parte.viatgers.map((v) => buildViatgerLine(parte, v))];
}

/** Nom del fitxer: {identificador}.{seqüència 001-999} + ".txt". */
export function buildFileName(fileIdentifier: string, sequence: number): string {
  if (!/^[A-Za-z0-9]{9,10}$/.test(fileIdentifier)) {
    throw new Error(`fileIdentifier no vàlid (9-10 alfanum.): "${fileIdentifier}"`);
  }
  const seq = ((sequence - 1) % 999) + 1; // 1..999, reinicia després de 999
  return `${fileIdentifier}.${String(seq).padStart(3, '0')}.txt`;
}

/** Contingut del fitxer com a string (valida §2.3 + codis abans). */
export function buildFitxer(parte: ParteViatgers): string {
  validaParte(parte);
  return buildLines(parte).join(CONFIG.saltLinia) + CONFIG.saltLinia;
}

/** Contingut del fitxer com a Buffer amb la codificació indicada (per descàrrega). */
export function buildFitxerBuffer(parte: ParteViatgers, encoding: Encoding = CONFIG.encoding): Buffer {
  const content = buildFitxer(parte);
  return Buffer.from(content, encoding === 'utf-8' ? 'utf-8' : 'latin1');
}

// ----------------------------------------------------------------------------
// 4. VALIDACIÓ D'OBLIGATORIETAT CONDICIONADA (§2.3 + codificació INE/ISO)
// ----------------------------------------------------------------------------

/** Llista d'errors que impedeixen pujar el fitxer (buida si tot és correcte). */
export function validaParteErrors(parte: ParteViatgers): string[] {
  const errs: string[] = [];
  const c = parte.contracte;
  const esReserva = c.tipusRegistre === 'RESERVA';
  const avui = new Date();

  if (c.dataFormalitzacio > avui) errs.push('La data de contracte no pot ser futura');
  if (c.dataSortida <= c.dataEntrada)
    errs.push('La data de sortida ha de ser posterior a l’entrada');

  parte.viatgers.forEach((v, i) => {
    const p = `Viatger ${i + 1}`;
    if (!v.nom?.trim()) errs.push(`${p}: falta el nom`);
    if (!v.cognom1?.trim()) errs.push(`${p}: falta el primer cognom`);

    // La nacionalitat, si s'informa, ha de tenir codi ISO (qualsevol tipus).
    if (v.nacionalitat?.trim() && !paisToISO3(v.nacionalitat))
      errs.push(`${p}: nacionalitat "${v.nacionalitat}" sense codi ISO 3166-1 (revisa el país)`);

    if (esReserva) {
      if (!v.email?.trim() && !v.telefon?.trim())
        errs.push(`${p}: en reserva cal email o telèfon`);
      return;
    }

    // CONTRACTE EN CURS
    if (!v.esMenor) {
      if (!v.tipusDocument) errs.push(`${p}: falta el tipus de document`);
      if (!v.numDocument?.trim()) errs.push(`${p}: falta el número de document`);
    }
    if (v.tipusDocument === 'DNI_NIF' || v.tipusDocument === 'NIE') {
      if (!v.numSuport?.trim()) errs.push(`${p}: falta el número de suport (DNI/NIE)`);
      else if (v.numSuport.trim().length !== 9)
        errs.push(`${p}: el número de suport ha de tenir 9 caràcters exactes`);
    }
    if (v.tipusDocument === 'DNI_NIF' && !v.cognom2?.trim())
      errs.push(`${p}: falta el segon cognom (obligatori amb DNI/NIF)`);
    if (v.esMenor && !v.parentesc) errs.push(`${p}: falta el parentesc (menor)`);
    if (v.dataNaixement && v.dataNaixement > avui)
      errs.push(`${p}: la data de naixement no pot ser futura`);
    if (v.dataExpedicio && v.dataExpedicio > avui)
      errs.push(`${p}: la data d’expedició no pot ser futura`);
    if (!v.adreca?.trim()) errs.push(`${p}: falta l’adreça (contracte en curs)`);
    if (!v.codiPostal?.trim()) errs.push(`${p}: falta el codi postal`);

    // Dades postals: codificació INE (Espanya) o localitat (estranger).
    if (esEspanya(v.pais)) {
      if (!v.provincia?.trim()) errs.push(`${p}: falta la província (país = Espanya)`);
      else if (!provinciaToINE(v.provincia))
        errs.push(`${p}: província "${v.provincia}" sense codi INE`);
      if (!v.municipi?.trim()) errs.push(`${p}: falta el municipi (país = Espanya)`);
      else if (!municipiToINE(provinciaToINE(v.provincia), v.municipi))
        errs.push(`${p}: municipi "${v.municipi}" no trobat al padró INE de la província`);
    } else if (v.pais?.trim()) {
      if (!paisToISO3(v.pais)) errs.push(`${p}: país "${v.pais}" sense codi ISO 3166-1`);
      if (!v.localitat?.trim()) errs.push(`${p}: falta la localitat (país estranger)`);
    }
  });

  return errs;
}

/** Valida el parte i llança si falta algun requisit per pujar a Mossos. */
export function validaParte(parte: ParteViatgers): void {
  const errs = validaParteErrors(parte);
  if (errs.length) throw new Error('Validació fallida:\n - ' + errs.join('\n - '));
}

// ----------------------------------------------------------------------------
// 5. Helpers exportats
// ----------------------------------------------------------------------------
export const helpers = { normalizaCognom, up };
