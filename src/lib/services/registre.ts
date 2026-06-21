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
): Promise<CreateRegistreResult> {
  const { estancia, viatgers } = input;

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
        dataEntrada: estancia.dataEntrada,
        dataSortida: estancia.dataSortida,
        numViatgers: estancia.numViatgers,
        tipusPagament: estancia.tipusPagament,
        numHabitacions: estancia.numHabitacions ?? null,
        teInternet: estancia.teInternet ?? null,
        observacions: estancia.observacions ?? null,
        estat: estatFromTipus(estancia.tipusRegistre),
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
          esMenor: v.esMenor || isMenor(v.dataNaixement, estancia.dataEntrada),
        },
      });
    }

    // 4) Generar automáticamente la tarea de limpieza de la salida (Fase 1.5):
    //    canvi complet ("esbancar") el día de check-out, vinculada a la estancia.
    if (estancia.habitacioId) {
      await tx.tascaNeteja.create({
        data: {
          data: estancia.dataSortida,
          habitacioId: estancia.habitacioId,
          tipus: 'CANVI_COMPLET',
          estat: 'PENDENT',
          vinculadaSortidaId: est.id,
        },
      });
    }

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

    return { estanciaId: est.id, reusedHuespedIds: reused, createdHuespedIds: created };
  });
}
