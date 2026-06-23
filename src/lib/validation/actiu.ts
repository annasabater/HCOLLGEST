/** Validación de activos, su historial y animales (Fase 5). */
import { z } from 'zod';
import { estatActiuValues, tipusHistorialActiuValues, midaAnimalValues } from './enums';

const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);
const optDate = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.date().optional(),
);

export const ActiuCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Cal un nom'),
  categoria: z.string().trim().min(1, 'Cal una categoria'),
  dataCompra: z.coerce.date(),
  cost: z.coerce.number().min(0),
  proveidorId: optStr,
  habitacioId: optStr,
  garantiaFins: optDate,
  ubicacio: optStr,
  numSerie: optStr,
  facturaPath: optStr,
  estat: z.enum(estatActiuValues).default('NOU'),
});

export const ActiuUpdateSchema = ActiuCreateSchema.partial();

export const ActiuHistorialCreateSchema = z.object({
  tipus: z.enum(tipusHistorialActiuValues),
  descripcio: z.string().trim().min(1, 'Cal una descripció'),
  data: z.coerce.date(),
  cost: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().min(0).optional(),
  ),
});

export const AnimalCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Cal un nom'),
  especie: z.string().trim().min(1, 'Cal l’espècie'),
  mida: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.enum(midaAnimalValues).optional()),
  dataNaixement: optDate,
  notes: optStr,
  huespedId: optStr,
});

export type ActiuCreateInput = z.input<typeof ActiuCreateSchema>;
