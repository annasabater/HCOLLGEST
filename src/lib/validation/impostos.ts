/** Validació de les autoliquidacions presentades (/impostos). */
import { z } from 'zod';

export const ModelFiscalSchema = z.enum(['303', '130', '115', '390', '180']);

export const DeclaracioSchema = z
  .object({
    model: ModelFiscalSchema,
    any: z.coerce.number().int().min(2020).max(2100),
    periode: z.coerce.number().int().min(0).max(4),
    // Caselles tal com es van presentar: { "01": 12880.94, ... }
    caselles: z.record(z.string().regex(/^\d{1,3}$/), z.coerce.number()),
    justificant: z.string().trim().max(40).optional().nullable(),
    presentadaEl: z.coerce.date().optional(),
  })
  .refine((d) => (d.model === '390' || d.model === '180' ? d.periode === 0 : d.periode >= 1), {
    message: 'El 390 i el 180 són anuals (període 0); el 303, 130 i 115 van per trimestre (1–4)',
    path: ['periode'],
  });

export const ConfigImpostosSchema = z.object({
  referenciaCadastral: z.string().trim().toUpperCase().max(20),
});
