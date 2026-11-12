import { z } from 'zod';
import { TIPUS_RECORDATORI, UNITATS_REPETICIO } from '../recordatoris';

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no vàlida');

export const RecordatoriSchema = z
  .object({
    titol: z.string().trim().min(1, 'Posa què t’he de recordar').max(200),
    notes: z.string().trim().max(2000).nullish(),
    tipus: z.enum(TIPUS_RECORDATORI).default('ALTRES'),
    data: dia,
    repeticioCada: z.number().int().min(1).max(120).nullish(),
    repeticioUnitat: z.enum(UNITATS_REPETICIO).nullish(),
    diesAbans: z.array(z.number().int().min(0).max(365)).max(8).default([7]),
    whatsapp: z.boolean().default(true),
  })
  .refine((v) => !v.repeticioCada === !v.repeticioUnitat, {
    message: 'Indica cada quant es repeteix (número i mesos/anys)',
    path: ['repeticioCada'],
  });
export type RecordatoriInput = z.infer<typeof RecordatoriSchema>;

export const RecordatoriAccioSchema = z.discriminatedUnion('accio', [
  z.object({ accio: z.literal('FET') }),
  z.object({ accio: z.literal('AJORNA'), dies: z.number().int().min(1).max(365) }),
  z.object({ accio: z.literal('DESFES') }),
]);

export const WhatsappConfigSchema = z.object({
  destinataris: z
    .array(
      z.object({
        telefon: z.string().trim().min(1, 'Falta el número').max(30),
        /** Buit = mantenir la clau desada d'aquest número. */
        apikey: z.string().trim().max(100).nullish(),
        actiu: z.boolean(),
      }),
    )
    .max(5),
});

export const WhatsappProvaSchema = z.object({ telefon: z.string().trim().min(1).max(30) });
