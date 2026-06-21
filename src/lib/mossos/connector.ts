/**
 * Conector de subida a Mossos (§2.1 nivel 2 · §9.5) — AUTOMATIZACIÓN PENDIENTE.
 *
 * ⚠ No existe API REST pública de Mossos. La subida del "fitxer massiu" se hace
 *   por el portal web (registreviatgers.mossos.gencat.cat). Este conector
 *   automatizaría esa subida con un navegador headless (Playwright), iniciando
 *   sesión con las credenciales CIFRADAS del establecimiento y descargando el
 *   justificante (PDF). Los SELECTORES y el FLUJO deben capturarse de una sesión
 *   REAL del portal (§9.5) antes de implementarlo: NO inventarlos.
 *
 *   MIENTRAS TANTO, el flujo "generar fichero + subida manual" funciona de forma
 *   independiente (ver POST /api/estancies/:id/fitxer y el registro manual del
 *   justificante en POST /api/enviaments/:id).
 *
 * Cuando se tengan los selectores, implementar aquí:
 *   1. launch browser → goto login → rellenar usuari/contrasenya → submit
 *   2. ir a "Fitxers massius" → subir el .txt → leer resultado de autovalidació
 *   3. si OK → "Descarregar comprovant d'enviament" (PDF) → guardar justificante
 *   4. devolver { ok, codiValidacio?, numRegistre?, justificantPath?, errorMsg? }
 */

export interface ConnectorResult {
  ok: boolean;
  codiValidacio?: string;
  numRegistre?: string;
  justificantPath?: string;
  errorMsg?: string;
}

export interface ConnectorInput {
  fitxerPath: string;
  fitxerNom: string;
  usuari: string;
  /** Contraseña EN CLARO (descifrada justo antes de usarla; nunca loguear). */
  contrasenya: string;
  encoding: 'latin1' | 'utf-8';
}

export const CONNECTOR_AVAILABLE = false;

export async function pujaFitxerAMossos(_input: ConnectorInput): Promise<ConnectorResult> {
  // Implementación pendiente de §9.5 (selectores/flujo del portal en vivo).
  return {
    ok: false,
    errorMsg:
      'Conector automático no disponible todavía (§9.5: faltan selectores/flujo del portal). ' +
      'Usa el flujo manual: descarga el .txt, súbelo en el portal de Mossos y registra el justificante.',
  };
}
