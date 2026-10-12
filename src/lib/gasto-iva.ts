/**
 * Línies d'IVA d'una despesa (IVA suportat). Una factura pot portar diversos
 * tipus a la vegada (aigua: 10% + 21% + cànon no subjecte; supermercat: 4/10/21%).
 * - `desglossamentIva` (2+ línies) mana quan hi és.
 * - Si no, una sola línia amb `baseImposable` + `ivaPercent`.
 * - Si no hi ha base, es dedueix del total al 21% inclòs (tiquet sense desglossar).
 */
import { z } from 'zod';

export const IVA_DESPESA_PER_DEFECTE = 21;

export const LiniaIvaSchema = z.object({
  base: z.coerce.number(),
  ivaPercent: z.coerce.number().min(0).max(100),
});
export type LiniaIva = z.infer<typeof LiniaIvaSchema>;
export interface LiniaIvaCalc extends LiniaIva { iva: number }

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Llegeix el JSON desat; només el considera desglossament si té 2+ línies vàlides. */
export function parseDesglossament(json: unknown): LiniaIva[] | null {
  const r = z.array(LiniaIvaSchema).safeParse(json);
  return r.success && r.data.length >= 2 ? r.data : null;
}

type Num = number | string | { toString(): string } | null | undefined;
const num = (v: Num): number | null => (v == null ? null : Number(v.toString()));

export function liniesIva(g: {
  import: Num;
  baseImposable?: Num;
  ivaPercent?: Num;
  desglossamentIva?: unknown;
}): LiniaIvaCalc[] {
  const desg = parseDesglossament(g.desglossamentIva);
  if (desg) return desg.map((l) => ({ base: round2(l.base), ivaPercent: l.ivaPercent, iva: round2(l.base * (l.ivaPercent / 100)) }));
  const base = num(g.baseImposable);
  if (base != null) {
    const ivaPercent = num(g.ivaPercent) ?? 0;
    return [{ base: round2(base), ivaPercent, iva: round2(base * (ivaPercent / 100)) }];
  }
  const total = num(g.import) ?? 0;
  const b = round2(total / (1 + IVA_DESPESA_PER_DEFECTE / 100));
  return [{ base: b, ivaPercent: IVA_DESPESA_PER_DEFECTE, iva: round2(total - b) }];
}

/** Total que surt de les línies: Σ(base + IVA) − IRPF sobre la base subjecta. */
export function totalDeLinies(linies: LiniaIva[], irpfPercent = 0): number {
  const base = linies.reduce((a, l) => a + l.base, 0);
  const iva = linies.reduce((a, l) => a + round2(l.base * (l.ivaPercent / 100)), 0);
  return round2(base + iva - round2(base * (irpfPercent / 100)));
}

/**
 * Converteix les línies que arriben d'un formulari/API als camps de la BD:
 * una sola línia → baseImposable/ivaPercent; 2+ → desglossamentIva (i la base
 * total a baseImposable, perquè qualsevol lector antic vegi la base correcta).
 */
export function campsIva(linies: LiniaIva[] | null | undefined): {
  baseImposable: number | null;
  ivaPercent: number | null;
  desglossamentIva: LiniaIva[] | null;
} | null {
  const ok = (linies ?? []).filter((l) => Number.isFinite(l.base) && l.base !== 0);
  if (ok.length === 0) return null;
  if (ok.length === 1) return { baseImposable: round2(ok[0]!.base), ivaPercent: ok[0]!.ivaPercent, desglossamentIva: null };
  return {
    baseImposable: round2(ok.reduce((a, l) => a + l.base, 0)),
    ivaPercent: null,
    desglossamentIva: ok.map((l) => ({ base: round2(l.base), ivaPercent: l.ivaPercent })),
  };
}
