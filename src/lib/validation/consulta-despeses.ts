import { z } from 'zod';

export const FiltreDespesaSchema = z.discriminatedUnion('tipus', [
  z.object({ tipus: z.literal('PROVEIDOR'), id: z.string().min(1).max(64), nom: z.string().trim().min(1).max(200) }),
  z.object({ tipus: z.literal('CATEGORIA'), nom: z.string().trim().min(1).max(100) }),
  z.object({ tipus: z.literal('TEXT'), text: z.string().trim().min(1).max(100) }),
]);

export const ConsultaDespesesSchema = z.object({
  nom: z.string().trim().min(1, 'Posa-li un nom').max(60),
  filtres: z.array(FiltreDespesaSchema).max(20),
  comparacio: z.enum(['CAP', 'ANTERIOR', 'ANY_PASSAT']).default('CAP'),
});
export type ConsultaDespesesInput = z.infer<typeof ConsultaDespesesSchema>;
