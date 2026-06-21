/**
 * mossos/fitxer.ts
 * Generador del "fitxer massiu" de viatgers para el portal de Mossos d'Esquadra.
 *
 * ESTADO:
 *   ✅ Motor de formato y validación: COMPLETO y correcto según las reglas
 *      documentadas (separador "|", campos vacíos que conservan su "|",
 *      nombre de fichero con secuencia, alfabeto occidental, etc.).
 *   ⛔ FALTA (§9.1/§9.4): el ORDEN y la ESTRUCTURA exactos de los campos
 *      (FIELD_LAYOUT) y los CÓDIGOS literales de los enums. Eso SOLO está en el
 *      "Manual d'instruccions de l'usuari" del portal (apartado "Documentació i
 *      enllaços", sección de fitxers massius). NO inventarlo.
 *      En cuanto se rellene FIELD_LAYOUT/CODES con el manual, queda 100% listo.
 */

// ----------------------------------------------------------------------------
// 1. TIPOS DE DATOS (coinciden con el modelo de datos único ya consolidado)
// ----------------------------------------------------------------------------

export type TipusRegistre = 'CONTRACTE_EN_CURS' | 'RESERVA';
export type TipusDocument = 'DNI_NIF' | 'NIE' | 'PASSAPORT' | 'ALTRES';
export type Sexe = 'HOME' | 'DONA';
export type TipusPagament =
  | 'DESTINACIO'
  | 'EFECTIU'
  | 'MOBIL'
  | 'PLATAFORMA'
  | 'TARGETA_CREDIT'
  | 'TRANSFERENCIA'
  | 'TARGETA_REGAL';

export interface Establiment {
  /** Identificador para el NOMBRE del fichero (9-10 car., p.ej. "08043AAR02").
   *  ⚠ NO es el "Id policial" numérico (000000550). Confírmalo en el portal. */
  fileIdentifier: string;
  idPolicial: string; // 000000550
  nom: string; // HOSTAL COLL
}

export interface Contracte {
  tipusRegistre: TipusRegistre;
  numContracte: string;
  anyContracte: number; // p.ej. 2026
  dataFormalitzacio: Date; // <= hoy
  dataEntrada: Date;
  dataSortida: Date; // > dataEntrada
  numViatgers: number;
  tipusPagament: TipusPagament;
  numHabitacions?: number;
  teInternet?: boolean;
}

export interface Viatger {
  tipusDocument?: TipusDocument; // no si menor/reserva
  numDocument?: string; // no si menor/reserva
  numSuport?: string; // oblig. si DNI/NIF o NIE
  dataExpedicio?: Date;
  nom: string;
  cognom1: string;
  cognom2?: string; // oblig. si DNI/NIF
  sexe?: Sexe;
  dataNaixement?: Date; // <= hoy
  nacionalitat?: string;
  email?: string; // reserva: email O telefon
  telefon?: string;
  parentesc?: string; // oblig. si menor (en contracte en curs)
  esMenor?: boolean;
  // Dirección (oblig. si contracte en curs)
  adreca?: string;
  pais?: string;
  provincia?: string; // si pais = Espanya
  municipi?: string; // si pais = Espanya
  localitat?: string; // si pais = estranger
  codiPostal?: string;
}

export interface ParteViatgers {
  establiment: Establiment;
  contracte: Contracte;
  viatgers: Viatger[];
}

// ----------------------------------------------------------------------------
// 2. CONFIGURACIÓN DE FORMATO
// ----------------------------------------------------------------------------

export type Encoding = 'latin1' | 'utf-8';

export const CONFIG = {
  separador: '|',
  saltLinia: '\r\n',
  // ⚠ §9.3 CONFIRMAR EN EL MANUAL: app Java legacy -> probablemente ISO-8859-1.
  encoding: 'latin1' as Encoding,
  formatData: (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/` +
    `${String(d.getMonth() + 1).padStart(2, '0')}/` +
    `${d.getFullYear()}`, // ⚠ §9 CONFIRMAR formato exacto (dd/mm/aaaa vs aaaammdd)
};

/** Códigos LITERALES que espera el fichero por cada enum.
 *  ⚠ §9.4 Los valores de la derecha son PROVISIONALES: el manual indica el código
 *  exacto (p.ej. puede ser "D"/"N"/"P", "1"/"2", etc.). Ajustar al confirmarlos. */
export const CODES = {
  tipusRegistre: { CONTRACTE_EN_CURS: 'C', RESERVA: 'R' }, // TODO §9.4
  tipusDocument: { DNI_NIF: 'D', NIE: 'N', PASSAPORT: 'P', ALTRES: 'A' }, // TODO §9.4
  sexe: { HOME: 'H', DONA: 'D' }, // TODO §9.4
  tipusPagament: {
    // TODO §9.4
    DESTINACIO: '',
    EFECTIU: '',
    MOBIL: '',
    PLATAFORMA: '',
    TARGETA_CREDIT: '',
    TRANSFERENCIA: '',
    TARGETA_REGAL: '',
  },
  boolSiNo: (b?: boolean) => (b ? 'SI' : 'NO'),
};

// ----------------------------------------------------------------------------
// 3. LAYOUT DEL FICHERO  ⛔ RELLENAR CON EL ORDEN EXACTO DEL MANUAL (§9.1)
// ----------------------------------------------------------------------------
/**
 * Cada entrada = una columna del registro, en el ORDEN que diga el manual.
 * `value` extrae el dato del parte. El motor de abajo ya hace todo lo demás.
 *
 * Pendiente de confirmar también la ESTRUCTURA: ¿una línea por viajero con los
 * datos del contrato repetidos? ¿o una línea de cabecera (contrato) + N líneas
 * de viajero? Se ajusta en buildLines() según lo que indique el manual.
 *
 * Ejemplo ILUSTRATIVO (NO es el orden real):
 */
export type FieldDef = { name: string; value: (p: ParteViatgers, v: Viatger) => string };

export const FIELD_LAYOUT: FieldDef[] = [
  // { name: 'tipus_registre', value: (p) => CODES.tipusRegistre[p.contracte.tipusRegistre] },
  // { name: 'id_policial',    value: (p) => p.establiment.idPolicial },
  // { name: 'num_contracte',  value: (p) => p.contracte.numContracte },
  // { name: 'data_entrada',   value: (p) => CONFIG.formatData(p.contracte.dataEntrada) },
  // { name: 'nom',            value: (_, v) => v.nom },
  // { name: 'cognom1',        value: (_, v) => v.cognom1 },
  // ... (completar con TODAS las columnas del manual, en su orden)
];

/** ¿Está ya configurado el layout del manual (§9.1)? */
export function isLayoutReady(): boolean {
  return FIELD_LAYOUT.length > 0;
}

// ----------------------------------------------------------------------------
// 4. MOTOR DE FORMATO (completo)
// ----------------------------------------------------------------------------

/** Apellidos compuestos: separados por un solo espacio (no comas, guiones...). */
function normalizaCognom(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/** Un campo no puede contener el separador. Se mantiene el alfabeto occidental
 *  (NO se quitan acentos: é, ç, ñ son válidos). Sin abreviaturas. */
function formatField(raw: string | undefined): string {
  const s = (raw ?? '').toString();
  if (s.includes(CONFIG.separador)) {
    throw new Error(`Un campo contiene el separador "${CONFIG.separador}": "${s}"`);
  }
  return s.trim();
}

/** Construye las líneas del fichero a partir del layout.
 *  (Ahora: una línea por viajero. Ajustar si el manual pide cabecera+detalle.)
 *  Acepta un `layout` para poder probar el motor sin tocar el stub de producción. */
function buildLines(parte: ParteViatgers, layout: FieldDef[] = FIELD_LAYOUT): string[] {
  if (layout.length === 0) {
    throw new Error(
      'FIELD_LAYOUT vacío: falta el orden de campos del manual de Mossos (§9.1). ' +
        'Rellena src/lib/mossos/fitxer.ts → FIELD_LAYOUT con las columnas del ' +
        '"Manual d\'instruccions de l\'usuari" antes de generar el fitxer.',
    );
  }
  return parte.viatgers.map((v) =>
    layout.map((f) => formatField(f.value(parte, v))).join(CONFIG.separador),
  );
}

/** Nombre del fichero: {identificador}.{secuencia 001-999} + ".txt". */
export function buildFileName(fileIdentifier: string, sequence: number): string {
  if (!/^[A-Za-z0-9]{9,10}$/.test(fileIdentifier)) {
    throw new Error(`fileIdentifier inválido (9-10 alfanum.): "${fileIdentifier}"`);
  }
  const seq = ((sequence - 1) % 999) + 1; // 1..999, reinicia tras 999
  return `${fileIdentifier}.${String(seq).padStart(3, '0')}.txt`;
}

/** Devuelve el contenido del fichero como string. Codificar al escribir con
 *  CONFIG.encoding (o el de la establiment). */
export function buildFitxer(parte: ParteViatgers, layout: FieldDef[] = FIELD_LAYOUT): string {
  validaParte(parte);
  return buildLines(parte, layout).join(CONFIG.saltLinia) + CONFIG.saltLinia;
}

/**
 * Devuelve el contenido del fichero como Buffer con la codificación indicada,
 * listo para descarga/escritura a disco. Para 'latin1' usa la codificación
 * legacy (ISO-8859-1) que probablemente espera el portal (§9.3).
 */
export function buildFitxerBuffer(
  parte: ParteViatgers,
  encoding: Encoding = CONFIG.encoding,
  layout: FieldDef[] = FIELD_LAYOUT,
): Buffer {
  const content = buildFitxer(parte, layout);
  return Buffer.from(content, encoding === 'utf-8' ? 'utf-8' : 'latin1');
}

// ----------------------------------------------------------------------------
// 5. VALIDACIÓN DE OBLIGATORIEDAD CONDICIONAL (reglas oficiales §2.3)
// ----------------------------------------------------------------------------

export function validaParte(parte: ParteViatgers): void {
  const errs: string[] = [];
  const c = parte.contracte;
  const esReserva = c.tipusRegistre === 'RESERVA';

  if (c.dataFormalitzacio > new Date()) errs.push('data_formalitzacio > hoy');
  if (c.dataSortida <= c.dataEntrada) errs.push('data_sortida <= data_entrada');

  parte.viatgers.forEach((v, i) => {
    const p = `viatger[${i}]`;
    if (!v.nom?.trim()) errs.push(`${p}: falta nom`);
    if (!v.cognom1?.trim()) errs.push(`${p}: falta cognom1`);

    if (esReserva) {
      if (!v.email?.trim() && !v.telefon?.trim())
        errs.push(`${p}: en reserva hace falta email o telèfon`);
      return; // en reserva no se exige el resto
    }

    // CONTRACTE EN CURS
    if (!v.esMenor) {
      if (!v.tipusDocument) errs.push(`${p}: falta tipus_document`);
      if (!v.numDocument?.trim()) errs.push(`${p}: falta num_document`);
    }
    if (v.tipusDocument === 'DNI_NIF' || v.tipusDocument === 'NIE') {
      if (!v.numSuport?.trim()) errs.push(`${p}: falta num_suport (DNI/NIE)`);
    }
    if (v.tipusDocument === 'DNI_NIF' && !v.cognom2?.trim())
      errs.push(`${p}: falta cognom2 (oblig. con DNI/NIF)`);
    if (v.esMenor && !v.parentesc?.trim()) errs.push(`${p}: falta parentesc (menor)`);
    if (v.dataNaixement && v.dataNaixement > new Date())
      errs.push(`${p}: data_naixement > hoy`);
    if (v.dataExpedicio && v.dataExpedicio > new Date())
      errs.push(`${p}: data_expedicio > hoy`);
    if (!v.adreca?.trim()) errs.push(`${p}: falta adreça (contracte en curs)`);
    if (!v.codiPostal?.trim()) errs.push(`${p}: falta codi_postal`);
    if (v.pais === 'Espanya') {
      if (!v.provincia?.trim()) errs.push(`${p}: falta província (país=Espanya)`);
      if (!v.municipi?.trim()) errs.push(`${p}: falta municipi (país=Espanya)`);
    } else if (v.pais && !v.localitat?.trim()) {
      errs.push(`${p}: falta localitat (país estranger)`);
    }
  });

  if (errs.length) throw new Error('Validación fallida:\n - ' + errs.join('\n - '));
}

// ----------------------------------------------------------------------------
// 6. Apellidos compuestos: helper exportado por si se normaliza en la entrada
// ----------------------------------------------------------------------------
export const helpers = { normalizaCognom };
