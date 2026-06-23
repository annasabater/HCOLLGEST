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
  sexe?: 'HOME' | 'DONA';
  dataNaixement?: string;
  nacionalitat?: string;
  valid: boolean;
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
    const numDocumentRaw = l1.slice(5, 14);
    const birth = l2.slice(0, 6);
    const expiry = l2.slice(8, 14);
    const name = parseName(l3);
    const valid =
      checkDigit(numDocumentRaw) === Number(l1[14]) &&
      checkDigit(birth) === Number(l2[6]) &&
      checkDigit(expiry) === Number(l2[14]);
    return {
      format: 'TD1',
      documentType: l1.slice(0, 2).replace(/</g, ''),
      issuingCountry: l1.slice(2, 5).replace(/</g, ''),
      numDocument: numDocumentRaw.replace(/</g, ''),
      ...name,
      nacionalitat: l2.slice(15, 18).replace(/</g, ''),
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
};

/** Detecta el tipus de document a partir del núm. (DNI/NIE) o del format. */
function tipusFrom(m: MrzResult): ViatgerOcr['tipusDocument'] {
  if (m.format === 'TD3') return 'PASSAPORT';
  const n = m.numDocument.toUpperCase();
  if (/^[0-9]{8}[A-Z]$/.test(n)) return 'DNI_NIF';
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(n)) return 'NIE';
  return 'ALTRES';
}

/** Converteix el resultat MRZ als camps del formulari de viatger. */
export function mrzToViatger(m: MrzResult): ViatgerOcr {
  return {
    nom: m.nom,
    cognom1: m.cognom1,
    cognom2: m.cognom2,
    tipusDocument: tipusFrom(m),
    numDocument: m.numDocument || undefined,
    sexe: m.sexe,
    dataNaixement: m.dataNaixement,
    nacionalitat: NACIONALITAT_LABELS[m.nacionalitat] ?? (m.nacionalitat || undefined),
    valid: m.valid,
  };
}
