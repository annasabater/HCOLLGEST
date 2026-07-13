/**
 * Etiquetes de tipus/estat de factura per a la UI. Una factura amb total
 * NEGATIU és sempre una devolució (rectificativa), encara que el tipus de
 * document i l'estat siguin els mateixos que una factura normal.
 */
const TIPUS_DOCUMENT_BASE: Record<string, string> = {
  RECIBO: 'Rebut',
  FACTURA_SIMPLIFICADA: 'Factura simplificada',
  FACTURA: 'Factura fiscal',
};

/** "Factura simplificada" o, si el total és negatiu, "Factura simplificada devolució". */
export function tipusDocumentLabel(tipusDocument: string, total: number): string {
  const label = TIPUS_DOCUMENT_BASE[tipusDocument] ?? tipusDocument;
  return total < 0 ? `${label} devolució` : label;
}

/** "Cobrada"/"Pendent", o "Devolta" quan la factura és una devolució (total negatiu) ja liquidada. */
export function estatFacturaLabel(estat: 'PENDENT' | 'COBRADA', total: number): string {
  if (estat !== 'COBRADA') return 'Pendent';
  return total < 0 ? 'Devolta' : 'Cobrada';
}
