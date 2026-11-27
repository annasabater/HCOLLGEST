import { z } from 'zod';
import { ACCIONS_RECORDATORI, TIPUS_RECORDATORI, UNITATS_REPETICIO } from '../recordatoris';

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no vàlida');

export const RecordatoriSchema = z
  .object({
    titol: z.string().trim().min(1, 'Posa què t’he de recordar').max(200),
    notes: z.string().trim().max(2000).nullish(),
    tipus: z.enum(TIPUS_RECORDATORI).default('ALTRES'),
    data: dia,
    /** «HH:MM»; buit = al resum del matí. */
    hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora no vàlida').nullish(),
    repeticioCada: z.number().int().min(1).max(120).nullish(),
    repeticioUnitat: z.enum(UNITATS_REPETICIO).nullish(),
    diesAbans: z.array(z.number().int().min(0).max(365)).max(8).default([7]),
    whatsapp: z.boolean().default(true),
    calendari: z.boolean().default(true),
    fix: z.boolean().default(false),
    /** Estada a la qual va lligat (null = recordatori general). */
    estanciaId: z.string().min(1).nullish(),
    /** Què proposarà el tauler aquell dia (només si va lligat a una estada). */
    accio: z.enum(ACCIONS_RECORDATORI).nullish(),
    /** «M'ha de pagar»: quant (opcional). */
    import: z.coerce.number().min(0, 'L’import no pot ser negatiu').max(99_999_999).nullish(),
  })
  .refine((v) => !v.repeticioCada === !v.repeticioUnitat, {
    message: 'Indica cada quant es repeteix (número i mesos/anys)',
    path: ['repeticioCada'],
  })
  .refine((v) => !v.accio || !!v.estanciaId, {
    message: 'Tria l’estada',
    path: ['estanciaId'],
  });
export type RecordatoriInput = z.infer<typeof RecordatoriSchema>;

export const RecordatoriAccioSchema = z.discriminatedUnion('accio', [
  z.object({ accio: z.literal('FET') }),
  z.object({ accio: z.literal('AJORNA'), dies: z.number().int().min(1).max(365) }),
  z.object({ accio: z.literal('DESFES') }),
  // «M'ha de dir si allarga»: la resposta (s'apunta a la pròrroga i el recordatori queda fet).
  z.object({ accio: z.literal('RESPOSTA'), resposta: z.enum(['SI', 'NO']) }),
  // Canvia el dia (des de «Estades en curs»: «Ho dirà el dia…»).
  z.object({ accio: z.literal('MOU'), data: dia }),
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
