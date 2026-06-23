/**
 * mossos/fitxer.ts
 * Generador del "fitxer massiu" de viatgers para el portal de Mossos d'Esquadra.
 *
 * ESTADO:
 *   ✅ Motor de formato y validación: COMPLETO y correcto según las reglas
 *      documentadas (separador "|", campos vacíos que conservan su "|",
 *      nombre de fichero con secuencia, alfabeto occidental, etc.).
 *   ⚠ PROVISIONAL (§9.1/§9.4): FIELD_LAYOUT y CODES están rellenos con una
 *      versión best-effort (INT/1922/2003 + RD 933/2021), pero el ORDEN, la
 *      ESTRUCTURA y los CÓDIGOS exactos están en el "Manual d'instruccions de
 *      l'usuari" del portal (apartado "Documentació i enllaços"). Verifícalos
 *      ahí antes de usar el fichero en real y pon FORMAT_CONFIRMAT = true.
 *      Mientras sea false, el fichero se marca como provisional.
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
 *  ⚠ §9.4 PROVISIONALES (best-effort según INT/1922/2003 + RD 933/2021). El
 *  "Manual d'instruccions" del portal indica el código exacto; revísalos antes de
 *  usar el fichero en real (un código erróneo → el portal lo rechaza). */
export const CODES = {
  tipusRegistre: { CONTRACTE_EN_CURS: 'C', RESERVA: 'R' }, // ⚠ verificar manual
  tipusDocument: { DNI_NIF: 'D', NIE: 'N', PASSAPORT: 'P', ALTRES: 'O' }, // ⚠ verificar manual
  sexe: { HOME: 'H', DONA: 'D' }, // ⚠ verificar manual (pot ser M/F)
  tipusPagament: {
    // ⚠ verificar manual (pot ser numèric o un altre literal)
    DESTINACIO: 'DESTI',
    EFECTIU: 'EFECT',
    MOBIL: 'MOBIL',
    PLATAFORMA: 'PLATF',
    TARGETA_CREDIT: 'TARGE',
    TRANSFERENCIA: 'TRANS',
    TARGETA_REGAL: 'REGAL',
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

/**
 * ORDRE alineat amb el FORMULARI OFICIAL del portal (registreviatgers.mossos.gencat.cat,
 * "Fitxa individual de viatgers"): Dades del contracte → Dades identificatives →
 * Dades personals → Adreça postal. Una línia per viatger amb les dades del
 * contracte repetides.
 * ⚠ PROVISIONAL encara: els CODIS literals dels desplegables (tipus document, sexe,
 * pagament…) i si el "fitxer massiu" usa exactament aquest ordre/estructura (vs
 * capçalera+detall) estan al "Manual de fitxers massius". Confirmar i posar
 * FORMAT_CONFIRMAT = true.
 */
export const FIELD_LAYOUT: FieldDef[] = [
  // --- Dades del contracte (es repeteix a cada línia) ---
  { name: 'establiment', value: (p) => p.establiment.idPolicial },
  { name: 'tipus_registre', value: (p) => CODES.tipusRegistre[p.contracte.tipusRegistre] },
  { name: 'num_contracte', value: (p) => p.contracte.numContracte },
  { name: 'any_contracte', value: (p) => String(p.contracte.anyContracte) },
  { name: 'data_formalitzacio', value: (p) => CONFIG.formatData(p.contracte.dataFormalitzacio) },
  { name: 'data_entrada', value: (p) => CONFIG.formatData(p.contracte.dataEntrada) },
  { name: 'data_sortida', value: (p) => CONFIG.formatData(p.contracte.dataSortida) },
  { name: 'num_viatgers', value: (p) => String(p.contracte.numViatgers) },
  { name: 'tipus_pagament', value: (p) => CODES.tipusPagament[p.contracte.tipusPagament] },
  { name: 'num_habitacions', value: (p) => (p.contracte.numHabitacions != null ? String(p.contracte.numHabitacions) : '') },
  { name: 'internet', value: (p) => CODES.boolSiNo(p.contracte.teInternet) },
  // --- Dades identificatives ---
  { name: 'tipus_document', value: (_, v) => (v.tipusDocument ? CODES.tipusDocument[v.tipusDocument] : '') },
  { name: 'num_document', value: (_, v) => v.numDocument ?? '' },
  { name: 'num_suport', value: (_, v) => v.numSuport ?? '' },
  { name: 'data_expedicio', value: (_, v) => (v.dataExpedicio ? CONFIG.formatData(v.dataExpedicio) : '') },
  // --- Dades personals ---
  { name: 'nom', value: (_, v) => v.nom },
  { name: 'cognom1', value: (_, v) => normalizaCognom(v.cognom1) },
  { name: 'cognom2', value: (_, v) => (v.cognom2 ? normalizaCognom(v.cognom2) : '') },
  { name: 'sexe', value: (_, v) => (v.sexe ? CODES.sexe[v.sexe] : '') },
  { name: 'data_naixement', value: (_, v) => (v.dataNaixement ? CONFIG.formatData(v.dataNaixement) : '') },
  { name: 'pais_nacionalitat', value: (_, v) => v.nacionalitat ?? '' },
  { name: 'correu_electronic', value: (_, v) => v.email ?? '' },
  { name: 'parentesc', value: (_, v) => v.parentesc ?? '' },
  { name: 'telefon', value: (_, v) => v.telefon ?? '' },
  // --- Adreça postal ---
  { name: 'adreca', value: (_, v) => v.adreca ?? '' },
  { name: 'pais', value: (_, v) => v.pais ?? '' },
  { name: 'provincia', value: (_, v) => v.provincia ?? '' },
  { name: 'municipi', value: (_, v) => v.municipi ?? '' },
  { name: 'localitat', value: (_, v) => v.localitat ?? '' },
  { name: 'codi_postal', value: (_, v) => v.codiPostal ?? '' },
];

/** ¿Hay un layout cargado (§9.1)? Ahora sí (provisional). */
export function isLayoutReady(): boolean {
  return FIELD_LAYOUT.length > 0;
}

/**
 * ¿El formato (orden de columnas + códigos) está CONFIRMADO contra el "Manual
 * d'instruccions" oficial? Mientras sea `false`, el fitxer es PROVISIONAL: sirve
 * para probar, pero verifícalo en el portal antes de usarlo en real. Cuando lo
 * confirmes, pon `true` (y ajusta FIELD_LAYOUT/CODES si el manual difiere).
 */
export const FORMAT_CONFIRMAT = false;
export function isFormatConfirmat(): boolean {
  return FORMAT_CONFIRMAT;
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

/**
 * Devuelve la lista de errores de obligatoriedad §2.3 (vacía si el parte está
 * completo). Útil para avisar al usuario ANTES de subir a Mossos sin lanzar.
 */
export function validaParteErrors(parte: ParteViatgers): string[] {
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
