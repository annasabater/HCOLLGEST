/**
 * Fitxers d'autoliquidació de l'AEAT a partir de les dades de /impostos: el
 * mateix fitxer serveix per baixar-lo (importar a la Seu), validar-lo
 * (ServValiDos) i presentar-lo (PresBasicaDos).
 */
import 'server-only';
import { prisma } from '../db';
import { getImpostosAny } from './impostos';
import { fitxer115, fitxer130, fitxer303, type FormaPagament } from '../aeat/models';
import { baixaJustificant, presentaAeat, validaAeat, type EntornAeat, type ResultatPresentacio } from '../aeat/servei';
import { decryptBuffer } from '../crypto';
import { saveUpload } from '../storage';
import type { Caselles } from '../impostos';

const GENERADORS = { '303': fitxer303, '130': fitxer130, '115': fitxer115 } as const;
export type ModelFitxer = keyof typeof GENERADORS;
export const esModelFitxer = (m: string | null | undefined): m is ModelFitxer => !!m && m in GENERADORS;

/** Error de dades (NIF, IBAN…) que s'ha d'ensenyar tal qual a l'usuari. */
export class ErrorFitxer extends Error {}

export interface FitxerGenerat {
  contingut: string;
  /** Període en format AEAT («1T»…«4T»). */
  periode: string;
  caselles: Caselles;
  titular: { nif: string; nom: string; cognoms: string };
}

export async function generaFitxerAeat(
  model: ModelFitxer, any: number, trimestre: number, pagament: FormaPagament,
): Promise<FitxerGenerat> {
  const [dades, establiment] = await Promise.all([
    getImpostosAny(any),
    prisma.establiment.findFirst({ select: { iban: true } }),
  ]);
  const t = dades.trimestres.find((x) => x.trimestre === trimestre);
  if (!t) throw new ErrorFitxer('Trimestre no vàlid');
  const caselles = t.models[model].calculades;
  try {
    const contingut = GENERADORS[model](caselles, {
      nif: dades.titular.nif,
      nom: dades.titular.nom,
      cognoms: dades.titular.cognoms,
      any,
      trimestre,
      formaPagament: pagament,
      iban: establiment?.iban,
    });
    return { contingut, periode: `${trimestre}T`, caselles, titular: dades.titular };
  } catch (e) {
    throw new ErrorFitxer(e instanceof Error ? e.message : 'No s’ha pogut generar el fitxer');
  }
}

/** Casella del resultat de cada model (positiu = a ingressar). */
const CASELLA_RESULTAT: Record<ModelFitxer, string> = { '303': '71', '130': '19', '115': '05' };

export interface ResultatPresentacioApp extends ResultatPresentacio {
  entorn: EntornAeat;
  /** Errors de la validació prèvia (no s'ha arribat a presentar). */
  validacio?: boolean;
}

/**
 * PRESENTA a l'AEAT (PresBasicaDos) amb el certificat de la titular. Abans:
 * certificat de la titular, que no consti ja presentada, NRC si es paga sense
 * domiciliar i validació oficial (ServValiDos) sense errors. A producció,
 * desa la declaració com a presentada amb el CSV i el PDF del justificant.
 */
export async function presentaDeclaracio(p: {
  model: ModelFitxer; any: number; trimestre: number; pagament: FormaPagament;
  contrasenya: string; nrc?: string; usuariId: string;
}): Promise<ResultatPresentacioApp> {
  const est = await prisma.establiment.findFirst({
    select: { aeatCertificat: true, aeatCertNif: true, aeatCertNom: true, aeatCertCaduca: true, aeatEntorn: true },
  });
  if (!est?.aeatCertificat || !est.aeatCertNif || !est.aeatCertNom) {
    throw new ErrorFitxer('Cal pujar el certificat digital de la titular (secció «Presentació directa a l’AEAT»)');
  }
  if (est.aeatCertCaduca && est.aeatCertCaduca.getTime() < Date.now()) throw new ErrorFitxer('El certificat ha caducat: cal renovar-lo i tornar-lo a pujar');
  const entorn: EntornAeat = est.aeatEntorn === 'produccio' ? 'produccio' : 'proves';

  const f = await generaFitxerAeat(p.model, p.any, p.trimestre, p.pagament);
  if (est.aeatCertNif.toUpperCase() !== f.titular.nif.toUpperCase()) {
    throw new ErrorFitxer(`El certificat (NIF ${est.aeatCertNif}) no és de la titular de les declaracions (NIF ${f.titular.nif})`);
  }
  if (entorn === 'produccio') {
    const ja = await prisma.declaracioFiscal.findUnique({ where: { model_any_periode: { model: p.model, any: p.any, periode: p.trimestre } } });
    if (ja) throw new ErrorFitxer('Aquesta declaració ja consta com a presentada. Si cal corregir-la, s’ha de fer una rectificativa a la Seu.');
  }
  const resultat = f.caselles[CASELLA_RESULTAT[p.model]] ?? 0;
  const nrc = (p.nrc ?? '').replace(/\s+/g, '').toUpperCase();
  if (resultat > 0 && p.pagament === 'I' && !/^[0-9A-Z]{22}$/.test(nrc)) {
    throw new ErrorFitxer('Fora del termini de domiciliació cal pagar abans al banc i escriure el NRC (22 caràcters)');
  }

  // Validació oficial abans de presentar: si l'AEAT hi troba errors, no s'envia.
  const v = await validaAeat({ model: p.model, any: p.any, periode: f.periode, fitxer: f.contingut });
  if (v.errors.length) return { ok: false, errors: v.errors, avisos: v.avisos, entorn, validacio: true };

  const certificat = { pfx: decryptBuffer(Buffer.from(est.aeatCertificat, 'base64')), contrasenya: p.contrasenya };
  const r = await presentaAeat(
    { model: p.model, any: p.any, periode: f.periode, fitxer: f.contingut, nifPresentador: est.aeatCertNif, nomPresentador: est.aeatCertNom, nrc: p.pagament === 'I' ? nrc : '' },
    certificat,
    entorn,
  );
  if (!r.ok || entorn !== 'produccio') return { ...r, entorn };

  // Presentada de veritat: justificant PDF i registre (encadena els trimestres següents).
  let justificantPdf: string | null = null;
  const pdf = r.urlPdf ? await baixaJustificant(r.urlPdf, certificat) : null;
  if (pdf) justificantPdf = await saveUpload(pdf, `${p.model}_${p.any}_${p.trimestre}T_justificant.pdf`, 'aeat');
  await prisma.declaracioFiscal.create({
    data: {
      model: p.model, any: p.any, periode: p.trimestre, caselles: f.caselles,
      justificant: r.justificant ?? null, csv: r.csv ?? null, justificantPdf,
      presentadaEl: new Date(), usuariId: p.usuariId,
    },
  });
  return { ...r, entorn };
}

/** Llegeix i valida els paràmetres comuns (?model=&any=&trimestre=&pagament=). */
export function parametresFitxer(q: URLSearchParams | Record<string, unknown>) {
  const get = (k: string) => (q instanceof URLSearchParams ? q.get(k) : (q[k] as string | number | null | undefined));
  const model = String(get('model') ?? '');
  const any = Number(get('any'));
  const trimestre = Number(get('trimestre'));
  const pagament: FormaPagament = get('pagament') === 'I' ? 'I' : 'U';
  if (!esModelFitxer(model)) throw new ErrorFitxer('Model no vàlid (303, 130 o 115)');
  if (!Number.isInteger(any) || any < 2026 || any > 2100) throw new ErrorFitxer('Any no vàlid (el format és el del 2026 en endavant)');
  if (!Number.isInteger(trimestre) || trimestre < 1 || trimestre > 4) throw new ErrorFitxer('Trimestre no vàlid');
  return { model, any, trimestre, pagament };
}
