/**
 * Validación de la ficha de huésped (CRM, Fase 2) por separado del registro.
 */
import { z } from 'zod';
import { SexeEnum, TipusDocumentEnum, SentitAnotacioEnum } from './enums';

const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);
const optDate = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.date().optional(),
);
const optEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().email('Correu no vàlid').optional(),
);

export const HuespedCreateSchema = z.object({
  nom: z.string().trim().min(1, 'El nom és obligatori'),
  cognom1: z.string().trim().min(1, 'El primer cognom és obligatori'),
  cognom2: optStr,
  sexe: SexeEnum.optional(),
  dataNaixement: optDate,
  nacionalitat: optStr,
  tipusDocument: TipusDocumentEnum.optional(),
  numDocument: optStr,
  numSuport: optStr,
  dataExpedicio: optDate,
  dataCaducitat: optDate,
  email: optEmail,
  telefon: optStr,
  adreca: optStr,
  pais: optStr,
  provincia: optStr,
  municipi: optStr,
  localitat: optStr,
  codiPostal: optStr,
});

export const HuespedUpdateSchema = HuespedCreateSchema.partial();

export const AnotacioCreateSchema = z.object({
  sentit: SentitAnotacioEnum,
  tipus: optStr,
  descripcio: z
    .string()
    .trim()
    .min(5, 'Descriu el fet de manera objectiva i verificable'),
  estanciaId: optStr,
  privada: z.boolean().default(true),
  noAcollir: z.boolean().default(false),
});

// Edició d'una nota: tots els camps opcionals i SENSE defaults (un camp absent
// vol dir "no el toquis", no "posa'l al valor per defecte").
export const AnotacioUpdateSchema = z.object({
  sentit: SentitAnotacioEnum.optional(),
  tipus: optStr,
  descripcio: z.string().trim().min(5, 'Descriu el fet de manera objectiva i verificable').optional(),
  noAcollir: z.boolean().optional(),
});

export type HuespedCreateInput = z.input<typeof HuespedCreateSchema>;
export type HuespedUpdateInput = z.input<typeof HuespedUpdateSchema>;
