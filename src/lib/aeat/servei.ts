/**
 * Clients dels serveis web de l'AEAT per a autoliquidacions («Especificaciones
 * de los servicios de Presentación Directa, Consulta de Declaraciones
 * Presentadas y Validación de Impresión», v30):
 *  - ServValiDos: valida el fitxer i en torna l'esborrany oficial en PDF. No
 *    demana certificat i no presenta res.
 *  - PresBasicaDos: PRESENTA la declaració amb el certificat del titular
 *    (TLS amb certificat de client, «Firma No Criptográfica»).
 * Les respostes arriben amb claus en majúscules o minúscules segons el servei
 * («RESPUESTA»/«respuesta», «PDF»/«pdf»): es llegeixen sense distingir-les.
 */
import 'server-only';
import https from 'node:https';

export type EntornAeat = 'produccio' | 'proves';

const URLS = {
  validacio: {
    produccio: 'https://www2.agenciatributaria.gob.es/wlpl/PFTW-PICW/ServValiDos',
    proves: 'https://prewww2.aeat.es/wlpl/PFTW-PICW/ServValiDos',
  },
  presentacio: {
    produccio: 'https://www1.agenciatributaria.gob.es/wlpl/PFTW-PICW/PresBasicaDos',
    proves: 'https://prewww1.aeat.es/wlpl/PFTW-PICW/PresBasicaDos',
  },
} as const;

const TIMEOUT_MS = 45_000;

/** Busca una clau sense distingir majúscules (les respostes de l'AEAT no són coherents). */
function clau<T = unknown>(o: unknown, nom: string): T | undefined {
  if (!o || typeof o !== 'object') return undefined;
  const k = Object.keys(o).find((x) => x.trim().toLowerCase() === nom.toLowerCase());
  return k ? ((o as Record<string, unknown>)[k] as T) : undefined;
}

const llista = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()) : [];

export interface ResultatValidacio {
  ok: boolean;
  errors: string[];
  avisos: string[];
  /** Esborrany oficial en PDF (base64), si l'AEAT l'ha generat. */
  pdfBase64?: string;
}

/** Interpreta la resposta de ServValiDos. Funció pura (testejable). */
export function llegeixValidacio(json: unknown): ResultatValidacio {
  const r = clau(json, 'respuesta');
  const errors = llista(clau(r, 'errores'));
  const avisos = [...llista(clau(r, 'avisos')), ...llista(clau(r, 'advertencias'))];
  const pdf = clau<unknown[]>(r, 'pdf');
  const pdfBase64 = Array.isArray(pdf) && typeof pdf[0] === 'string' ? pdf.join('') : undefined;
  return { ok: errors.length === 0 && !!pdfBase64, errors, avisos, pdfBase64 };
}

/** Valida el fitxer amb l'AEAT i en torna l'esborrany en PDF. */
export async function validaAeat(
  p: { model: string; any: number; periode: string; fitxer: string },
  entorn: EntornAeat = 'produccio',
): Promise<ResultatValidacio> {
  const res = await fetch(URLS.validacio[entorn], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ MODELO: p.model, EJERCICIO: String(p.any), PERIODO: p.periode, IDI: 'CA', FIC: p.fitxer }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`El servei de validació de l'AEAT ha respost ${res.status}`);
  return llegeixValidacio(await res.json().catch(() => null));
}

// ─── Presentació (fase 2) ───────────────────────────────────────────────────

export interface PeticioPresentacio {
  model: string;
  any: number;
  periode: string;
  fitxer: string;
  /** NIF i «cognoms nom» del TITULAR DEL CERTIFICAT (el presentador). */
  nifPresentador: string;
  nomPresentador: string;
  /** NRC del pagament (només forma de pagament I); buit en la resta. */
  nrc?: string;
}

export interface ResultatPresentacio {
  ok: boolean;
  errors: string[];
  avisos: string[];
  csv?: string;
  justificant?: string;
  expedient?: string;
  data?: string;
  hora?: string;
  formaPagament?: string;
  importAIngressar?: number;
  urlPdf?: string;
  tipusRepresentacio?: string;
}

/** Cos JSON de PresBasicaDos (apartat 1.2 de l'especificació). Funció pura. */
export function cosPresentacio(p: PeticioPresentacio): string {
  return JSON.stringify({
    MODELO: p.model,
    EJERCICIO: String(p.any),
    PERIODO: p.periode,
    NRC: p.nrc ?? '',
    IDI: 'CA',
    F01: p.fitxer.replace(/[\r\n\t]/g, ''),
    FIR: 'FirmaBasica',
    FIRNIF: p.nifPresentador.toUpperCase(),
    FIRNOMBRE: p.nomPresentador.toUpperCase(),
  });
}

/** Interpreta la resposta de PresBasicaDos (apartat 1.3). Funció pura. */
export function llegeixPresentacio(json: unknown): ResultatPresentacio {
  const r = clau(json, 'respuesta');
  const c = clau(r, 'correcta');
  const errors = llista(clau(r, 'errores'));
  const s = (k: string) => {
    const v = clau(c, k);
    return v == null || v === '' ? undefined : String(v).trim();
  };
  const csv = s('CodigoSeguroVerificacion');
  const imp = s('ImporteAIngresar');
  return {
    // Una presentació és correcta NOMÉS si porta CSV (apartat 1.3).
    ok: !!csv && errors.length === 0,
    errors: csv || errors.length ? errors : ['Resposta de l’AEAT sense codi segur de verificació'],
    avisos: [...llista(clau(c, 'avisos')), ...llista(clau(c, 'advertencias'))],
    csv,
    justificant: s('Justificante'),
    expedient: s('Expediente'),
    data: s('Fecha'),
    hora: s('Hora'),
    formaPagament: s('FormaPago'),
    importAIngressar: imp ? Number(imp) : undefined,
    urlPdf: s('urlPdf'),
    tipusRepresentacio: s('TipoRepresentacion'),
  };
}

/** POST HTTPS amb el certificat del titular (.p12) com a certificat de client. */
function postAmbCertificat(url: string, cos: string, pfx: Buffer, passphrase: string): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        pfx,
        passphrase,
        headers: { 'Content-Type': 'application/json;charset=UTF-8', 'Content-Length': Buffer.byteLength(cos) },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const parts: Buffer[] = [];
        res.on('data', (d: Buffer) => parts.push(d));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(parts) }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('L’AEAT no ha respost a temps')));
    req.on('error', (e) => {
      // Contrasenya del .p12 incorrecta: missatge entenedor.
      if (/mac verify failure|bad decrypt/i.test(e.message)) reject(new Error('La contrasenya del certificat no és correcta'));
      else reject(e);
    });
    req.end(cos);
  });
}

/**
 * PRESENTA la declaració a l'AEAT. És IRREVERSIBLE (una declaració gravada no
 * es pot anul·lar): només s'ha de cridar després que el titular hagi vist les
 * dades i hagi donat la conformitat explícita.
 */
export async function presentaAeat(
  p: PeticioPresentacio,
  certificat: { pfx: Buffer; contrasenya: string },
  entorn: EntornAeat,
): Promise<ResultatPresentacio> {
  const { status, body } = await postAmbCertificat(URLS.presentacio[entorn], cosPresentacio(p), certificat.pfx, certificat.contrasenya);
  let json: unknown = null;
  try {
    json = JSON.parse(body.toString('utf8'));
  } catch {
    return { ok: false, errors: [`Resposta no esperada de l’AEAT (HTTP ${status})`], avisos: [] };
  }
  return llegeixPresentacio(json);
}

/** Baixa el justificant PDF de la presentació (amb el mateix certificat). */
export async function baixaJustificant(urlPdf: string, certificat: { pfx: Buffer; contrasenya: string }): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const req = https.get(urlPdf, { pfx: certificat.pfx, passphrase: certificat.contrasenya, timeout: TIMEOUT_MS }, (res) => {
      if ((res.statusCode ?? 0) >= 400) { res.resume(); resolve(null); return; }
      const parts: Buffer[] = [];
      res.on('data', (d: Buffer) => parts.push(d));
      res.on('end', () => {
        const b = Buffer.concat(parts);
        resolve(b.subarray(0, 5).toString() === '%PDF-' ? b : null);
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
  });
}
