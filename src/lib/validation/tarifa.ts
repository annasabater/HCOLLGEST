import { z } from 'zod';

const optStr = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optDate = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date().optional());
const optNum = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().positive().optional(),
);

export const TEMPORADES = ['ALTA', 'MITJA', 'BAIXA'] as const;
export type Temporada = (typeof TEMPORADES)[number];

export const TEMPORADA_LABELS: Record<Temporada, string> = {
  ALTA: 'Temporada alta',
  MITJA: 'Temporada mitja',
  BAIXA: 'Temporada baixa',
};

export const TarifaCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Cal un nom'),
  temporada: z.preprocess(optStr, z.enum(TEMPORADES).optional()),
  preuNit: z.coerce.number().positive('El preu/nit ha de ser > 0'),
  preuMensual: optNum,
  tipusHabitacio: z.preprocess(optStr, z.string().optional()),
  habitacioId: z.preprocess(optStr, z.string().optional()),
  dataInici: optDate,
  dataFi: optDate,
});
export type TarifaCreateInput = z.input<typeof TarifaCreateSchema>;

export const TarifaUpdateSchema = TarifaCreateSchema.partial().extend({
  actiu: z.boolean().optional(),
});
