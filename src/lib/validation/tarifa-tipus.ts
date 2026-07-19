/** Validació de la matriu de tarifes per tipus d'habitació + temporada. */
import { z } from 'zod';

export const GRUP_TARIFA = ['INDIVIDUAL', 'DOBLE_1P', 'DOBLE'] as const;
export type GrupTarifa = (typeof GRUP_TARIFA)[number];

export const GRUP_TARIFA_LABELS: Record<GrupTarifa, string> = {
  INDIVIDUAL: 'Habitació Individual',
  DOBLE_1P: 'Habitació Doble (1 persona)',
  DOBLE: 'Habitació Doble',
};

// Preu opcional: '' o absent → null; si no, número no negatiu.
const preu = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : v),
  z.coerce.number().nonnegative('No pot ser negatiu').nullable(),
);

export const TarifaTipusRowSchema = z.object({
  id: z.string().optional(),
  grup: z.enum(GRUP_TARIFA),
  etiqueta: z.string().trim().min(1, 'Cal un nom de temporada'),
  ordre: z.coerce.number().int().default(0),
  mesos: z.array(z.coerce.number().int().min(1).max(12)).default([]),
  preuDia: preu,
  preuDia4: preu,
  preuSetmana: preu,
  preuDosSetmanes: preu,
  preuMes: preu,
  reserva: preu,
  nota: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().trim().nullable().optional()),
  actiu: z.boolean().optional(),
});

export const TarifaTipusBulkSchema = z.object({
  files: z.array(TarifaTipusRowSchema),
});

export type TarifaTipusRowInput = z.input<typeof TarifaTipusRowSchema>;
