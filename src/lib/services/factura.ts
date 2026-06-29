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
import type { FacturaCreateInput } from '../validation/factura';
import {
  FacturaCreateSchema,
  CobramentCreateSchema,
  PagamentEstadaSchema,
  FacturaSeleccioSchema,
  FacturaEditSchema,
  CobramentEditSchema,
  DipositCreateSchema,
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
    const nits = nights(estancia.dataEntrada!, estancia.dataSortida!);
    const ieet = establiment.ieetImportPersonaNit ? Number(establiment.ieetImportPersonaNit) : 0;
    const { base, iva, tasaTotal, total } = computeFacturaTotals({
      linies: input.linies,
      ivaPercent: input.ivaPercent,
      nits,
      persones: estancia.numViatgers,
      ieet,
      aplicarTasa: input.aplicarTasa,
    });

    // Numeració: usa el número proporcionat (si és únic) o genera el següent.
    const year = (input.data ?? new Date()).getFullYear();
    let numero: string;
    if (input.numero?.trim()) {
      const exist = await tx.factura.findFirst({ where: { numero: input.numero.trim() } });
      if (exist) throw new Error(`El número de factura "${input.numero.trim()}" ja existeix`);
      numero = input.numero.trim();
    } else {
      const count = await tx.factura.count({ where: { numero: { startsWith: `${year}-` } } });
      numero = `${year}-${String(count + 1).padStart(4, '0')}`;
    }

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

    // VERI*FACTU — DESACTIVAT: no es generen registres fins que es configuri
    // el certificat AEAT i s'activi explícitament. Tornar a activar quan calgui.
    // En reactivar-lo, generar registre NOMÉS quan tipusDocument === 'FACTURA'
    // (factura fiscal F1): ni la simplificada ni el recibo entren a Veri*Factu.
    // L'import (base/total) ja NO inclou la fiança: el dipòsit és un Diposit a
    // part (custòdia), mai una línia de factura.
    // if (input.tipusDocument === 'FACTURA') { /* crear RegistreVerifactu */ }

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

/**
 * Recalcula l'estat d'una factura a partir dels seus cobraments (devolucions
 * incloses, que resten). Cobrada quan el cobrat ≥ total; si no, Pendent.
 */
async function recomputaEstatFactura(tx: Prisma.TransactionClient, facturaId: string) {
  const f = await tx.factura.findUniqueOrThrow({
    where: { id: facturaId },
    select: { total: true, cobraments: { select: { import: true } } },
  });
  const cobrat = f.cobraments.reduce((a, c) => a + Number(c.import), 0);
  const estat = cobrat >= Number(f.total) ? 'COBRADA' : 'PENDENT';
  await tx.factura.update({ where: { id: facturaId }, data: { estat } });
  return estat as 'COBRADA' | 'PENDENT';
}

/**
 * Edita les línies d'un rebut ja creat i recalcula base/IVA/total (conservant
 * el % d'IVA i la tassa actuals) i l'estat (segons el cobrat). NOMÉS per a
 * rebuts: una factura fiscal amb registre Veri*Factu no es pot editar (cal una
 * rectificativa); el guard del route ho bloqueja abans d'arribar aquí.
 */
export async function editFactura(
  facturaId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = FacturaEditSchema.parse(raw);

  return prisma.$transaction(async (tx) => {
    const factura = await tx.factura.findFirst({
      where: { id: facturaId, deletedAt: null },
      include: { verifactu: { select: { id: true } } },
    });
    if (!factura) throw new Error('Validación fallida: factura no trobada');
    if (factura.tipusDocument !== 'RECIBO' || factura.verifactu) {
      throw new Error('Validación fallida: una factura fiscal no es pot editar');
    }

    // Conserva el % d'IVA i la tassa (no editables aquí): només canvien les línies.
    const oldBase = Number(factura.base);
    const oldIva = Number(factura.iva);
    const tasaTotal = round2(Number(factura.total) - oldBase - oldIva);
    const ivaPercent = oldBase > 0 ? (oldIva / oldBase) * 100 : 0;

    const base = round2(input.linies.reduce((a, l) => a + Number(l.import), 0));
    const iva = round2((base * ivaPercent) / 100);
    const total = round2(base + iva + tasaTotal);

    await tx.liniaFactura.deleteMany({ where: { facturaId } });
    await tx.factura.update({
      where: { id: facturaId },
      data: {
        base,
        iva,
        total,
        linies: {
          create: input.linies.map((l) => ({
            concepte: l.concepte,
            descripcio: l.descripcio,
            import: l.import,
          })),
        },
      },
    });

    const estat = await recomputaEstatFactura(tx, facturaId);

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'MODIFICACIO',
        entitat: 'factura',
        entitatId: facturaId,
        detall: { base, iva, total, linies: input.linies.length, editada: true },
        ip,
      },
      tx,
    );

    return { id: facturaId, base, iva, total, estat };
  });
}

/**
 * Corregeix un cobrament concret (mètode/import/data). Conserva el signe: una
 * devolució (import negatiu) segueix sent devolució. Si és d'una factura,
 * recalcula l'estat d'aquesta.
 */
export async function editCobrament(
  cobramentId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = CobramentEditSchema.parse(raw);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.cobrament.findUnique({ where: { id: cobramentId } });
    if (!existing) throw new Error('Validación fallida: cobrament no trobat');

    const data: Prisma.CobramentUpdateInput = {};
    if (input.metode !== undefined) data.metode = input.metode;
    if (input.data !== undefined) data.data = input.data;
    if (input.import !== undefined) {
      data.import = Number(existing.import) < 0 ? -input.import : input.import;
    }

    const cobrament = await tx.cobrament.update({ where: { id: cobramentId }, data });

    const estat = existing.facturaId
      ? await recomputaEstatFactura(tx, existing.facturaId)
      : null;

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'MODIFICACIO',
        entitat: 'cobrament',
        entitatId: cobramentId,
        detall: {
          facturaId: existing.facturaId,
          import: Number(cobrament.import),
          metode: cobrament.metode,
          editat: true,
        },
        ip,
      },
      tx,
    );

    return { cobrament, estat };
  });
}

/**
 * Elimina un cobrament (a compte o dins d'una factura). Si era d'una factura,
 * en recalcula l'estat (pot tornar a Pendent). El document fiscal no es toca:
 * esborrar un pagament no modifica el registre Veri*Factu.
 */
export async function removeCobrament(
  cobramentId: string,
  actor: { id: string } | null,
  ip: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.cobrament.findUnique({
      where: { id: cobramentId },
      select: { id: true, facturaId: true },
    });
    if (!existing) throw new Error('Validación fallida: cobrament no trobat');

    await tx.cobrament.delete({ where: { id: cobramentId } });

    const estat = existing.facturaId
      ? await recomputaEstatFactura(tx, existing.facturaId)
      : null;

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'ELIMINACIO',
        entitat: 'cobrament',
        entitatId: cobramentId,
        detall: { facturaId: existing.facturaId },
        ip,
      },
      tx,
    );

    return { estat };
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
      facturaId: input.facturaId ?? null,
      concepte: input.concepte,
      descripcio: input.descripcio ?? null,
      observacions: input.observacions ?? null,
      metode: input.metode,
      import: input.import,
      data: input.data ?? new Date(),
    },
  });

  if (input.facturaId) {
    const factura = await prisma.factura.findUnique({
      where: { id: input.facturaId },
      include: { cobraments: true },
    });
    if (factura) {
      const totalCobrat = factura.cobraments.reduce((a, c) => a + Number(c.import), 0) + input.import;
      await prisma.factura.update({
        where: { id: input.facturaId },
        data: { estat: totalCobrat >= Number(factura.total) ? 'COBRADA' : 'PENDENT' },
      });
    }
  }

  await audit({
    usuariId: actor?.id ?? null,
    accio: 'CREACIO',
    entitat: 'cobrament',
    entitatId: cobrament.id,
    detall: { estanciaId, import: input.import, metode: input.metode, aCompte: !input.facturaId, facturaId: input.facturaId ?? null },
    ip,
  });
  return cobrament;
}

/**
 * Registra un dipòsit/fiança d'una estada. CUSTODIA (per defecte) = garantia
 * retornable que NO és ingrés fins que es reté. INGRES = càrrec que ja compta
 * com a ingrés (es crea RETINGUT amb data de resolució), però retornable.
 */
export async function addDiposit(
  estanciaId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = DipositCreateSchema.parse(raw);
  const esIngres = input.destinacio === 'INGRES';
  const diposit = await prisma.diposit.create({
    data: {
      estanciaId,
      import: input.import,
      data: input.data ?? new Date(),
      metode: input.metode,
      notes: input.notes ?? null,
      observacions: input.observacions ?? null,
      estat: esIngres ? 'RETINGUT' : 'EN_CUSTODIA',
      dataResolucio: esIngres ? (input.data ?? new Date()) : null,
    },
  });
  await audit({
    usuariId: actor?.id ?? null,
    accio: 'CREACIO',
    entitat: 'diposit',
    entitatId: diposit.id,
    detall: { estanciaId, import: input.import },
    ip,
  });
  return diposit;
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
    const fiances = input.fiancaIds.length > 0
      ? await tx.diposit.findMany({ where: { id: { in: input.fiancaIds }, estanciaId } })
      : [];

    if (pagaments.length + fiances.length === 0) throw new Error('Cap element seleccionat');

    const total = round2(
      pagaments.reduce((a, p) => a + Number(p.import), 0) +
      fiances.reduce((a, f) => a + Number(f.import), 0),
    );
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
        tipusDocument: input.tipusDocument ?? 'RECIBO',
        linies: {
          create: [
            ...pagaments.map((p) => ({
              concepte: p.concepte,
              descripcio: p.descripcio ?? CONCEPTE_LINIA_LABELS[p.concepte],
              import: p.import,
            })),
            ...fiances.map((f) => ({
              concepte: 'ALLOTJAMENT' as const,
              descripcio: f.notes ?? 'Fiança',
              import: f.import,
            })),
          ],
        },
      },
    });

    await tx.cobrament.updateMany({
      where: { id: { in: pagaments.map((p) => p.id) } },
      data: { facturaId: factura.id },
    });

    if (fiances.length > 0) {
      await tx.diposit.updateMany({
        where: { id: { in: fiances.map((f) => f.id) } },
        data: { facturaId: factura.id },
      });
    }

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'CREACIO',
        entitat: 'factura',
        entitatId: factura.id,
        detall: { numero, total, pagaments: pagaments.length, fiances: fiances.length, perSeleccio: true },
        ip,
      },
      tx,
    );

    return factura;
  });
}
