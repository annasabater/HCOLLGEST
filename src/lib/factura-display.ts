/**
 * Etiquetes de tipus/estat de factura per a la UI. Una factura amb total
 * NEGATIU és sempre una FACTURA RECTIFICATIVA (abonament), encara que el tipus de
 * document i l'estat siguin els mateixos que una factura normal.
 */
const TIPUS_DOCUMENT_BASE: Record<string, string> = {
  RECIBO: 'Rebut',
  FACTURA_SIMPLIFICADA: 'Factura simplificada',
  FACTURA: 'Factura fiscal',
};

/** "Factura simplificada" o, si el total és negatiu, "Factura rectificativa". */
export function tipusDocumentLabel(tipusDocument: string, total: number): string {
  if (total < 0) return 'Factura rectificativa';
  return TIPUS_DOCUMENT_BASE[tipusDocument] ?? tipusDocument;
}

/** "Cobrada"/"Pendent", o "Devolta" quan la factura és una devolució (total negatiu) ja liquidada. */
export function estatFacturaLabel(estat: 'PENDENT' | 'COBRADA', total: number): string {
  if (estat !== 'COBRADA') return 'Pendent';
  return total < 0 ? 'Devolta' : 'Cobrada';
}
