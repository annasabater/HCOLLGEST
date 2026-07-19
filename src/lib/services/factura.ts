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
  FinalitzarAnticipadaSchema,
  FacturaRectificativaSchema,
} from '../validation/factura';
import { CONCEPTE_LINIA_LABELS } from '../validation/enums';

const ESTABLIMENT_ID = 'hostal-coll';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Següent número de factura de l'any (format `AAAA-NNNN`). Es calcula a partir
 * del número MÉS ALT de les factures VIGENTS (no esborrades) + 1. En esborrar una
 * factura el seu número s'allibera (a DELETE es retola la factura esborrada amb un
 * sufix), de manera que es pot tornar a utilitzar.
 */
export async function proximNumeroFactura(
  client: Prisma.TransactionClient,
  year: number,
): Promise<string> {
  const prefix = `${year}-`;
  const last = await client.factura.findFirst({
    where: { numero: { startsWith: prefix }, deletedAt: null },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  const seq = last ? (parseInt(last.numero.slice(prefix.length), 10) || 0) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Número de factura basat en el NÚMERO DE CONTRACTE de l'estada: la primera
 * factura és el número de contracte tal qual (p. ex. "26004") i les següents de
 * la mateixa estada hi afegeixen ".1", ".2"… Inclou factures esborrades perquè el
 * número és @unique i no es pot reutilitzar. Retorna '' si no hi ha núm. contracte.
 */
export async function proximNumeroFacturaContracte(
  client: Prisma.TransactionClient,
  estanciaId: string,
): Promise<string> {
  const est = await client.estancia.findUnique({
    where: { id: estanciaId },
    select: { numContracte: true },
  });
  const base = (est?.numContracte ?? '').trim();
  if (!base) return '';
  const existents = await client.factura.findMany({
    where: { OR: [{ numero: base }, { numero: { startsWith: `${base}.` } }] },
    select: { numero: true },
  });
  const nums = existents.map((f) => f.numero);
  if (!nums.includes(base)) return base;
  let max = 0;
  for (const n of nums) {
    if (n.startsWith(`${base}.`)) {
      const s = parseInt(n.slice(base.length + 1), 10);
      if (!isNaN(s) && s > max) max = s;
    }
  }
  return `${base}.${max + 1}`;
}

/**
 * Número de factura FISCAL: sèrie contínua per any en format NN/YY (01/26,
 * 02/26…). Pren el número més alt de les factures fiscals de l'any + 1. Inclou
 * esborrades (número @unique) perquè la sèrie fiscal no reutilitzi números.
 */
export async function proximNumeroFacturaFiscal(
  client: Prisma.TransactionClient,
  year: number,
): Promise<string> {
  const yy = String(year % 100).padStart(2, '0');
  const fiscals = await client.factura.findMany({
    where: { tipusDocument: 'FACTURA', numero: { endsWith: `/${yy}` } },
    select: { numero: true },
  });
  let max = 0;
  for (const f of fiscals) {
    const slash = f.numero.indexOf('/');
    const nn = slash > 0 ? parseInt(f.numero.slice(0, slash), 10) : NaN;
    if (!isNaN(nn) && nn > max) max = nn;
  }
  return `${String(max + 1).padStart(2, '0')}/${yy}`;
}

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
      if (exist) {
        throw new Error(
          `Validación fallida: el número de factura "${input.numero.trim()}" ja existeix. Canvia'l o deixa'l buit per generar-ne un de nou.`,
        );
      }
      numero = input.numero.trim();
    } else {
      numero = await proximNumeroFactura(tx, year);
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

const OVERRIDE_FIELDS = [
  'clientNom',
  'clientNif',
  'clientAdreca',
  'clientLocalitat',
  'emissorTitular',
  'emissorNif',
  'emissorAdreca',
  'emissorLocalitat',
] as const;

/**
 * Edita una factura ja creada: línies (recalcula base/IVA/total conservant el %
 * d'IVA i la tassa), número, data, estat, i les sobreescriptures manuals de
 * client/emissor editades a la impressió (buides = tornen a calcular-se soles).
 * NOMÉS per a rebuts: una factura fiscal amb registre Veri*Factu no es pot
 * editar (cal una rectificativa); el guard del route ho bloqueja abans d'arribar
 * aquí.
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
    if (factura.verifactu) throw new Error('Validación fallida: una factura amb Veri*Factu no es pot editar');

    // Canvi de número: validar unicitat.
    let numero = factura.numero;
    if (input.numero && input.numero.trim() !== factura.numero) {
      const exist = await tx.factura.findFirst({ where: { numero: input.numero.trim(), id: { not: facturaId } } });
      if (exist) throw new Error(`El número "${input.numero.trim()}" ja existeix`);
      numero = input.numero.trim();
    }

    // Data i sobreescriptures de client/emissor: sempre aplicables, no depenen
    // de si també s'editen línies. `undefined` = no es toca; `null` = neteja.
    const overrides: Prisma.FacturaUpdateInput = {};
    if (input.data !== undefined) overrides.data = input.data;
    for (const f of OVERRIDE_FIELDS) {
      const v = input[f];
      if (v !== undefined) overrides[f] = v;
    }

    // Canvi d'estat directe (sense recalcular per cobraments).
    if (input.estat && !input.linies) {
      await tx.factura.update({ where: { id: facturaId }, data: { estat: input.estat, numero, ...overrides } });
      await audit({ usuariId: actor?.id ?? null, accio: 'MODIFICACIO', entitat: 'factura', entitatId: facturaId, detall: { estat: input.estat, numero }, ip }, tx);
      return { id: facturaId, estat: input.estat };
    }

    if (!input.linies) {
      // Sense línies: només número/data/overrides (p. ex. des de la impressió).
      await tx.factura.update({ where: { id: facturaId }, data: { numero, ...overrides } });
      await audit({ usuariId: actor?.id ?? null, accio: 'MODIFICACIO', entitat: 'factura', entitatId: facturaId, detall: { numero, editada: true }, ip }, tx);
      return { id: facturaId };
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
        numero,
        base,
        iva,
        total,
        ...overrides,
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
        detall: { base, iva, total, linies: input.linies.length, numero, editada: true },
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
      periodes: input.periodes
        ? { create: input.periodes.map((p) => ({ dataInici: p.dataInici, dataFi: p.dataFi, import: p.import })) }
        : undefined,
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
      periodes: input.periodes
        ? { create: input.periodes.map((p) => ({ dataInici: p.dataInici, dataFi: p.dataFi, import: p.import })) }
        : undefined,
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
 * Finalitza una estada de forma anticipada: escurça la data de sortida real,
 * marca l'estada FINALITZADA, deixa una nota interna OBJECTIVA al titular i a les
 * observacions de l'estada, i (opcionalment) registra la devolució de diners com
 * a cobrament negatiu a compte (resta de l'ingrés). Allibera l'habitació perquè
 * la disponibilitat es calcula per `dataSortida`.
 */
export async function finalitzarEstanciaAnticipada(
  estanciaId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = FinalitzarAnticipadaSchema.parse(raw);
  const est = await prisma.estancia.findFirst({
    where: { id: estanciaId, deletedAt: null },
    include: {
      habitacio: { select: { nom: true } },
      viatgers: {
        where: { esTitular: true },
        take: 1,
        select: { huesped: { select: { id: true } } },
      },
    },
  });
  if (!est) throw new Error('Estada no trobada');
  if (!est.dataEntrada) throw new Error("L'estada no té data d'entrada");
  if (input.dataSortida < est.dataEntrada) {
    throw new Error("La data de sortida no pot ser anterior a l'entrada");
  }

  const fmt = (d: Date) => d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Hora només si no és mitjanit (00:00) — l'usuari pot indicar-la opcionalment.
  const teHora = input.dataSortida.getHours() !== 0 || input.dataSortida.getMinutes() !== 0;
  const fmtDataHora = (d: Date) =>
    teHora
      ? `${fmt(d)} a les ${d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}`
      : fmt(d);
  const habNom = est.habitacio?.nom ?? null;
  const titularId = est.viatgers[0]?.huesped?.id ?? null;
  const prevista = est.dataSortida;
  const retornImport = input.retorn ? input.retornImport ?? 0 : 0;

  const nota =
    `Sortida anticipada: ha deixat ${habNom ? `l'habitació ${habNom}` : "l'allotjament"} el ${fmtDataHora(input.dataSortida)}` +
    `${prevista ? ` (sortida prevista: ${fmt(prevista)})` : ''}.` +
    `${retornImport > 0 ? ` S'han retornat ${retornImport.toFixed(2)} €.` : ' No s\'ha retornat cap import.'}`;

  await prisma.$transaction(async (tx) => {
    await tx.estancia.update({
      where: { id: estanciaId },
      data: {
        dataSortida: input.dataSortida,
        estat: 'FINALITZADA',
        sortidaAnticipada: true,
        // Guarda la sortida original només la primera vegada (per poder desfer-ho).
        ...(est.sortidaAnticipada ? {} : { dataSortidaPrevista: est.dataSortida }),
        observacions: est.observacions ? `${est.observacions}\n${nota}` : nota,
      },
    });
    if (titularId) {
      await tx.anotacioHuesped.create({
        data: {
          huespedId: titularId,
          estanciaId,
          sentit: 'NEUTRA',
          tipus: 'Sortida anticipada',
          descripcio: nota,
          privada: true,
          usuariId: actor?.id ?? null,
        },
      });
    }
    if (retornImport > 0) {
      // La devolució es data el dia del PAGAMENT original: així al balanç es
      // resta al mateix període i l'ingrés del mes reflecteix el net real
      // (el que la persona ha pagat de veritat), no el brut.
      const darrerPagament = await tx.cobrament.findFirst({
        where: { estanciaId, import: { gt: 0 } },
        orderBy: { data: 'desc' },
        select: { data: true },
      });
      await tx.cobrament.create({
        data: {
          estanciaId,
          concepte: 'ALLOTJAMENT',
          descripcio: 'Devolució per sortida anticipada',
          metode: input.retornMetode ?? 'EFECTIU',
          import: -retornImport,
          data: darrerPagament?.data ?? new Date(),
        },
      });
    }
  });

  await audit({
    usuariId: actor?.id ?? null,
    accio: 'MODIFICACIO',
    entitat: 'estancia',
    entitatId: estanciaId,
    detall: { sortidaAnticipada: true, dataSortida: input.dataSortida.toISOString(), retorn: retornImport },
    ip,
  });
  return { ok: true, retorn: retornImport };
}

/**
 * Desfà una sortida anticipada (feta per error): torna l'estada a allotjada
 * (EN_CURS), restaura la data de sortida original, i neteja el rastre que va
 * deixar la sortida anticipada — la nota interna del titular, les línies de la
 * nota a les observacions i la devolució que s'hagués registrat.
 */
export async function reactivarEstancia(
  estanciaId: string,
  actor: { id: string } | null,
  ip: string | null,
) {
  const est = await prisma.estancia.findFirst({
    where: { id: estanciaId, deletedAt: null },
    select: { id: true, sortidaAnticipada: true, dataSortidaPrevista: true, observacions: true },
  });
  if (!est) throw new Error('Estada no trobada');
  if (!est.sortidaAnticipada) throw new Error('Aquesta estada no està marcada com a sortida anticipada');

  // Treu les línies de la nota de sortida anticipada de les observacions.
  const observacionsNet =
    est.observacions
      ?.split('\n')
      .filter((l) => !l.trim().startsWith('Sortida anticipada:'))
      .join('\n')
      .trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.estancia.update({
      where: { id: estanciaId },
      data: {
        dataSortida: est.dataSortidaPrevista ?? undefined,
        estat: 'EN_CURS',
        sortidaAnticipada: false,
        dataSortidaPrevista: null,
        observacions: observacionsNet,
      },
    });
    await tx.anotacioHuesped.deleteMany({
      where: { estanciaId, tipus: 'Sortida anticipada' },
    });
    await tx.cobrament.deleteMany({
      where: { estanciaId, descripcio: 'Devolució per sortida anticipada' },
    });
  });

  await audit({
    usuariId: actor?.id ?? null,
    accio: 'MODIFICACIO',
    entitat: 'estancia',
    entitatId: estanciaId,
    detall: { reactivada: true },
    ip,
  });
  return { ok: true };
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
    const estancia = await tx.estancia.findUniqueOrThrow({ where: { id: estanciaId }, select: { dataEntrada: true } });
    const pagaments = await tx.cobrament.findMany({
      where: { id: { in: input.pagamentIds }, estanciaId, facturaId: null },
    });
    const fiances = input.fiancaIds.length > 0
      ? await tx.diposit.findMany({ where: { id: { in: input.fiancaIds }, estanciaId } })
      : [];

    if (pagaments.length + fiances.length === 0) throw new Error('Cap element seleccionat');

    // La factura porta la data d'ENTRADA de l'estada (no el dia en què es genera):
    // sovint es factura dies després de l'estada i l'usuari vol que el document
    // reflecteixi quan va ser l'allotjament, no quan s'ha polsat el botó.
    const dataFactura = estancia.dataEntrada ?? new Date();

    const esFiscal = input.tipusDocument === 'FACTURA';
    const totalPag = round2(pagaments.reduce((a, p) => a + Number(p.import), 0));
    const totalFi = round2(fiances.reduce((a, f) => a + Number(f.import), 0));
    // La fiança compta al total si és FISCAL (sempre) o si a la simplificada s'ha
    // triat "amb fiança". Si no, la fiança va a part (document "amb fiança").
    const incloureFianca = esFiscal || input.ambFianca === true;
    const total = incloureFianca ? round2(totalPag + totalFi) : totalPag;

    let numero: string;
    if (input.numero?.trim()) {
      const exist = await tx.factura.findFirst({ where: { numero: input.numero.trim() } });
      if (exist) {
        throw new Error(
          `Validación fallida: el número de factura "${input.numero.trim()}" ja existeix. Canvia'l o deixa'l buit per generar-ne un de nou.`,
        );
      }
      numero = input.numero.trim();
    } else if (esFiscal) {
      // Sèrie fiscal contínua: 01/26, 02/26…
      numero = await proximNumeroFacturaFiscal(tx, dataFactura.getFullYear());
    } else {
      // Simplificada: número basat en el contracte de l'estada (26004, 26004.1…).
      numero =
        (await proximNumeroFacturaContracte(tx, estanciaId)) ||
        (await proximNumeroFactura(tx, dataFactura.getFullYear()));
    }

    const descAllot = input.descripcioAllotjament?.trim() || CONCEPTE_LINIA_LABELS.ALLOTJAMENT;
    const factura = await tx.factura.create({
      data: {
        estanciaId,
        numero,
        data: dataFactura,
        base: total,
        iva: 0,
        total,
        estat: 'COBRADA',
        tipusDocument: input.tipusDocument ?? 'RECIBO',
        fiancaInclosa: totalFi > 0 ? incloureFianca : undefined,
        // Una sola línia d'allotjament amb el TOTAL (si s'inclou la fiança, ja hi
        // està sumada; no es fa una línia de fiança a part).
        linies:
          total > 0
            ? { create: [{ concepte: 'ALLOTJAMENT' as const, descripcio: descAllot, import: total }] }
            : undefined,
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

/**
 * Crea una FACTURA RECTIFICATIVA (reducció) d'una factura simplificada anterior:
 * una nova factura simplificada amb import NEGATIU i una única línia que explica
 * el motiu ("Reducción de factura simplificada Nº… · Motivo: …"). El número
 * segueix la sèrie del contracte (26001 → 26001.1). NO crea cap cobrament: la
 * devolució de diners ja s'ha registrat com a cobrament negatiu a part, així que
 * l'ingrés no es toca; aquesta factura és només el document fiscal de la reducció.
 */
export async function createFacturaRectificativa(
  estanciaId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = FacturaRectificativaSchema.parse(raw);

  return prisma.$transaction(async (tx) => {
    const original = await tx.factura.findFirst({
      where: { id: input.facturaOriginalId, estanciaId, deletedAt: null },
      select: { numero: true },
    });
    if (!original) throw new Error('Validación fallida: factura original no trobada');

    const estancia = await tx.estancia.findUniqueOrThrow({
      where: { id: estanciaId },
      select: { dataEntrada: true },
    });
    const dataFactura = input.data ?? estancia.dataEntrada ?? new Date();

    // Import negatiu (reducció) i text del motiu.
    const imp = -Math.abs(round2(input.import));
    const motiu = input.motiu?.trim() || 'reducción de estancia';
    const descripcio = `Reducción de factura simplificada Nº${original.numero}. Motivo: ${motiu}`;

    // Número: segueix la sèrie del contracte (26001 → 26001.1); si no n'hi ha,
    // el següent seqüencial de l'any. Es pot forçar amb input.numero.
    let numero: string;
    if (input.numero?.trim()) {
      const exist = await tx.factura.findFirst({ where: { numero: input.numero.trim() } });
      if (exist) {
        throw new Error(
          `Validación fallida: el número de factura "${input.numero.trim()}" ja existeix. Canvia'l o deixa'l buit per generar-ne un de nou.`,
        );
      }
      numero = input.numero.trim();
    } else {
      numero =
        (await proximNumeroFacturaContracte(tx, estanciaId)) ||
        (await proximNumeroFactura(tx, dataFactura.getFullYear()));
    }

    const factura = await tx.factura.create({
      data: {
        estanciaId,
        numero,
        data: dataFactura,
        base: imp,
        iva: 0,
        total: imp,
        estat: 'COBRADA',
        tipusDocument: 'FACTURA_SIMPLIFICADA',
        linies: { create: [{ concepte: 'ALLOTJAMENT' as const, descripcio, import: imp }] },
      },
    });

    // Vincula les devolucions (cobraments negatius, encara sense factura) que
    // aquesta rectificativa cobreix: així deixen de sortir com "a compte sense
    // factura" al panell de pagaments, ja que ara les representa aquest document.
    if (input.cobramentIds.length > 0) {
      await tx.cobrament.updateMany({
        where: { id: { in: input.cobramentIds }, estanciaId, facturaId: null, import: { lt: 0 } },
        data: { facturaId: factura.id },
      });
    }

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'CREACIO',
        entitat: 'factura',
        entitatId: factura.id,
        detall: { numero, total: imp, rectificaNumero: original.numero, rectificativa: true, cobraments: input.cobramentIds.length },
        ip,
      },
      tx,
    );

    return factura;
  });
}

/**
 * Crea ALHORA una factura FISCAL (va a Veri*Factu) i una SIMPLIFICADA (còpia pel
 * client, NO va a Veri*Factu), amb el MATEIX import (inclou la fiança). Els
 * pagaments/fiances només es vinculen a la fiscal; l'ingrés es compta un sol cop
 * (els ingressos surten dels cobraments, no de les factures).
 */
export async function createFacturaDupla(
  estanciaId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const input = FacturaSeleccioSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const estancia = await tx.estancia.findUniqueOrThrow({ where: { id: estanciaId }, select: { dataEntrada: true } });
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
    const teFianca = fiances.length > 0;
    const descAllot = input.descripcioAllotjament?.trim() || CONCEPTE_LINIA_LABELS.ALLOTJAMENT;
    // La factura porta la data d'ENTRADA de l'estada (no el dia en què es genera).
    const dataFactura = estancia.dataEntrada ?? new Date();
    const year = dataFactura.getFullYear();
    const liniaData = () =>
      total > 0
        ? { create: [{ concepte: 'ALLOTJAMENT' as const, descripcio: descAllot, import: total }] }
        : undefined;

    const numFiscal = await proximNumeroFacturaFiscal(tx, year);
    const fiscal = await tx.factura.create({
      data: {
        estanciaId, numero: numFiscal, data: dataFactura, base: total, iva: 0, total,
        estat: 'COBRADA', tipusDocument: 'FACTURA',
        fiancaInclosa: teFianca ? true : undefined, linies: liniaData(),
      },
    });

    const numSimple =
      (await proximNumeroFacturaContracte(tx, estanciaId)) || (await proximNumeroFactura(tx, year));
    const simple = await tx.factura.create({
      data: {
        estanciaId, numero: numSimple, data: dataFactura, base: total, iva: 0, total,
        estat: 'COBRADA', tipusDocument: 'FACTURA_SIMPLIFICADA',
        fiancaInclosa: teFianca ? true : undefined, linies: liniaData(),
      },
    });

    // Vincle només a la fiscal (l'oficial): l'ingrés no es duplica.
    if (pagaments.length > 0) {
      await tx.cobrament.updateMany({ where: { id: { in: pagaments.map((p) => p.id) } }, data: { facturaId: fiscal.id } });
    }
    if (fiances.length > 0) {
      await tx.diposit.updateMany({ where: { id: { in: fiances.map((f) => f.id) } }, data: { facturaId: fiscal.id } });
    }

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'CREACIO',
        entitat: 'factura',
        entitatId: fiscal.id,
        detall: { fiscal: fiscal.numero, simple: simple.numero, total, dupla: true },
        ip,
      },
      tx,
    );

    return { fiscal, simple };
  });
}
