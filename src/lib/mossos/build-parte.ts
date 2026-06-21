/**
 * Mapea las entidades de la BD (Establiment + Estancia + viatgers/huéspedes)
 * a la estructura `ParteViatgers` que consume el generador del fitxer.
 * Calcula `esMenor` a partir de la fecha de nacimiento (<14 al entrar).
 */
import type {
  Establiment as DbEstabliment,
  Estancia as DbEstancia,
  EstanciaViatger as DbViatger,
  Huesped as DbHuesped,
  Parentesc,
} from '@prisma/client';
import type { ParteViatgers, Viatger } from './fitxer';
import { isMenor } from '../dates';

const PARENTESC_LABELS: Record<Parentesc, string> = {
  AVI_AVIA: 'Avi/àvia',
  BESAVI_BESAVIA: 'Besavi/besàvia',
  BESNET_BESNETA: 'Besnét/besnéta',
  CUNYAT_CUNYADA: 'Cunyat/cunyada',
  CONJUGE: 'Cònjuge',
  FILL_FILLA: 'Fill/filla',
  GERMA_GERMANA: 'Germà/germana',
  NET_NETA: 'Nét/néta',
  PARE_MARE: 'Pare o mare',
  NEBOT_NEBODA: 'Nebot/neboda',
  SOGRE_SOGRA: 'Sogre/sogra',
  ONCLE_TIA: 'Oncle/tia',
  TUTOR_TUTORA: 'Tutor/tutora',
  GENDRE_NORA: 'Gendre o nora',
  ALTRES: 'Altres',
};

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
      const h = row.huesped;
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
        parentesc: row.parentesc ? PARENTESC_LABELS[row.parentesc] : undefined,
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
