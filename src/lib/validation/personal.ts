/** Validación de personal: trabajadores, ausencias y nóminas (Fase 6). */
import { z } from 'zod';
import { tipusAbsenciaValues } from './enums';

const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);
const optNum = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().min(0).optional(),
);

export const TreballadorCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Cal un nom'),
  dni: optStr, // opcional
  carrec: z.string().trim().min(1, 'Cal el càrrec'),
  telefon: optStr,
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().email().optional(),
  ),
  dataContractacio: z.coerce.date().optional(),
  preuHora: optNum, // €/hora
  salari: optNum,
  costEmpresa: optNum,
});

export const TreballadorUpdateSchema = TreballadorCreateSchema.partial();

export const JornadaCreateSchema = z.object({
  data: z.coerce.date(),
  hores: z.coerce.number().positive('Les hores han de ser > 0').max(24),
  preuHora: optNum, // si no s'indica, s'agafa el del treballador
  notes: optStr,
});

export const AbsenciaCreateSchema = z.object({
  tipus: z.enum(tipusAbsenciaValues),
  dataInici: z.coerce.date(),
  dataFi: z.coerce.date(),
});

export const NominaCreateSchema = z.object({
  periode: z.string().trim().min(1, 'Cal el període (p.ex. 2026-06)'),
  base: z.coerce.number().min(0),
  extres: z.coerce.number().min(0).default(0),
  bonificacions: z.coerce.number().min(0).default(0),
});

export type TreballadorCreateInput = z.input<typeof TreballadorCreateSchema>;
