/**
 * Veri*Factu — construeix el "RegistroAlta" complet (estructura AEAT) a partir
 * de les dades de la factura, calcula la huella encadenada i la URL del QR.
 * Funció PURA: rep la huella anterior i la marca de temps, no toca BD.
 */
import {
  computeHuellaAlta,
  formatFechaExpedicion,
  formatFechaHoraHuso,
  formatImporte,
} from './hash';
import { buildQrUrl } from './qr';
import { VERIFACTU_SOFTWARE } from './software';

export type TipoFactura = 'F1' | 'F2' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export interface BuildRegistreInput {
  idEmisor: string;
  nomEmisor: string;
  serie: string;
  numero: string;
  tipusFactura: TipoFactura;
  dataExpedicio: Date;
  descripcio: string;
  base: number;
  tipusIva: number;
  quotaIva: number;
  importNoSubjecte: number; // p.ex. tassa turística (IEET), no subjecta a IVA
  nifDestinatari?: string;
  nomDestinatari?: string;
  huellaAnterior: string;
  now: Date;
  testMode: boolean;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface BuiltRegistre {
  numSerieFactura: string;
  fechaExpedicion: string;
  fechaHoraHuso: string;
  quotaTotal: number;
  importeTotal: number;
  huella: string;
  qrUrl: string;
  registro: Record<string, unknown>;
  software: typeof VERIFACTU_SOFTWARE;
}

export function buildRegistreAlta(input: BuildRegistreInput): BuiltRegistre {
  const numSerieFactura = `${input.serie}-${input.numero}`;
  const quotaTotal = round2(input.quotaIva);
  const importeTotal = round2(input.base + input.quotaIva + input.importNoSubjecte);

  const fechaExpedicion = formatFechaExpedicion(input.dataExpedicio);
  const fechaHoraHuso = formatFechaHoraHuso(input.now);
  const cuotaTotalStr = formatImporte(quotaTotal);
  const importeTotalStr = formatImporte(importeTotal);

  const huella = computeHuellaAlta({
    idEmisor: input.idEmisor,
    numSerie: numSerieFactura,
    fechaExpedicion,
    tipoFactura: input.tipusFactura,
    cuotaTotal: cuotaTotalStr,
    importeTotal: importeTotalStr,
    huellaAnterior: input.huellaAnterior,
    fechaHoraHuso,
  });

  const qrUrl = buildQrUrl(
    { nif: input.idEmisor, numSerie: numSerieFactura, fecha: fechaExpedicion, importe: importeTotalStr },
    input.testMode,
  );

  // Desglose: part subjecta a IVA + (opcional) part no subjecta (IEET).
  const desglose: Record<string, unknown>[] = [
    {
      ClaveRegimen: '01', // règim general
      CalificacionOperacion: 'S1', // subjecta i no exempta
      TipoImpositivo: formatImporte(input.tipusIva),
      BaseImponibleOimporteNoSujeto: formatImporte(round2(input.base)),
      CuotaRepercutida: cuotaTotalStr,
    },
  ];
  if (input.importNoSubjecte > 0) {
    desglose.push({
      CalificacionOperacion: 'N1', // no subjecta (p.ex. IEET) — ⚠ confirmar tractament fiscal
      BaseImponibleOimporteNoSujeto: formatImporte(round2(input.importNoSubjecte)),
    });
  }

  const registro: Record<string, unknown> = {
    IDFactura: {
      IDEmisorFactura: input.idEmisor,
      NumSerieFactura: numSerieFactura,
      FechaExpedicionFactura: fechaExpedicion,
    },
    NombreRazonSocialEmisor: input.nomEmisor,
    TipoFactura: input.tipusFactura,
    DescripcionOperacion: input.descripcio,
    ...(input.tipusFactura === 'F1' && input.nifDestinatari
      ? {
          Destinatarios: [
            { NombreRazonSocial: input.nomDestinatari ?? '', NIF: input.nifDestinatari },
          ],
        }
      : {}),
    Desglose: desglose,
    CuotaTotal: cuotaTotalStr,
    ImporteTotal: importeTotalStr,
    Encadenamiento: input.huellaAnterior
      ? { RegistroAnterior: { Huella: input.huellaAnterior } }
      : { PrimerRegistro: 'S' },
    SistemaInformatico: VERIFACTU_SOFTWARE,
    FechaHoraHusoGenRegistro: fechaHoraHuso,
    TipoHuella: '01', // SHA-256
    Huella: huella,
  };

  return {
    numSerieFactura,
    fechaExpedicion,
    fechaHoraHuso,
    quotaTotal,
    importeTotal,
    huella,
    qrUrl,
    registro,
    software: VERIFACTU_SOFTWARE,
  };
}
