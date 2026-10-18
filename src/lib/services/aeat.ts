/**
 * Fitxers d'autoliquidació de l'AEAT a partir de les dades de /impostos: el
 * mateix fitxer serveix per baixar-lo (importar a la Seu), validar-lo
 * (ServValiDos) i presentar-lo (PresBasicaDos).
 */
import 'server-only';
import { prisma } from '../db';
import { getImpostosAny } from './impostos';
import { fitxer115, fitxer130, fitxer303, type FormaPagament } from '../aeat/models';
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
