/**
 * Mapea les entitats de la BD (Establiment + Estancia + viatgers/hostes) a
 * l'estructura `ParteViatgers` que consumeix el generador del fitxer.
 * Calcula `esMenor` a partir de la data de naixement (<14 a l'entrada).
 */
import type {
  Establiment as DbEstabliment,
  Estancia as DbEstancia,
  EstanciaViatger as DbViatger,
  Huesped as DbHuesped,
} from '@prisma/client';
import type { ParteViatgers, Viatger } from './fitxer';
import { isMenor } from '../dates';
import { viatgerEfectiu } from '../registre-snapshot';

type ViatgerRow = DbViatger & { huesped: DbHuesped };

export function buildParteFromDb(
  establiment: DbEstabliment,
  estancia: DbEstancia,
  viatgers: ViatgerRow[],
): ParteViatgers {
  return {
    establiment: {
      fileIdentifier: establiment.fileIdentifier ?? '',
      idPolicial: establiment.idPolicial,
      nom: establiment.nom,
    },
    contracte: {
      tipusRegistre: estancia.tipusRegistre,
      numContracte: estancia.numContracte,
      anyContracte: estancia.anyContracte,
      dataFormalitzacio: estancia.dataFormalitzacio,
      dataEntrada: estancia.dataEntrada,
      dataSortida: estancia.dataSortida,
      numViatgers: estancia.numViatgers,
      tipusPagament: estancia.tipusPagament,
      numHabitacions: estancia.numHabitacions ?? undefined,
      teInternet: estancia.teInternet ?? undefined,
    },
    viatgers: viatgers.map((row): Viatger => {
      // Estades antigues: usa les dades congelades (no reescriure el passat).
      const h = viatgerEfectiu(row.huesped, row.dadesCongelades);
      return {
        tipusDocument: h.tipusDocument ?? undefined,
        numDocument: h.numDocument ?? undefined,
        numSuport: h.numSuport ?? undefined,
        dataExpedicio: h.dataExpedicio ?? undefined,
        nom: h.nom,
        cognom1: h.cognom1,
        cognom2: h.cognom2 ?? undefined,
        sexe: h.sexe ?? undefined,
        dataNaixement: h.dataNaixement ?? undefined,
        nacionalitat: h.nacionalitat ?? undefined,
        email: h.email ?? undefined,
        telefon: h.telefon ?? undefined,
        parentesc: row.parentesc ?? undefined,
        esMenor: row.esMenor || isMenor(h.dataNaixement, estancia.dataEntrada),
        adreca: h.adreca ?? undefined,
        pais: h.pais ?? undefined,
        provincia: h.provincia ?? undefined,
        municipi: h.municipi ?? undefined,
        localitat: h.localitat ?? undefined,
        codiPostal: h.codiPostal ?? undefined,
      };
    }),
  };
}
