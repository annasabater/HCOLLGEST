/**
 * Servicio de facturación (Fase 3): crea factura con líneas, calcula IVA y la
 * tasa turística (IEET configurable §9.7), y gestiona cobros (marca COBRADA).
 */
import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { audit } from '../audit';
import { nights } from '../dates';
import { computeFacturaTotals } from '../factura-calc';
import { buildRegistreAlta, type TipoFactura } from '../verifactu/record';
import type { FacturaCreateInput } from '../validation/factura';
import {
  FacturaCreateSchema,
  CobramentCreateSchema,
  PagamentEstadaSchema,
  FacturaSeleccioSchema,
} from '../validation/factura';
import { CONCEPTE_LINIA_LABELS } from '../validation/enums';

const ESTABLIMENT_ID = 'hostal-coll';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function createFactura(
  raw: FacturaCreateInput,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = FacturaCreateSchema.parse(raw);

  return prisma.$transaction(async (tx) => {
    const estancia = await tx.estancia.findUniqueOrThrow({ where: { id: input.estanciaId } });
    const establiment = await tx.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID } });

    // Tasa turística (IEET): nits × persones × import/persona·nit.
    const nits = nights(estancia.dataEntrada, estancia.dataSortida);
    const ieet = establiment.ieetImportPersonaNit ? Number(establiment.ieetImportPersonaNit) : 0;
    const { base, iva, tasaTotal, total } = computeFacturaTotals({
      linies: input.linies,
      ivaPercent: input.ivaPercent,
      nits,
      persones: estancia.numViatgers,
      ieet,
      aplicarTasa: input.aplicarTasa,
    });

    // Numeración: {any}-{seq 4 dígitos}, secuencia POR AÑO (no global).
    const year = (input.data ?? new Date()).getFullYear();
    const count = await tx.factura.count({ where: { numero: { startsWith: `${year}-` } } });
    const numero = `${year}-${String(count + 1).padStart(4, '0')}`;

    const data = input.data ?? new Date();
    const factura = await tx.factura.create({
      data: {
        estanciaId: input.estanciaId,
        numero,
        data,
        base,
        iva,
        total,
        estat: 'PENDENT',
        tipusDocument: input.tipusDocument,
        linies: {
          create: input.linies.map((l) => ({
            concepte: l.concepte,
            descripcio: l.descripcio,
            import: l.import,
          })),
        },
      },
      include: { linies: true },
    });

    if (tasaTotal > 0) {
      await tx.tasaTuristica.create({
        data: { estanciaId: input.estanciaId, nits, importPersonaNit: ieet, total: tasaTotal },
      });
    }

    // Veri*Factu: si és una factura fiscal (no un recibo), genera el registre
    // d'alta encadenat (huella SHA-256 + QR) dins de la mateixa transacció.
    if (input.tipusDocument !== 'RECIBO') {
      const tipusFactura: TipoFactura = input.tipusDocument === 'FACTURA' ? 'F1' : 'F2';
      const prev = await tx.registreVerifactu.findFirst({ orderBy: { createdAt: 'desc' } });
      const descripcio = input.descripcioOperacio ?? 'Allotjament i serveis';
      const built = buildRegistreAlta({
        idEmisor: establiment.cif,
        nomEmisor: establiment.nom,
        serie: establiment.verifactuSerie,
        numero,
        tipusFactura,
        dataExpedicio: data,
        descripcio,
        base,
        tipusIva: input.ivaPercent,
        quotaIva: iva,
        importNoSubjecte: tasaTotal,
        nifDestinatari: input.nifDestinatari,
        nomDestinatari: input.nomDestinatari,
        huellaAnterior: prev?.huella ?? '',
        now: new Date(),
        testMode: establiment.verifactuTestMode,
      });

      await tx.registreVerifactu.create({
        data: {
          facturaId: factura.id,
          tipusFactura,
          serie: establiment.verifactuSerie,
          numero,
          numSerieFactura: built.numSerieFactura,
          dataExpedicio: data,
          nifEmisor: establiment.cif,
          nomEmisor: establiment.nom,
          nifDestinatari: input.nifDestinatari ?? null,
          nomDestinatari: input.nomDestinatari ?? null,
          descripcio,
          baseImposable: base,
          tipusIva: input.ivaPercent,
          quotaIva: iva,
          importNoSubjecte: tasaTotal,
          quotaTotal: built.quotaTotal,
          importTotal: built.importeTotal,
          huella: built.huella,
          huellaAnterior: prev?.huella ?? '',
          fechaHoraHuso: built.fechaHoraHuso,
          qrUrl: built.qrUrl,
          registreJson: built.registro as unknown as Prisma.InputJsonValue,
          softwareJson: built.software as unknown as Prisma.InputJsonValue,
          estat: 'GENERAT',
        },
      });
    }

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'CREACIO',
        entitat: 'factura',
        entitatId: factura.id,
        detall: { numero, base, iva, tasaTotal, total, tipusDocument: input.tipusDocument },
        ip,
      },
      tx,
    );

    return factura;
    // Serializable: evita que dos altes simultànies llegeixin la mateixa huella
    // anterior i bifurquin la cadena Veri*Factu.
  }, { isolationLevel: 'Serializable' });
}

export async function addCobrament(
  facturaId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = CobramentCreateSchema.parse(raw);

  return prisma.$transaction(async (tx) => {
    const factura = await tx.factura.findUniqueOrThrow({
      where: { id: facturaId },
      include: { cobraments: true },
    });

    // Una devolució (reemborsament) es desa com a import NEGATIU: així resta de
    // l'ingrés i del total cobrat automàticament.
    const signedImport = input.tipus === 'DEVOLUCIO' ? -input.import : input.import;

    const cobrament = await tx.cobrament.create({
      data: {
        estanciaId: factura.estanciaId,
        facturaId,
        metode: input.metode,
        import: signedImport,
        data: input.data ?? new Date(),
      },
    });

    const totalCobrat = factura.cobraments.reduce((a, c) => a + Number(c.import), 0) + signedImport;
    const cobrada = totalCobrat >= Number(factura.total);
    // Es recalcula sempre: una devolució pot tornar la factura a PENDENT.
    await tx.factura.update({
      where: { id: facturaId },
      data: { estat: cobrada ? 'COBRADA' : 'PENDENT' },
    });

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'MODIFICACIO',
        entitat: 'cobrament',
        entitatId: cobrament.id,
        detall: { facturaId, import: signedImport, metode: input.metode, tipus: input.tipus },
        ip,
      },
      tx,
    );

    return { cobrament, estat: cobrada ? 'COBRADA' : 'PENDENT' };
  });
}

/** Registra un pagament a compte de l'estada (sense factura encara). És ingrés ja. */
export async function addPagamentEstada(
  estanciaId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = PagamentEstadaSchema.parse(raw);
  const est = await prisma.estancia.findFirst({
    where: { id: estanciaId, deletedAt: null },
    select: { id: true },
  });
  if (!est) throw new Error('Estada no trobada');

  const cobrament = await prisma.cobrament.create({
    data: {
      estanciaId,
      facturaId: null,
      concepte: input.concepte,
      descripcio: input.descripcio ?? null,
      metode: input.metode,
      import: input.import,
      data: input.data ?? new Date(),
    },
  });
  await audit({
    usuariId: actor?.id ?? null,
    accio: 'CREACIO',
    entitat: 'cobrament',
    entitatId: cobrament.id,
    detall: { estanciaId, import: input.import, metode: input.metode, aCompte: true },
    ip,
  });
  return cobrament;
}

/**
 * Crea un rebut a partir de pagaments ja registrats de l'estada (els seleccionats):
 * les línies són aquests pagaments i s'hi assignen (facturaId). Com que ja estan
 * cobrats, queda COBRADA. Els no seleccionats es queden a compte (retornables).
 */
export async function createFacturaSeleccio(
  estanciaId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = FacturaSeleccioSchema.parse(raw);

  return prisma.$transaction(async (tx) => {
    const pagaments = await tx.cobrament.findMany({
      where: { id: { in: input.pagamentIds }, estanciaId, facturaId: null },
    });
    if (pagaments.length === 0) throw new Error('Cap pagament a compte seleccionat');

    const total = round2(pagaments.reduce((a, p) => a + Number(p.import), 0));
    const year = new Date().getFullYear();
    const count = await tx.factura.count({ where: { numero: { startsWith: `${year}-` } } });
    const numero = `${year}-${String(count + 1).padStart(4, '0')}`;

    const factura = await tx.factura.create({
      data: {
        estanciaId,
        numero,
        data: new Date(),
        base: total,
        iva: 0,
        total,
        estat: 'COBRADA',
        tipusDocument: 'RECIBO',
        linies: {
          create: pagaments.map((p) => ({
            concepte: p.concepte,
            descripcio: p.descripcio ?? CONCEPTE_LINIA_LABELS[p.concepte],
            import: p.import,
          })),
        },
      },
    });

    await tx.cobrament.updateMany({
      where: { id: { in: pagaments.map((p) => p.id) } },
      data: { facturaId: factura.id },
    });

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'CREACIO',
        entitat: 'factura',
        entitatId: factura.id,
        detall: { numero, total, pagaments: pagaments.length, perSeleccio: true },
        ip,
      },
      tx,
    );

    return factura;
  });
}
