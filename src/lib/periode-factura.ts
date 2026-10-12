/**
 * Període d'estada que diu el TEXT de la factura ("Habitació doble · Del
 * 01/09/2026 al 1/10/2026"). Quan una factura s'edita, el text de la línia és
 * el que val; l'estada vinculada pot haver canviat després (p. ex. una estada
 * escurçada i abonada). Accepta any de 2 o 4 xifres i barres repetides
 * ("1/10//2026"). Retorna "dd/mm/aa - dd/mm/aa" o null si no hi ha període.
 */
export function periodeDelText(text: string): string | null {
  const m = text.match(/Del\s+(\d{1,2})\/+(\d{1,2})\/+(\d{2,4})\s+al\s+(\d{1,2})\/+(\d{1,2})\/+(\d{2,4})/i);
  if (!m) return null;
  const [, d1 = '', m1 = '', a1 = '', d2 = '', m2 = '', a2 = ''] = m;
  const d = (dia: string, mes: string, any: string) =>
    `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${any.slice(-2)}`;
  return `${d(d1, m1, a1)} - ${d(d2, m2, a2)}`;
}
