/**
 * Servicio de registro: crea la estancia + viajeros aplicando la filosofía
 * "una vez y reutilizar" (dedup de huésped por documento, §8 Fase 2) dentro de
 * una transacción, y deja traza en audit_log.
 */
import 'server-only';
import type { EstatEstancia, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { audit } from '../audit';
import { isMenor } from '../dates';
import type { RegistreParsed } from '../validation/registre';

const ESTABLIMENT_ID = 'hostal-coll';

function estatFromTipus(tipus: RegistreParsed['estancia']['tipusRegistre']): EstatEstancia {
  return tipus === 'RESERVA' ? 'RESERVA' : 'EN_CURS';
}

/** Campos de huésped que se pueden persistir desde un viatger del formulario. */
function huespedDataFromViatger(v: RegistreParsed['viatgers'][number]): Prisma.HuespedCreateInput {
  return {
    nom: v.nom,
    cognom1: v.cognom1,
    cognom2: v.cognom2 ?? null,
    sexe: v.sexe ?? null,
    dataNaixement: v.dataNaixement ?? null,
    nacionalitat: v.nacionalitat ?? null,
    tipusDocument: v.tipusDocument ?? null,
    numDocument: v.numDocument ?? null,
    numSuport: v.numSuport ?? null,
    dataExpedicio: v.dataExpedicio ?? null,
    email: v.email ?? null,
    telefon: v.telefon ?? null,
    adreca: v.adreca ?? null,
    pais: v.pais ?? null,
    provincia: v.provincia ?? null,
    municipi: v.municipi ?? null,
    localitat: v.localitat ?? null,
    codiPostal: v.codiPostal ?? null,
  };
}

/**
 * Para huéspedes reutilizados (CRM): actualiza SOLO los campos que vienen
 * informados (tel/dirección/email/documento…), sin tocar el resto ni el historial.
 */
function huespedUpdateFromViatger(
  v: RegistreParsed['viatgers'][number],
): Prisma.HuespedUpdateInput {
  const d: Prisma.HuespedUpdateInput = {};
  if (v.cognom2 !== undefined) d.cognom2 = v.cognom2;
  if (v.sexe !== undefined) d.sexe = v.sexe;
  if (v.dataNaixement !== undefined) d.dataNaixement = v.dataNaixement;
  if (v.nacionalitat !== undefined) d.nacionalitat = v.nacionalitat;
  if (v.numSuport !== undefined) d.numSuport = v.numSuport;
  if (v.dataExpedicio !== undefined) d.dataExpedicio = v.dataExpedicio;
  if (v.email !== undefined) d.email = v.email;
  if (v.telefon !== undefined) d.telefon = v.telefon;
  if (v.adreca !== undefined) d.adreca = v.adreca;
  if (v.pais !== undefined) d.pais = v.pais;
  if (v.provincia !== undefined) d.provincia = v.provincia;
  if (v.municipi !== undefined) d.municipi = v.municipi;
  if (v.localitat !== undefined) d.localitat = v.localitat;
  if (v.codiPostal !== undefined) d.codiPostal = v.codiPostal;
  return d;
}

export interface CreateRegistreResult {
  estanciaId: string;
  reusedHuespedIds: string[];
  createdHuespedIds: string[];
}

export async function createRegistre(
  input: RegistreParsed,
  actor: { id: string } | null,
  ip: string | null,
  opts: { esBorrany?: boolean } = {},
): Promise<CreateRegistreResult> {
  const { estancia, viatgers, mascotes } = input;

  return prisma.$transaction(async (tx) => {
    const reused: string[] = [];
    const created: string[] = [];

    // 1) Resolver el huésped de cada viajero (dedup por documento).
    const resolved: { huespedId: string; v: RegistreParsed['viatgers'][number] }[] = [];
    for (const v of viatgers) {
      let huespedId = v.huespedId;

      if (!huespedId && v.tipusDocument && v.numDocument) {
        const existing = await tx.huesped.findUnique({
          where: { huesped_document: { tipusDocument: v.tipusDocument, numDocument: v.numDocument } },
        });
        if (existing) huespedId = existing.id;
      }

      if (huespedId) {
        // Ficha existente: actualiza solo lo informado, conserva el historial.
        const update = huespedUpdateFromViatger(v);
        if (Object.keys(update).length > 0) {
          await tx.huesped.update({ where: { id: huespedId }, data: update });
        }
        reused.push(huespedId);
      } else {
        const h = await tx.huesped.create({ data: huespedDataFromViatger(v) });
        huespedId = h.id;
        created.push(h.id);
      }
      resolved.push({ huespedId, v });
    }

    // 2) Crear la estancia.
    const est = await tx.estancia.create({
      data: {
        establiment: { connect: { id: ESTABLIMENT_ID } },
        tipusRegistre: estancia.tipusRegistre,
        numContracte: estancia.numContracte,
        anyContracte: estancia.anyContracte,
        dataFormalitzacio: estancia.dataFormalitzacio,
        dataEntrada: estancia.dataEntrada ?? undefined,
        dataSortida: estancia.dataSortida ?? undefined,
        numViatgers: estancia.numViatgers,
        tipusPagament: estancia.tipusPagament,
        numHabitacions: estancia.numHabitacions ?? null,
        teInternet: estancia.teInternet ?? null,
        observacions: estancia.observacions ?? null,
        idioma: estancia.idioma ?? 'ca',
        estat: estatFromTipus(estancia.tipusRegistre),
        esBorrany: opts.esBorrany ?? false,
        ...(estancia.habitacioId ? { habitacio: { connect: { id: estancia.habitacioId } } } : {}),
      },
    });

    // 3) Crear los joins estancia_viatger.
    for (const { huespedId, v } of resolved) {
      await tx.estanciaViatger.create({
        data: {
          estanciaId: est.id,
          huespedId,
          esTitular: v.esTitular,
          parentesc: v.parentesc ?? null,
          esMenor: v.esMenor || isMenor(v.dataNaixement, estancia.dataEntrada ?? new Date()),
          habitacioSeparadaId: v.habitacioSeparadaId ?? null,
          numContracteSeparat: v.habitacioSeparadaId ? (v.numContracteSeparat ?? null) : null,
        },
      });
    }

    // 3.5) Mascotes (opcional): s'associen al titular de l'estada (CRM §5).
    if (mascotes && mascotes.length > 0) {
      const titular = resolved.find((r) => r.v.esTitular) ?? resolved[0];
      if (titular) {
        for (const m of mascotes) {
          await tx.animal.create({
            data: {
              nom: m.nom,
              especie: m.especie,
              mida: m.mida ?? null,
              huespedId: titular.huespedId,
            },
          });
        }
      }
    }

    // Tasques de neteja: es creen manualment des de /neteja, no automàticament.

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'CREACIO',
        entitat: 'estancia',
        entitatId: est.id,
        detall: {
          tipusRegistre: estancia.tipusRegistre,
          numViatgers: viatgers.length,
          reused: reused.length,
          created: created.length,
        },
        ip,
      },
      tx,
    );

    return {
      estanciaId: est.id,
      reusedHuespedIds: reused,
      createdHuespedIds: created,
      // IDs dels hostes en el MATEIX ordre que els viatgers d'entrada (per
      // adjuntar documents per viatger després de crear l'estada).
      viatgerHuespedIds: resolved.map((r) => r.huespedId),
    };
  });
}

/**
 * Edita una estada existent amb el formulari mestre complet: dades de l'estada
 * + viatgers (afegir/treure/modificar) + estat d'esborrany. Reconcilia els
 * viatgers (els hostes reutilitzats s'actualitzen; els que es treuen es
 * desvinculen; els nous es creen/enllacen). NO toca pagaments, fiances ni
 * mascotes (es gestionen a la fitxa). Tampoc canvia l'estat (RESERVA/EN_CURS…).
 */
export async function updateRegistre(
  estanciaId: string,
  input: RegistreParsed,
  actor: { id: string } | null,
  ip: string | null,
  opts: { esBorrany?: boolean } = {},
): Promise<{ estanciaId: string; viatgerHuespedIds: string[] }> {
  const { estancia, viatgers } = input;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.estancia.findFirst({
      where: { id: estanciaId, deletedAt: null },
      include: { viatgers: true },
    });
    if (!existing) throw new Error('Validación fallida: estada no trobada');

    // 1) Resol l'hoste de cada viatger (id donat, dedup per document, o crear) i
    //    actualitza les seves dades (edició explícita: s'actualitza tot).
    const resolved: { huespedId: string; v: RegistreParsed['viatgers'][number] }[] = [];
    for (const v of viatgers) {
      let huespedId = v.huespedId;
      if (!huespedId && v.tipusDocument && v.numDocument) {
        const ex = await tx.huesped.findUnique({
          where: { huesped_document: { tipusDocument: v.tipusDocument, numDocument: v.numDocument } },
        });
        if (ex) huespedId = ex.id;
      }
      if (huespedId) {
        await tx.huesped.update({
          where: { id: huespedId },
          data: huespedDataFromViatger(v) as Prisma.HuespedUpdateInput,
        });
      } else {
        const h = await tx.huesped.create({ data: huespedDataFromViatger(v) });
        huespedId = h.id;
      }
      resolved.push({ huespedId, v });
    }

    // 2) Reconcilia els enllaços estancia_viatger.
    const desitjats = new Set(resolved.map((r) => r.huespedId));
    for (const link of existing.viatgers) {
      if (!desitjats.has(link.huespedId)) {
        await tx.estanciaViatger.delete({ where: { id: link.id } });
      }
    }
    for (const { huespedId, v } of resolved) {
      const link = existing.viatgers.find((l) => l.huespedId === huespedId);
      const data = {
        esTitular: v.esTitular,
        parentesc: v.parentesc ?? null,
        esMenor: v.esMenor || isMenor(v.dataNaixement, estancia.dataEntrada ?? new Date()),
        habitacioSeparadaId: v.habitacioSeparadaId ?? null,
        numContracteSeparat: v.habitacioSeparadaId ? (v.numContracteSeparat ?? null) : null,
      };
      if (link) {
        await tx.estanciaViatger.update({ where: { id: link.id }, data });
      } else {
        await tx.estanciaViatger.create({ data: { estanciaId, huespedId, ...data } });
      }
    }

    // 3) Actualitza les dades de l'estada (sense tocar l'estat ni l'establiment).
    await tx.estancia.update({
      where: { id: estanciaId },
      data: {
        tipusRegistre: estancia.tipusRegistre,
        numContracte: estancia.numContracte,
        anyContracte: estancia.anyContracte,
        dataFormalitzacio: estancia.dataFormalitzacio,
        dataEntrada: estancia.dataEntrada ?? undefined,
        dataSortida: estancia.dataSortida ?? undefined,
        numViatgers: viatgers.length,
        tipusPagament: estancia.tipusPagament,
        numHabitacions: estancia.numHabitacions ?? null,
        teInternet: estancia.teInternet ?? null,
        observacions: estancia.observacions ?? null,
        idioma: estancia.idioma ?? 'ca',
        esBorrany: opts.esBorrany ?? false,
        habitacioId: estancia.habitacioId ?? null,
      },
    });

    // 4) Sincronitza la tasca de neteja de la sortida (data/habitació) si n'hi ha.
    if (estancia.habitacioId) {
      await tx.tascaNeteja.updateMany({
        where: { vinculadaSortidaId: estanciaId },
        data: { data: estancia.dataSortida, habitacioId: estancia.habitacioId },
      });
    }

    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'MODIFICACIO',
        entitat: 'estancia',
        entitatId: estanciaId,
        detall: { numViatgers: viatgers.length, esBorrany: opts.esBorrany ?? false, editComplet: true },
        ip,
      },
      tx,
    );

    return { estanciaId, viatgerHuespedIds: resolved.map((r) => r.huespedId) };
  });
}

/**
 * Amplia una estada: crea un registre nou enllaçat a l'original, numerat
 * 1.1, 1.2… reutilitzant hostes i habitació, amb les noves dates.
 */
export async function ampliarEstancia(
  estanciaId: string,
  dates: {
    dataEntrada: Date;
    dataSortida: Date;
    habitacioId?: string | null;
    reaprofitarFirmes?: boolean;
    dataSignatura?: Date | null;
    llocSignatura?: string | null;
  },
  actor: { id: string } | null,
  ip: string | null,
): Promise<{ estanciaId: string; numContracte: string }> {
  return prisma.$transaction(
    async (tx) => {
      const base = await tx.estancia.findUniqueOrThrow({ where: { id: estanciaId } });
      const rootId = base.estanciaOrigenId ?? base.id;
      const root = await tx.estancia.findUniqueOrThrow({
        where: { id: rootId },
        include: { viatgers: { include: { signatura: true } } },
      });
      // Habitació de l'ampliació: la indicada o, per defecte, la de l'estada.
      const habId = dates.habitacioId !== undefined ? dates.habitacioId : root.habitacioId;

      const count = await tx.estancia.count({ where: { estanciaOrigenId: rootId } });
      const numContracte = `${root.numContracte}.${count + 1}`;

      const nova = await tx.estancia.create({
        data: {
          establiment: { connect: { id: ESTABLIMENT_ID } },
          origen: { connect: { id: rootId } },
          tipusRegistre: 'CONTRACTE_EN_CURS',
          numContracte,
          anyContracte: root.anyContracte,
          dataFormalitzacio: new Date(),
          dataEntrada: dates.dataEntrada,
          dataSortida: dates.dataSortida,
          numViatgers: root.viatgers.length,
          tipusPagament: root.tipusPagament,
          numHabitacions: root.numHabitacions,
          teInternet: root.teInternet,
          estat: 'EN_CURS',
          ...(habId ? { habitacio: { connect: { id: habId } } } : {}),
        },
      });

      const reaprofita = dates.reaprofitarFirmes ?? false;
      for (const v of root.viatgers) {
        const nv = await tx.estanciaViatger.create({
          data: {
            estanciaId: nova.id,
            huespedId: v.huespedId,
            esTitular: v.esTitular,
            parentesc: v.parentesc,
            esMenor: v.esMenor,
          },
        });
        // Reaprofita la signatura de l'estada original, amb la "Localitat i data"
        // del dia de l'ampliació (o la indicada). Així no cal tornar a signar.
        if (reaprofita && v.signatura) {
          await tx.signatura.create({
            data: {
              estanciaViatgerId: nv.id,
              imatge: v.signatura.imatge,
              llocSignatura: dates.llocSignatura ?? v.signatura.llocSignatura,
              data: dates.dataSignatura ?? new Date(),
              hora: v.signatura.hora,
              usuariId: actor?.id ?? null,
            },
          });
        }
      }


      await audit(
        {
          usuariId: actor?.id ?? null,
          accio: 'CREACIO',
          entitat: 'estancia',
          entitatId: nova.id,
          detall: { ampliacioDe: rootId, numContracte },
          ip,
        },
        tx,
      );

      return { estanciaId: nova.id, numContracte };
    },
    { isolationLevel: 'Serializable' },
  );
}
