/** Validación de gastos y proveedores (Fase 4). */
import { z } from 'zod';
import { metodeCobramentValues } from './enums';

const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);

export const GastoCreateSchema = z.object({
  data: z.coerce.date(),
  import: z.coerce.number().positive('L’import ha de ser positiu'),
  categoriaId: z.string().min(1, 'Cal una categoria'),
  proveidorId: optStr,
  habitacioId: optStr,
  animalId: optStr,
  descripcio: z.string().trim().min(1, 'Cal una descripció'),
  metodePagament: z.enum(metodeCobramentValues),
  adjuntPath: optStr,
  // Fiança/dipòsit pagat (recuperable): no compta al balanç fins que es desmarqui.
  esFianca: z.coerce.boolean().optional(),
});

export const GastoUpdateSchema = GastoCreateSchema.partial();

export const ProveidorCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Cal un nom'),
  cif: optStr,
  contacte: optStr,
  telefon: optStr,
  email: optStr,
  adreca: optStr,
  web: optStr,
  activitat: optStr,
  notes: optStr,
});

export const ProveidorUpdateSchema = ProveidorCreateSchema.partial();

export type GastoCreateInput = z.input<typeof GastoCreateSchema>;
