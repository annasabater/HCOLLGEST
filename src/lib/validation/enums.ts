/**
 * Enums del dominio + etiquetas humanas (catalán oficial) compartidas por
 * cliente y servidor. Los valores coinciden con los enums de Prisma.
 */
import { z } from 'zod';

export const tipusRegistreValues = ['CONTRACTE_EN_CURS', 'RESERVA'] as const;
export const tipusDocumentValues = ['DNI_NIF', 'NIE', 'PASSAPORT', 'ALTRES'] as const;
export const sexeValues = ['HOME', 'DONA'] as const;
export const tipusPagamentValues = [
  'DESTINACIO',
  'EFECTIU',
  'MOBIL',
  'PLATAFORMA',
  'TARGETA_CREDIT',
  'TRANSFERENCIA',
  'TARGETA_REGAL',
  'BIZUM',
] as const;
// Opcions que s'ofereixen a l'alta d'estada (la resta es conserven per a
// registres antics, però no es proposen de nou).
export const tipusPagamentFormValues = [
  'DESTINACIO',
  'BIZUM',
  'EFECTIU',
  'TRANSFERENCIA',
  'TARGETA_CREDIT',
] as const;
export const parentescValues = [
  'AVI_AVIA',
  'BESAVI_BESAVIA',
  'BESNET_BESNETA',
  'CUNYAT_CUNYADA',
  'CONJUGE',
  'FILL_FILLA',
  'GERMA_GERMANA',
  'NET_NETA',
  'PARE_MARE',
  'NEBOT_NEBODA',
  'SOGRE_SOGRA',
  'ONCLE_TIA',
  'TUTOR_TUTORA',
  'GENDRE_NORA',
  'ALTRES',
] as const;
export const estatEnviamentValues = [
  'PENDENT',
  'ENVIAT',
  'ACCEPTAT',
  'REBUTJAT',
  'ERROR',
] as const;
export const sentitAnotacioValues = ['POSITIVA', 'NEGATIVA', 'NEUTRA'] as const;
export const tipusDocumentPujatValues = [
  'DNI_ANVERS',
  'DNI_REVERS',
  'PASSAPORT',
  'NIE',
  'RESIDENCIA',
  'CARNET_CONDUIR',
  'ALTRES',
] as const;
export const tipusNetejaValues = ['CANVI_COMPLET', 'REPAS'] as const;
export const estatTascaValues = ['PENDENT', 'FETA'] as const;
export const estatFacturaValues = ['PENDENT', 'COBRADA'] as const;
export const concepteLiniaValues = ['ALLOTJAMENT', 'EXTRA', 'DESCOMPTE', 'TASA'] as const;
export const metodeCobramentValues = [
  'EFECTIU',
  'TARGETA',
  'TRANSFERENCIA',
  'BIZUM',
  'ALTRES',
] as const;
export const estatActiuValues = [
  'NOU',
  'BO',
  'REGULAR',
  'SUBSTITUCIO_RECOMANADA',
  'OBSOLET',
] as const;
export const tipusHistorialActiuValues = [
  'REPARACIO',
  'AVARIA',
  'CANVI_UBICACIO',
  'SUBSTITUCIO',
] as const;
export const tipusAbsenciaValues = ['VACANCES', 'BAIXA', 'ALTRES'] as const;

export const TipusRegistreEnum = z.enum(tipusRegistreValues);
export const TipusDocumentEnum = z.enum(tipusDocumentValues);
export const SexeEnum = z.enum(sexeValues);
export const TipusPagamentEnum = z.enum(tipusPagamentValues);
export const ParentescEnum = z.enum(parentescValues);
export const SentitAnotacioEnum = z.enum(sentitAnotacioValues);

export const TIPUS_REGISTRE_LABELS: Record<(typeof tipusRegistreValues)[number], string> = {
  CONTRACTE_EN_CURS: 'Contracte en curs',
  RESERVA: 'Reserva',
};

export const TIPUS_DOCUMENT_LABELS: Record<(typeof tipusDocumentValues)[number], string> = {
  DNI_NIF: 'DNI/NIF',
  NIE: 'NIE',
  PASSAPORT: 'Passaport',
  ALTRES: 'Altres documents',
};

export const SEXE_LABELS: Record<(typeof sexeValues)[number], string> = {
  HOME: 'Home',
  DONA: 'Dona',
};

export const TIPUS_PAGAMENT_LABELS: Record<(typeof tipusPagamentValues)[number], string> = {
  DESTINACIO: 'Pagament a destinació',
  EFECTIU: 'Efectiu',
  MOBIL: 'Pagament per mòbil',
  PLATAFORMA: 'Plataforma de pagament',
  TARGETA_CREDIT: 'Targeta de crèdit',
  TRANSFERENCIA: 'Transferència',
  TARGETA_REGAL: 'Targeta regal',
  BIZUM: 'Bizum',
};

export const PARENTESC_LABELS: Record<(typeof parentescValues)[number], string> = {
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

export const ESTAT_ENVIAMENT_LABELS: Record<(typeof estatEnviamentValues)[number], string> = {
  PENDENT: 'Pendent',
  ENVIAT: 'Enviat',
  ACCEPTAT: 'Acceptat',
  REBUTJAT: 'Rebutjat',
  ERROR: 'Error',
};

export const SENTIT_ANOTACIO_LABELS: Record<(typeof sentitAnotacioValues)[number], string> = {
  POSITIVA: 'Positiva',
  NEGATIVA: 'Negativa',
  NEUTRA: 'Neutra',
};

export const TIPUS_DOCUMENT_PUJAT_LABELS: Record<
  (typeof tipusDocumentPujatValues)[number],
  string
> = {
  DNI_ANVERS: 'DNI (anvers)',
  DNI_REVERS: 'DNI (revers)',
  PASSAPORT: 'Passaport',
  NIE: 'NIE',
  RESIDENCIA: 'Permís de residència',
  CARNET_CONDUIR: 'Carnet de conduir',
  ALTRES: 'Altres',
};

export const TIPUS_NETEJA_LABELS: Record<(typeof tipusNetejaValues)[number], string> = {
  CANVI_COMPLET: 'Sortida habitació',
  REPAS: 'Manteniment',
};

export const ESTAT_TASCA_LABELS: Record<(typeof estatTascaValues)[number], string> = {
  PENDENT: 'Pendent',
  FETA: 'Feta',
};

export const ESTAT_FACTURA_LABELS: Record<(typeof estatFacturaValues)[number], string> = {
  PENDENT: 'Pendent',
  COBRADA: 'Cobrada',
};

export const CONCEPTE_LINIA_LABELS: Record<(typeof concepteLiniaValues)[number], string> = {
  ALLOTJAMENT: 'Allotjament',
  EXTRA: 'Extra',
  DESCOMPTE: 'Descompte',
  TASA: 'Tassa',
};

export const METODE_COBRAMENT_LABELS: Record<(typeof metodeCobramentValues)[number], string> = {
  EFECTIU: 'Efectiu',
  TARGETA: 'Targeta',
  TRANSFERENCIA: 'Transferència',
  BIZUM: 'Bizum',
  ALTRES: 'Altres',
};

export const ESTAT_ACTIU_LABELS: Record<(typeof estatActiuValues)[number], string> = {
  NOU: 'Nou',
  BO: 'Bo',
  REGULAR: 'Regular',
  SUBSTITUCIO_RECOMANADA: 'Substitució recomanada',
  OBSOLET: 'Obsolet',
};

export const TIPUS_HISTORIAL_ACTIU_LABELS: Record<
  (typeof tipusHistorialActiuValues)[number],
  string
> = {
  REPARACIO: 'Reparació',
  AVARIA: 'Avaria',
  CANVI_UBICACIO: 'Canvi d’ubicació',
  SUBSTITUCIO: 'Substitució',
};

export const TIPUS_ABSENCIA_LABELS: Record<(typeof tipusAbsenciaValues)[number], string> = {
  VACANCES: 'Vacances',
  BAIXA: 'Baixa',
  ALTRES: 'Altres',
};

export const midaAnimalValues = ['PETIT', 'MITJA', 'GRAN'] as const;
export const MIDA_ANIMAL_LABELS: Record<(typeof midaAnimalValues)[number], string> = {
  PETIT: 'Petit',
  MITJA: 'Mitjà',
  GRAN: 'Gran',
};

/** Helper genérico para construir <option> en selects. */
export function optionsFrom<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return values.map((v) => ({ value: v, label: labels[v] }));
}
