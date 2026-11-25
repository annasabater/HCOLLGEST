/**
 * Llibre d'IVA DESAT + factures reals. Quan es desa el llibre, cada fila guarda
 * també com era la seva factura en aquell moment (`gen`). En obrir-lo:
 *  - si la factura ha canviat des de llavors, mana la factura nova;
 *  - si no ha canviat, es queda la fila desada (amb els retocs fets a mà);
 *  - si la factura ja no hi és (esborrada o canviada de trimestre), la fila surt;
 *  - les factures fetes després de desar, s'hi afegeixen.
 * Les files escrites a mà (sense factura) no es toquen mai.
 */

export type FilaLlibre = {
  data: string; // "dd/mm/aaaa"
  numeroSimple: string;
  numeroFiscal: string;
  client: string;
  periode: string;
  nif: string;
  base: number;
  ivaPercent: number;
  iva: number;
  total: number;
  diposit: number;
};

export type FilaDesada = FilaLlibre & { gen?: FilaLlibre };

/** Identifica la factura d'una fila: el Nº S. o, si no en té, el Nº F. */
export const clauFila = (f: { numeroSimple?: unknown; numeroFiscal?: unknown }) => {
  const s = String(f.numeroSimple ?? '').trim();
  return s ? `S:${s}` : `F:${String(f.numeroFiscal ?? '').trim()}`;
};

const CAMPS = ['data', 'numeroFiscal', 'client', 'periode', 'nif', 'base', 'ivaPercent', 'iva', 'total', 'diposit'] as const;
export function filesIguals(a: FilaLlibre, b: FilaLlibre): boolean {
  return CAMPS.every((k) =>
    typeof a[k] === 'number' ? Math.abs(Number(a[k]) - Number(b[k])) < 0.005 : String(a[k] ?? '').trim() === String(b[k] ?? '').trim(),
  );
}

const sensGen = ({ gen: _gen, ...f }: FilaDesada): FilaLlibre => f;

/**
 * @param desades files del llibre desat
 * @param actuals files tal com surten ara de les factures del trimestre
 * @param noves   claus de les factures creades després de desar
 * @param tocades claus de les factures modificades després de desar (només per a
 *                files desades d'abans que es guardés `gen`)
 */
export function fusionaLlibre(
  desades: FilaDesada[],
  actuals: FilaLlibre[],
  noves: Set<string>,
  tocades: Set<string>,
): { files: FilaLlibre[]; canvis: number } {
  const perClau = new Map(actuals.map((a) => [clauFila(a), a]));
  const hiSon = new Set<string>();
  const files: FilaLlibre[] = [];
  let canvis = 0;
  for (const r of desades) {
    const k = clauFila(r);
    const a = perClau.get(k);
    hiSon.add(k);
    if (r.gen) {
      if (!a) { canvis++; continue; } // la factura ja no hi és
      if (!filesIguals(a, r.gen)) { files.push(a); canvis++; continue; } // la factura ha canviat
      files.push(sensGen(r));
    } else if (a && tocades.has(k) && !filesIguals(a, r)) {
      files.push(a); canvis++;
    } else {
      files.push(sensGen(r));
    }
  }
  const afegides = actuals.filter((a) => noves.has(clauFila(a)) && !hiSon.has(clauFila(a)));
  if (afegides.length) {
    canvis += afegides.length;
    const num = (f: FilaLlibre) => f.numeroSimple || f.numeroFiscal;
    return { files: [...files, ...afegides].sort((x, y) => num(x).localeCompare(num(y), 'es', { numeric: true })), canvis };
  }
  return { files, canvis };
}

/** En desar: a cada fila que ve d'una factura, li guarda com és la factura ara. */
export function ambGen(files: FilaLlibre[], actuals: FilaLlibre[]): FilaDesada[] {
  const perClau = new Map(actuals.map((a) => [clauFila(a), a]));
  return files.map((f) => {
    const a = perClau.get(clauFila(f));
    return a ? { ...f, gen: a } : f;
  });
}
