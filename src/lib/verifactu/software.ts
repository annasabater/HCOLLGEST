/**
 * Veri*Factu — dades del "Sistema Informàtic de Facturació" (SIF) i URLs del QR.
 *
 * ⚠ PENDENT: el NIF i la raó social del PRODUCTOR del software els exigeix
 *   l'AEAT (RegistroAlta → SistemaInformatico). Omple'ls abans d'enviar a l'AEAT.
 */
export const VERIFACTU_SOFTWARE = {
  nombreRazonSocial: 'TODO — raó social del productor del software',
  nif: 'TODO_NIF_PRODUCTOR', // ⚠ NIF del productor del software
  nombreSistemaInformatico: 'HostalColl Gestió',
  idSistemaInformatico: '01',
  version: '0.1.0',
  numeroInstalacion: '001',
  tipoUsoPosibleSoloVerifactu: 'S',
  tipoUsoPosibleMultiOT: 'N',
  indicadorMultiplesOT: 'N',
} as const;

// QR de cotejo de l'AEAT (servei "ValidarQR").
export const QR_BASE_URL_PROD = 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR';
export const QR_BASE_URL_TEST = 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR';

// Servei web SOAP "RegFactuSistemaFacturacion" (Veri*Factu).
// ⚠ Confirmar l'endpoint i els namespaces exactes contra el WSDL vigent de l'AEAT.
export const VERIFACTU_SOAP_PROD =
  'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP';
export const VERIFACTU_SOAP_TEST =
  'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP';

export const NS_SUM =
  'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd';
export const NS_SUM1 =
  'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd';
export const VERIFACTU_ID_VERSION = '1.0';

// Llegenda obligatòria a la factura (mode Veri*Factu).
export const VERIFACTU_LLEGENDA =
  'Factura verificable a la seu electrònica de l’AEAT — VERI*FACTU';

export const TIPUS_FACTURA_VERIFACTU_LABELS: Record<string, string> = {
  F1: 'F1 — Factura completa',
  F2: 'F2 — Factura simplificada',
  R1: 'R1 — Rectificativa (error fonamentat)',
  R2: 'R2 — Rectificativa (concurs)',
  R3: 'R3 — Rectificativa (deute incobrable)',
  R4: 'R4 — Rectificativa (altres)',
  R5: 'R5 — Rectificativa de simplificada',
};
