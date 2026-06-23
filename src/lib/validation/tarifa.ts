import { z } from 'zod';

const optStr = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optDate = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date().optional());

export const TarifaCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Cal un nom'),
  preuNit: z.coerce.number().positive('El preu ha de ser > 0'),
  tipusHabitacio: z.preprocess(optStr, z.string().optional()),
  habitacioId: z.preprocess(optStr, z.string().optional()),
  dataInici: optDate,
  dataFi: optDate,
});
export type TarifaCreateInput = z.input<typeof TarifaCreateSchema>;

export const TarifaUpdateSchema = TarifaCreateSchema.partial().extend({
  actiu: z.boolean().optional(),
});
