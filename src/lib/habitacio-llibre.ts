/**
 * Habitació "al llibre" d'una estada: la que ha de constar als DOCUMENTS
 * (llibre de registre, justificants, factura, balanç), que pot diferir de la
 * física real. `habitacioSeparada` és per viatger; per a documents d'estada
 * (factura, balanç) es fa servir la del TITULAR si en té; si no, la física.
 *
 * A tota la resta (calendari, plantilles, ocupació, tauler) es fa servir sempre
 * l'habitació física real.
 */
export function habitacioLlibre(est: {
  habitacio?: { nom: string | null } | null;
  viatgers?: { esTitular?: boolean; habitacioSeparada?: { nom: string | null } | null }[];
}): string | null {
  const titular = est.viatgers?.find((v) => v.esTitular) ?? est.viatgers?.[0];
  return titular?.habitacioSeparada?.nom ?? est.habitacio?.nom ?? null;
}
