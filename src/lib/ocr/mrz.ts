/**
 * Parser de la zona MRZ (Machine Readable Zone) de DNI/NIE (TD1, 3×30) i
 * passaports (TD3, 2×44). Funció PURA i testejable.
 *
 * La MRZ porta dígits de control, així que podem VALIDAR la lectura de l'OCR i
 * extreure de forma fiable: núm. document, cognoms, nom, nacionalitat, sexe,
 * data de naixement i de caducitat. (La MRZ no porta accents → l'usuari corregeix.)
 */

export interface MrzResult {
  format: 'TD1' | 'TD3';
  documentType: string;
  issuingCountry: string;
  numDocument: string;
  numSuport?: string; // IDESP (camp opcional línia 1 TD1)
  cognom1: string;
  cognom2?: string;
  nom: string;
  nacionalitat: string; // codi de 3 lletres (ESP, FRA…)
  sexe?: 'HOME' | 'DONA';
  dataNaixement?: string; // YYYY-MM-DD
  dataCaducitat?: string; // YYYY-MM-DD
  valid: boolean; // tots els dígits de control quadren
}

export interface ViatgerOcr {
  nom: string;
  cognom1: string;
  cognom2?: string;
  tipusDocument?: 'DNI_NIF' | 'NIE' | 'PASSAPORT' | 'ALTRES';
  numDocument?: string;
  numSuport?: string;
  sexe?: 'HOME' | 'DONA';
  dataNaixement?: string;
  nacionalitat?: string;
  // Camps de la cara del revers (adreça)
  adreca?: string;
  codiPostal?: string;
  localitat?: string;
  provinciaNom?: string;
  valid: boolean;
  warnings?: string[];
}

function charVal(c: string): number {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55; // A=10 … Z=35
  return 0; // '<' i altres
}

/** Dígit de control MRZ (pesos 7,3,1). */
export function checkDigit(s: string): number {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += charVal(s[i]!) * w[i % 3]!;
  return sum % 10;
}

function pad(line: string, len: number): string {
  return (line + '<'.repeat(len)).slice(0, len);
}

function toDate(yymmdd: string, kind: 'birth' | 'expiry'): string | undefined {
  if (!/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return undefined;
  const nowYY = new Date().getFullYear() % 100;
  let year: number;
  if (kind === 'expiry') year = yy < 70 ? 2000 + yy : 1900 + yy;
  else year = yy > nowYY ? 1900 + yy : 2000 + yy;
  return `${year}-${mm}-${dd}`;
}

function parseName(field: string): { cognom1: string; cognom2?: string; nom: string } {
  const titil = (s: string) =>
    s
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  const [surnamePart = '', givenPart = ''] = field.split('<<');
  const surnames = surnamePart.split('<').filter(Boolean);
  const givens = givenPart.split('<').filter(Boolean);
  return {
    cognom1: titil(surnames[0] ?? ''),
    cognom2: surnames.length > 1 ? titil(surnames.slice(1).join(' ')) : undefined,
    nom: titil(givens.join(' ')),
  };
}

function sexFrom(c: string): 'HOME' | 'DONA' | undefined {
  if (c === 'M') return 'HOME';
  if (c === 'F') return 'DONA';
  return undefined;
}

/** Localitza les línies MRZ dins del text complet de l'OCR. */
export function findMrzLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, '').toUpperCase())
    .filter((l) => /^[A-Z0-9<]+$/.test(l) && l.length >= 28 && l.includes('<'));
}

/** Intenta parsejar una MRZ (TD1 o TD3) a partir de les línies candidates. */
export function parseMrz(lines: string[]): MrzResult | null {
  const cand = lines.filter((l) => /^[A-Z0-9<]+$/.test(l) && l.includes('<') && l.length >= 28);

  // TD3 (passaport): 2 línies ~44.
  const td3 = cand.filter((l) => l.length >= 40);
  if (td3.length >= 2) {
    const l1 = pad(td3[0]!, 44);
    const l2 = pad(td3[1]!, 44);
    const numDocumentRaw = l2.slice(0, 9);
    const birth = l2.slice(13, 19);
    const expiry = l2.slice(21, 27);
    const name = parseName(l1.slice(5));
    const valid =
      checkDigit(numDocumentRaw) === Number(l2[9]) &&
      checkDigit(birth) === Number(l2[19]) &&
      checkDigit(expiry) === Number(l2[27]);
    return {
      format: 'TD3',
      documentType: l1.slice(0, 1),
      issuingCountry: l1.slice(2, 5).replace(/</g, ''),
      numDocument: numDocumentRaw.replace(/</g, ''),
      ...name,
      nacionalitat: l2.slice(10, 13).replace(/</g, ''),
      sexe: sexFrom(l2[20]!),
      dataNaixement: toDate(birth, 'birth'),
      dataCaducitat: toDate(expiry, 'expiry'),
      valid,
    };
  }

  // TD1 (DNI/NIE): 3 línies ~30.
  const td1 = cand.filter((l) => l.length >= 28 && l.length <= 32);
  if (td1.length >= 3) {
    const l1 = pad(td1[0]!, 30);
    const l2 = pad(td1[1]!, 30);
    const l3 = pad(td1[2]!, 30);
    // Camp "document number" ICAO (pos 5-13) + el seu dígit de control (pos 14).
    const docFieldRaw = l1.slice(5, 14).replace(/</g, '');
    const birth = l2.slice(0, 6);
    const expiry = l2.slice(8, 14);
    const name = parseName(l3);
    const valid =
      checkDigit(l1.slice(5, 14)) === Number(l1[14]) &&
      checkDigit(birth) === Number(l2[6]) &&
      checkDigit(expiry) === Number(l2[14]);
    // Camp opcional línia 1 (pos 15-29).
    let optFieldRaw = l1.slice(15, 29).replace(/</g, '').trim();
    const issuingCountry = l1.slice(2, 5).replace(/</g, '');
    const nacionalitat = l2.slice(15, 18).replace(/</g, '');

    // NIE codificat: a la MRZ la lletra inicial del NIE (X/Y/Z) es guarda com un
    // dígit (X→0, Y→1, Z→2). En una targeta d'estranger espanyola el camp opcional
    // porta el NIE amb aquesta codificació (p.ex. "21717102L" = Z1717102L). Com que
    // un espanyol no té NIE, només ho descodifiquem si la nacionalitat NO és ESP.
    const NIE_PREFIX: Record<string, string> = { '0': 'X', '1': 'Y', '2': 'Z' };
    if (
      issuingCountry === 'ESP' &&
      nacionalitat !== 'ESP' &&
      /^[012][0-9]{7}[A-Z]$/.test(optFieldRaw)
    ) {
      optFieldRaw = NIE_PREFIX[optFieldRaw[0]!]! + optFieldRaw.slice(1);
    }

    // Documents espanyols (DNI, TIE d'estranger…): el camp "document number"
    // (pos 5-13) porta el NÚMERO DE SUPORT (IDESP, p.ex. BMK169866) i el número
    // real (DNI/NIF o NIE) va al camp opcional (pos 15-29). Ho detectem: si el camp
    // opcional té format de DNI (8 dígits+lletra) o NIE (X/Y/Z+7 dígits+lletra),
    // aquell és el document i el de pos 5-13 és el suport. Només per a emissor ESP.
    const esDniNie = (s: string) =>
      /^[0-9]{8}[A-Z]$/.test(s) || /^[XYZ][0-9]{7}[A-Z]$/.test(s);
    let numDocument = docFieldRaw;
    let numSuport = optFieldRaw.length >= 3 ? optFieldRaw : undefined;
    if (issuingCountry === 'ESP' && esDniNie(optFieldRaw)) {
      numDocument = optFieldRaw; // DNI/NIF o NIE real
      numSuport = docFieldRaw || undefined; // número de suport (IDESP)
    }
    return {
      format: 'TD1',
      documentType: l1.slice(0, 2).replace(/</g, ''),
      issuingCountry,
      numDocument,
      numSuport,
      ...name,
      nacionalitat,
      sexe: sexFrom(l2[7]!),
      dataNaixement: toDate(birth, 'birth'),
      dataCaducitat: toDate(expiry, 'expiry'),
      valid,
    };
  }

  return null;
}

const NACIONALITAT_LABELS: Record<string, string> = {
  ESP: 'Espanya',
  FRA: 'França',
  PRT: 'Portugal',
  ITA: 'Itàlia',
  DEU: 'Alemanya',
  GBR: 'Regne Unit',
  MAR: 'Marroc',
  AND: 'Andorra',
  NLD: 'Països Baixos',
  BEL: 'Bèlgica',
  CHE: 'Suïssa',
  AUT: 'Àustria',
  IRL: 'Irlanda',
  POL: 'Polònia',
  ROU: 'Romania',
  BGR: 'Bulgària',
  UKR: 'Ucraïna',
  RUS: 'Rússia',
  CZE: 'Txèquia',
  SVK: 'Eslovàquia',
  HUN: 'Hongria',
  GRC: 'Grècia',
  SWE: 'Suècia',
  NOR: 'Noruega',
  DNK: 'Dinamarca',
  FIN: 'Finlàndia',
  ISL: 'Islàndia',
  LUX: 'Luxemburg',
  HRV: 'Croàcia',
  SVN: 'Eslovènia',
  LTU: 'Lituània',
  LVA: 'Letònia',
  EST: 'Estònia',
  TUR: 'Turquia',
  USA: 'Estats Units',
  CAN: 'Canadà',
  MEX: 'Mèxic',
  ARG: 'Argentina',
  BRA: 'Brasil',
  COL: 'Colòmbia',
  CHL: 'Xile',
  PER: 'Perú',
  URY: 'Uruguai',
  VEN: 'Veneçuela',
  ECU: 'Equador',
  CHN: 'Xina',
  JPN: 'Japó',
  KOR: 'Corea del Sud',
  IND: 'Índia',
  PAK: 'Pakistan',
  DZA: 'Algèria',
  SEN: 'Senegal',
  NGA: 'Nigèria',
  AUS: 'Austràlia',
  NZL: 'Nova Zelanda',
};

/** Detecta el tipus de document a partir del núm. (DNI/NIE) o del format. */
function tipusFrom(m: MrzResult): ViatgerOcr['tipusDocument'] {
  if (m.format === 'TD3') return 'PASSAPORT';
  const n = m.numDocument.toUpperCase();
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(n)) return 'NIE';
  // Un DNI/NIF és, per definició, espanyol. Un número amb format de DNI però
  // nacionalitat no espanyola (p.ex. targeta d'estranger) és ALTRES, no DNI_NIF.
  if (/^[0-9]{8}[A-Z]$/.test(n) && (m.nacionalitat === 'ESP' || !m.nacionalitat)) return 'DNI_NIF';
  return 'ALTRES';
}

// ----------------------------------------------------------------------------
// Lectura de la CARA DEL DAVANT (best-effort, sense MRZ)
// ----------------------------------------------------------------------------

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Lletra de control d'un DNI (mòdul 23). Permet validar el número llegit. */
export function dniCheckLetter(num8: string): string {
  return DNI_LETTERS[Number(num8) % 23] ?? '';
}

function titlecase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Parser BEST-EFFORT de la cara del DAVANT d'un DNI/NIE espanyol a partir del
 * text OCR (sense MRZ). És menys fiable que la MRZ: extreu el que pot i marca
 * `valid` només si la lletra del DNI/NIE quadra. Funció pura i testejable.
 */
export function parseDniFront(rawText: string): ViatgerOcr | null {
  const text = rawText.toUpperCase();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const compact = text.replace(/[^A-Z0-9]/g, ' ');

  // --- Número de document (validant la lletra) ---
  let numDocument: string | undefined;
  let tipusDocument: ViatgerOcr['tipusDocument'] | undefined;
  let valid = false;
  const dni = compact.match(/\b(\d{8})\s*([A-Z])\b/);
  const nie = compact.match(/\b([XYZ])\s*(\d{7})\s*([A-Z])\b/);
  if (dni) {
    numDocument = dni[1]! + dni[2]!;
    tipusDocument = 'DNI_NIF';
    valid = dniCheckLetter(dni[1]!) === dni[2]!;
  } else if (nie) {
    const pre: Record<string, string> = { X: '0', Y: '1', Z: '2' };
    numDocument = nie[1]! + nie[2]! + nie[3]!;
    tipusDocument = 'NIE';
    valid = dniCheckLetter(`${pre[nie[1]!]}${nie[2]!}`) === nie[3]!;
  }

  // --- Dates (DD MM YYYY / DD-MM-YYYY) → naixement = la més antiga ---
  const dates: string[] = [];
  const reDate = /\b(\d{2})[\s.\/-](\d{2})[\s.\/-](\d{4})\b/g;
  let md: RegExpExecArray | null;
  while ((md = reDate.exec(text))) {
    const dd = Number(md[1]);
    const mm = Number(md[2]);
    const yy = Number(md[3]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yy >= 1900 && yy <= 2100) {
      dates.push(`${md[3]}-${md[2]}-${md[1]}`);
    }
  }
  dates.sort();
  const dataNaixement = dates[0];

  // --- Sexe ---
  let sexe: ViatgerOcr['sexe'];
  const sx =
    text.match(/\bSEXO\b[^A-Z0-9]{0,4}([MF])\b/) ||
    text.match(/\bSEXE\b[^A-Z0-9]{0,4}([MF])\b/) ||
    text.match(/\bSEX[OE]?\s*[:\-]?\s*([MF])\b/);
  if (sx) sexe = sx[1] === 'M' ? 'HOME' : 'DONA';

  // --- Número de suport (IDESP, SOPORTE, SOPORT) ---
  let numSuport: string | undefined;
  const idesp = compact.match(/\bIDESP\s*([A-Z0-9]{6,12})\b/) ||
    text.match(/SOPORT[E]?\s*[:\s]+([A-Z0-9]{6,12})\b/) ||
    text.match(/NÚM[\s.]+SOPORT[E]?\s*[:\s]+([A-Z0-9]{6,12})\b/i);
  if (idesp) numSuport = idesp[1];

  // --- Nom i cognoms (per etiquetes APELLIDOS / NOMBRE) ---
  const up = lines.map((l) => l.toUpperCase());
  const isLabel = (s: string) =>
    /APELLIDOS|NOMBRE|SEXO|NACIONALIDAD|VALIDEZ|NACIMIENTO|DOCUMENTO|IDESP|SOPORT|EQUIPO|^ESP$|NACIONAL/.test(s);
  const ai = up.findIndex((l) => l.includes('APELLIDOS'));
  const ni = up.findIndex((l) => /\bNOMBRE\b/.test(l));
  const clean = (s: string) => s.replace(/[^A-Za-zÀ-ÿ'\s-]/g, '').trim();
  let cognom1 = '';
  let cognom2: string | undefined;
  let nom = '';
  if (ai >= 0) {
    const end = ni > ai ? ni : ai + 3;
    const sur = lines
      .slice(ai + 1, end)
      .map(clean)
      .filter((w) => w.length >= 2 && !isLabel(w.toUpperCase()));
    if (sur[0]) cognom1 = titlecase(sur[0]);
    if (sur[1]) cognom2 = titlecase(sur[1]);
  }
  if (ni >= 0) {
    const cand = lines
      .slice(ni + 1, ni + 3)
      .map(clean)
      .filter((w) => w.length >= 2 && !isLabel(w.toUpperCase()));
    if (cand[0]) nom = titlecase(cand[0]);
  }

  if (!numDocument && !cognom1 && !nom) return null; // res aprofitable
  return {
    nom,
    cognom1,
    cognom2,
    tipusDocument,
    numDocument,
    numSuport,
    sexe,
    dataNaixement,
    nacionalitat: /\bESP\b|ESPAÑOL|ESPANOL|ESPANYA/.test(text) ? 'Espanya' : undefined,
    valid,
  };
}

/**
 * Parser BEST-EFFORT de la cara del REVERS d'un DNI/NIE espanyol.
 * Extreu l'adreça, codi postal, localitat i província (text lliure OCR).
 * Retorna null si no detecta cap indicador de cara revers.
 */
export function parseDniReverso(rawText: string): ViatgerOcr | null {
  const text = rawText.toUpperCase();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const up = lines.map((l) => l.toUpperCase());

  // Indicadors que estem a la cara del revers.
  const esReverso =
    /DOMICIL|MUNICIPIO|MUNICIPIP|MUNICIPI\b|PROVINCIA|LLOC DE NAIX|LUGAR DE NAC/.test(text);
  if (!esReverso) return null;

  const cleanText = (s: string) =>
    s.replace(/[^A-Za-zÀ-ÿ0-9\s,./ºª'-]/g, '').trim();
  const isMetadata = (s: string) =>
    /DOMICIL|MUNICIPIO|MUNICIPI|PROVINCIA|LLOC|LUGAR|NAIX|NACIM|EXPED|DNI|NIF|NIE|IDESP|ESP|SUPORT|SOPORT/i.test(s);

  // Cerca línies de context rellevants per a cada etiqueta.
  function nextNonLabelLine(labelIdx: number): string | undefined {
    for (let i = labelIdx + 1; i < lines.length && i <= labelIdx + 3; i++) {
      const l = lines[i]!;
      if (l.length >= 3 && !isMetadata(l)) return cleanText(l);
    }
    return undefined;
  }

  // Adreça: línia següent a "DOMICILIO" / "DOMICILI"
  const domIdx = up.findIndex((l) => /DOMICIL/.test(l));
  const adreca = domIdx >= 0 ? nextNonLabelLine(domIdx) : undefined;

  // Codi postal: 5 dígits
  const cpMatch = text.match(/\b(\d{5})\b/);
  const codiPostal = cpMatch?.[1];

  // Localitat: línia següent a "MUNICIPIO" / "MUNICIPI" o la que conté el CP
  let localitat: string | undefined;
  const munIdx = up.findIndex((l) => /MUNICIPIO|MUNICIPIP|MUNICIPI\b/.test(l));
  if (munIdx >= 0) {
    const raw = nextNonLabelLine(munIdx);
    // Neteja el CP si apareix a la mateixa línia
    localitat = raw?.replace(/\b\d{5}\b/, '').replace(/\s+/g, ' ').trim();
  }
  if (!localitat && cpMatch) {
    // Fallback: línia que conté el CP
    const cpLine = lines.find((l) => l.includes(cpMatch[1]!));
    if (cpLine) {
      localitat = cleanText(cpLine.replace(cpMatch[1]!, '')).trim();
    }
  }

  // Província: línia següent a "PROVINCIA"
  let provinciaNom: string | undefined;
  const provIdx = up.findIndex((l) => /PROVINCIA\b/.test(l));
  if (provIdx >= 0) {
    provinciaNom = nextNonLabelLine(provIdx);
  }

  if (!adreca && !codiPostal && !localitat) return null;

  return {
    nom: '',
    cognom1: '',
    adreca: adreca || undefined,
    codiPostal: codiPostal || undefined,
    localitat: localitat || undefined,
    provinciaNom: provinciaNom || undefined,
    valid: false,
  };
}

/** Converteix el resultat MRZ als camps del formulari de viatger. */
export function mrzToViatger(m: MrzResult): ViatgerOcr {
  return {
    nom: m.nom,
    cognom1: m.cognom1,
    cognom2: m.cognom2,
    tipusDocument: tipusFrom(m),
    numDocument: m.numDocument || undefined,
    numSuport: m.numSuport || undefined,
    sexe: m.sexe,
    dataNaixement: m.dataNaixement,
    nacionalitat: NACIONALITAT_LABELS[m.nacionalitat] ?? (m.nacionalitat || undefined),
    valid: m.valid,
  };
}
