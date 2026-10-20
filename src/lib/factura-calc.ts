/** Cálculo puro de los totales de una factura (testeable, sin dependencias de servidor). */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface FacturaTotalsInput {
  linies: { import: number }[];
  ivaPercent: number;
  nits: number;
  persones: number;
  ieet: number; // import per persona i nit (0 = sense tassa)
  aplicarTasa: boolean;
}

export interface FacturaTotals {
  base: number;
  iva: number;
  tasaTotal: number;
  total: number;
}

export function computeFacturaTotals(input: FacturaTotalsInput): FacturaTotals {
  const base = round2(input.linies.reduce((acc, l) => acc + l.import, 0));
  const iva = round2((base * input.ivaPercent) / 100);
  const tasaTotal =
    input.aplicarTasa && input.ieet > 0
      ? round2(input.nits * input.persones * input.ieet)
      : 0;
  const total = round2(base + iva + tasaTotal);
  return { base, iva, tasaTotal, total };
}
