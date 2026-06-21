/**
 * Veri*Factu — consulta de la cadena de registres i verificació d'integritat
 * (recalcula la huella de cada registre i comprova l'encadenament).
 */
import 'server-only';
import { prisma } from '../db';
import { audit } from '../audit';
import { computeHuellaAlta, formatFechaExpedicion, formatImporte } from '../verifactu/hash';
import { buildRegistroAltaXml, buildRegFactuEnvelope } from '../verifactu/xml';
import { enviarRegFactu, AeatNotConfiguredError } from '../verifactu/aeat-client';

const ESTABLIMENT_ID = 'hostal-coll';
export { AeatNotConfiguredError };

export interface VerifactuChainItem {
  id: string;
  facturaId: string;
  numSerieFactura: string;
  tipusFactura: string;
  dataExpedicio: Date;
  importTotal: number;
  quotaTotal: number;
  huella: string;
  huellaAnterior: string;
  estat: string;
  csv: string | null;
  qrUrl: string;
  cadenaOk: boolean;
  huellaOk: boolean;
}

export async function getVerifactuChain(): Promise<{
  items: VerifactuChainItem[];
  integre: boolean;
}> {
  const registres = await prisma.registreVerifactu.findMany({ orderBy: { createdAt: 'asc' } });

  let prevHuella = '';
  const items: VerifactuChainItem[] = registres.map((r) => {
    const recomputada = computeHuellaAlta({
      idEmisor: r.nifEmisor,
      numSerie: r.numSerieFactura,
      fechaExpedicion: formatFechaExpedicion(r.dataExpedicio),
      tipoFactura: r.tipusFactura,
      cuotaTotal: formatImporte(Number(r.quotaTotal)),
      importeTotal: formatImporte(Number(r.importTotal)),
      huellaAnterior: r.huellaAnterior,
      fechaHoraHuso: r.fechaHoraHuso,
    });
    const huellaOk = recomputada === r.huella;
    const cadenaOk = r.huellaAnterior === prevHuella;
    prevHuella = r.huella;
    return {
      id: r.id,
      facturaId: r.facturaId,
      numSerieFactura: r.numSerieFactura,
      tipusFactura: r.tipusFactura,
      dataExpedicio: r.dataExpedicio,
      importTotal: Number(r.importTotal),
      quotaTotal: Number(r.quotaTotal),
      huella: r.huella,
      huellaAnterior: r.huellaAnterior,
      estat: r.estat,
      csv: r.csv,
      qrUrl: r.qrUrl,
      cadenaOk,
      huellaOk,
    };
  });

  return { items, integre: items.every((i) => i.cadenaOk && i.huellaOk) };
}

/**
 * Envia un registre Veri*Factu a l'AEAT (servei SOAP) i actualitza l'estat
 * (ENVIAT/ACCEPTAT/ERROR) amb el CSV i els errors retornats.
 * Llança AeatNotConfiguredError si falta el certificat.
 */
export async function enviarRegistre(
  registreId: string,
  actor: { id: string } | null,
  ip: string | null,
): Promise<{ estat: string; csv: string | null; error: string | null }> {
  const r = await prisma.registreVerifactu.findUniqueOrThrow({ where: { id: registreId } });
  const establiment = await prisma.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID } });

  // Dades del registre anterior per a l'encadenament (RegistroAnterior).
  let anterior: {
    idEmisor: string;
    numSerieFactura: string;
    fechaExpedicion: string;
    huella: string;
  } | null = null;
  if (r.huellaAnterior) {
    const prev = await prisma.registreVerifactu.findFirst({ where: { huella: r.huellaAnterior } });
    if (prev) {
      anterior = {
        idEmisor: prev.nifEmisor,
        numSerieFactura: prev.numSerieFactura,
        fechaExpedicion: formatFechaExpedicion(prev.dataExpedicio),
        huella: prev.huella,
      };
    }
  }

  const altaXml = buildRegistroAltaXml({
    idEmisor: r.nifEmisor,
    nomEmisor: r.nomEmisor,
    numSerieFactura: r.numSerieFactura,
    fechaExpedicion: formatFechaExpedicion(r.dataExpedicio),
    tipoFactura: r.tipusFactura,
    descripcio: r.descripcio,
    nifDestinatari: r.nifDestinatari,
    nomDestinatari: r.nomDestinatari,
    base: Number(r.baseImposable),
    tipusIva: Number(r.tipusIva),
    quotaIva: Number(r.quotaIva),
    importNoSubjecte: Number(r.importNoSubjecte),
    quotaTotal: Number(r.quotaTotal),
    importeTotal: Number(r.importTotal),
    fechaHoraHuso: r.fechaHoraHuso,
    huella: r.huella,
    anterior,
  });
  const envelope = buildRegFactuEnvelope(
    { nifEmisor: r.nifEmisor, nomEmisor: r.nomEmisor },
    [altaXml],
  );

  try {
    const res = await enviarRegFactu(envelope, establiment.verifactuTestMode);
    const estat = res.ok ? 'ACCEPTAT' : 'ERROR';
    await prisma.registreVerifactu.update({
      where: { id: registreId },
      data: {
        estat,
        dataEnviament: new Date(),
        csv: res.csv,
        aeatEstat: res.estadoRegistro ?? res.estadoEnvio,
        aeatErrorCodi: res.codigoError,
        aeatErrorDesc: res.descripcionError,
        respostaRaw: res.raw.slice(0, 8000),
      },
    });
    await audit({
      usuariId: actor?.id ?? null,
      accio: 'ENVIAMENT',
      entitat: 'registre_verifactu',
      entitatId: registreId,
      detall: { estat, csv: res.csv, aeatEstat: res.estadoRegistro ?? res.estadoEnvio },
      ip,
    });
    return { estat, csv: res.csv, error: res.descripcionError };
  } catch (err) {
    if (err instanceof AeatNotConfiguredError) throw err;
    const msg = err instanceof Error ? err.message : 'Error d’enviament';
    await prisma.registreVerifactu.update({
      where: { id: registreId },
      data: { estat: 'ERROR', dataEnviament: new Date(), aeatErrorDesc: msg },
    });
    await audit({
      usuariId: actor?.id ?? null,
      accio: 'ENVIAMENT',
      entitat: 'registre_verifactu',
      entitatId: registreId,
      detall: { estat: 'ERROR', error: msg },
      ip,
    });
    return { estat: 'ERROR', csv: null, error: msg };
  }
}
