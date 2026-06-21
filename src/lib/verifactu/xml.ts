/**
 * Veri*Factu — construcció de l'XML SOAP per al servei "RegFactuSistemaFacturacion".
 * Funcions PURES (sense BD ni xarxa) → testejables.
 *
 * ⚠ L'estructura segueix l'esquema de l'AEAT (RegistroAlta). Confirmar els
 *   namespaces/versió contra el WSDL vigent abans de l'enviament real.
 */
import {
  NS_SUM,
  NS_SUM1,
  VERIFACTU_ID_VERSION,
  VERIFACTU_SOFTWARE,
} from './software';
import { formatImporte } from './hash';

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface RegistroAltaXmlInput {
  idEmisor: string;
  nomEmisor: string;
  numSerieFactura: string;
  fechaExpedicion: string; // dd-mm-aaaa
  tipoFactura: string;
  descripcio: string;
  nifDestinatari?: string | null;
  nomDestinatari?: string | null;
  base: number;
  tipusIva: number;
  quotaIva: number;
  importNoSubjecte: number;
  quotaTotal: number;
  importeTotal: number;
  fechaHoraHuso: string;
  huella: string;
  // Encadenament: dades del registre anterior (o null si és el primer).
  anterior: {
    idEmisor: string;
    numSerieFactura: string;
    fechaExpedicion: string;
    huella: string;
  } | null;
}

export function buildRegistroAltaXml(r: RegistroAltaXmlInput): string {
  const desglose: string[] = [
    `<sum1:DetalleDesglose>` +
      `<sum1:Impuesto>01</sum1:Impuesto>` +
      `<sum1:ClaveRegimen>01</sum1:ClaveRegimen>` +
      `<sum1:CalificacionOperacion>S1</sum1:CalificacionOperacion>` +
      `<sum1:TipoImpositivo>${formatImporte(r.tipusIva)}</sum1:TipoImpositivo>` +
      `<sum1:BaseImponibleOimporteNoSujeto>${formatImporte(r.base)}</sum1:BaseImponibleOimporteNoSujeto>` +
      `<sum1:CuotaRepercutida>${formatImporte(r.quotaIva)}</sum1:CuotaRepercutida>` +
      `</sum1:DetalleDesglose>`,
  ];
  if (r.importNoSubjecte > 0) {
    desglose.push(
      `<sum1:DetalleDesglose>` +
        `<sum1:Impuesto>01</sum1:Impuesto>` +
        `<sum1:CalificacionOperacion>N1</sum1:CalificacionOperacion>` +
        `<sum1:BaseImponibleOimporteNoSujeto>${formatImporte(r.importNoSubjecte)}</sum1:BaseImponibleOimporteNoSujeto>` +
        `</sum1:DetalleDesglose>`,
    );
  }

  const destinatari =
    r.tipoFactura === 'F1' && r.nifDestinatari
      ? `<sum1:Destinatarios><sum1:IDDestinatario>` +
        `<sum1:NombreRazonSocial>${xmlEscape(r.nomDestinatari ?? '')}</sum1:NombreRazonSocial>` +
        `<sum1:NIF>${xmlEscape(r.nifDestinatari)}</sum1:NIF>` +
        `</sum1:IDDestinatario></sum1:Destinatarios>`
      : '';

  const encadenament = r.anterior
    ? `<sum1:Encadenamiento><sum1:RegistroAnterior>` +
      `<sum1:IDEmisorFactura>${xmlEscape(r.anterior.idEmisor)}</sum1:IDEmisorFactura>` +
      `<sum1:NumSerieFactura>${xmlEscape(r.anterior.numSerieFactura)}</sum1:NumSerieFactura>` +
      `<sum1:FechaExpedicionFactura>${r.anterior.fechaExpedicion}</sum1:FechaExpedicionFactura>` +
      `<sum1:Huella>${r.anterior.huella}</sum1:Huella>` +
      `</sum1:RegistroAnterior></sum1:Encadenamiento>`
    : `<sum1:Encadenamiento><sum1:PrimerRegistro>S</sum1:PrimerRegistro></sum1:Encadenamiento>`;

  const sw = VERIFACTU_SOFTWARE;
  const sistema =
    `<sum1:SistemaInformatico>` +
    `<sum1:NombreRazonSocial>${xmlEscape(sw.nombreRazonSocial)}</sum1:NombreRazonSocial>` +
    `<sum1:NIF>${xmlEscape(sw.nif)}</sum1:NIF>` +
    `<sum1:NombreSistemaInformatico>${xmlEscape(sw.nombreSistemaInformatico)}</sum1:NombreSistemaInformatico>` +
    `<sum1:IdSistemaInformatico>${sw.idSistemaInformatico}</sum1:IdSistemaInformatico>` +
    `<sum1:Version>${xmlEscape(sw.version)}</sum1:Version>` +
    `<sum1:NumeroInstalacion>${sw.numeroInstalacion}</sum1:NumeroInstalacion>` +
    `<sum1:TipoUsoPosibleSoloVerifactu>${sw.tipoUsoPosibleSoloVerifactu}</sum1:TipoUsoPosibleSoloVerifactu>` +
    `<sum1:TipoUsoPosibleMultiOT>${sw.tipoUsoPosibleMultiOT}</sum1:TipoUsoPosibleMultiOT>` +
    `<sum1:IndicadorMultiplesOT>${sw.indicadorMultiplesOT}</sum1:IndicadorMultiplesOT>` +
    `</sum1:SistemaInformatico>`;

  return (
    `<sum1:RegistroAlta>` +
    `<sum1:IDVersion>${VERIFACTU_ID_VERSION}</sum1:IDVersion>` +
    `<sum1:IDFactura>` +
    `<sum1:IDEmisorFactura>${xmlEscape(r.idEmisor)}</sum1:IDEmisorFactura>` +
    `<sum1:NumSerieFactura>${xmlEscape(r.numSerieFactura)}</sum1:NumSerieFactura>` +
    `<sum1:FechaExpedicionFactura>${r.fechaExpedicion}</sum1:FechaExpedicionFactura>` +
    `</sum1:IDFactura>` +
    `<sum1:NombreRazonSocialEmisor>${xmlEscape(r.nomEmisor)}</sum1:NombreRazonSocialEmisor>` +
    `<sum1:TipoFactura>${r.tipoFactura}</sum1:TipoFactura>` +
    `<sum1:DescripcionOperacion>${xmlEscape(r.descripcio)}</sum1:DescripcionOperacion>` +
    destinatari +
    `<sum1:Desglose>${desglose.join('')}</sum1:Desglose>` +
    `<sum1:CuotaTotal>${formatImporte(r.quotaTotal)}</sum1:CuotaTotal>` +
    `<sum1:ImporteTotal>${formatImporte(r.importeTotal)}</sum1:ImporteTotal>` +
    encadenament +
    sistema +
    `<sum1:FechaHoraHusoGenRegistro>${r.fechaHoraHuso}</sum1:FechaHoraHusoGenRegistro>` +
    `<sum1:TipoHuella>01</sum1:TipoHuella>` +
    `<sum1:Huella>${r.huella}</sum1:Huella>` +
    `</sum1:RegistroAlta>`
  );
}

/** Envolcall SOAP complet amb la cabecera (obligat a emetre) i N registres. */
export function buildRegFactuEnvelope(
  cabecera: { nifEmisor: string; nomEmisor: string },
  registrosAltaXml: string[],
): string {
  const registros = registrosAltaXml
    .map((x) => `<sum:RegistroFactura>${x}</sum:RegistroFactura>`)
    .join('');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `xmlns:sum="${NS_SUM}" xmlns:sum1="${NS_SUM1}">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    `<sum:RegFactuSistemaFacturacion>` +
    `<sum:Cabecera>` +
    `<sum1:ObligadoEmision>` +
    `<sum1:NombreRazonSocial>${xmlEscape(cabecera.nomEmisor)}</sum1:NombreRazonSocial>` +
    `<sum1:NIF>${xmlEscape(cabecera.nifEmisor)}</sum1:NIF>` +
    `</sum1:ObligadoEmision>` +
    `</sum:Cabecera>` +
    registros +
    `</sum:RegFactuSistemaFacturacion>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`
  );
}

/** Extreu els camps clau de la resposta SOAP de l'AEAT (sense dependència d'XML parser). */
export function parseAeatResponse(xml: string): {
  estadoEnvio: string | null;
  estadoRegistro: string | null;
  csv: string | null;
  codigoError: string | null;
  descripcionError: string | null;
} {
  const pick = (tag: string) => {
    const m = new RegExp(`<(?:\\w+:)?${tag}>([^<]*)</(?:\\w+:)?${tag}>`).exec(xml);
    return m ? m[1]!.trim() : null;
  };
  return {
    estadoEnvio: pick('EstadoEnvio'),
    estadoRegistro: pick('EstadoRegistro'),
    csv: pick('CSV'),
    codigoError: pick('CodigoErrorRegistro'),
    descripcionError: pick('DescripcionErrorRegistro'),
  };
}
