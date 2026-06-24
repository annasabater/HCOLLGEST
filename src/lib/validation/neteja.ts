/** Validación de tareas de limpieza (Fase 1.5). */
import { z } from 'zod';
import { tipusNetejaValues, estatTascaValues } from './enums';

const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);

export const TascaNetejaCreateSchema = z.object({
  data: z.coerce.date(),
  habitacioId: z.string().min(1, 'Cal una habitació'),
  tipus: z.enum(tipusNetejaValues),
  assignadaA: optStr,
  vinculadaSortidaId: optStr,
  notes: optStr,
});

export const TascaNetejaUpdateSchema = z.object({
  data: z.coerce.date().optional(),
  tipus: z.enum(tipusNetejaValues).optional(),
  estat: z.enum(estatTascaValues).optional(),
  assignadaA: z.string().nullable().optional(),
  notes: optStr,
});

// Full de neteja d'un dia per a una persona: substitueix d'un cop totes les
// habitacions que aquella persona neteja aquell dia. Les habitacions no
// incloses deixen d'estar-li assignades.
export const TascaNetejaDiaSchema = z.object({
  data: z.coerce.date(),
  assignadaA: z.string().min(1, 'Cal una persona'),
  items: z.array(
    z.object({
      habitacioId: z.string().min(1),
      tipus: z.enum(tipusNetejaValues),
      notes: optStr,
    }),
  ),
});

export type TascaNetejaCreateInput = z.input<typeof TascaNetejaCreateSchema>;
export type TascaNetejaDiaInput = z.input<typeof TascaNetejaDiaSchema>;
