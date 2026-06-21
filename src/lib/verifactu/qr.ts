/** Veri*Factu — URL del codi QR de cotejo de l'AEAT. */
import { QR_BASE_URL_PROD, QR_BASE_URL_TEST } from './software';

export function buildQrUrl(
  p: { nif: string; numSerie: string; fecha: string; importe: string },
  testMode: boolean,
): string {
  const base = testMode ? QR_BASE_URL_TEST : QR_BASE_URL_PROD;
  const qs = new URLSearchParams({
    nif: p.nif,
    numserie: p.numSerie,
    fecha: p.fecha,
    importe: p.importe,
  });
  return `${base}?${qs.toString()}`;
}
