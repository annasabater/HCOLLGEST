import { z } from 'zod';
import { COMPTES_TRESORERIA, TIPUS_MOVIMENT_TRESORERIA } from '../tresoreria';

export const MovimentTresoreriaSchema = z
  .object({
    compte: z.enum(COMPTES_TRESORERIA),
    tipus: z.enum(TIPUS_MOVIMENT_TRESORERIA),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no vàlida'),
    import: z.number().finite().max(10_000_000),
    concepte: z.string().trim().max(200).default(''),
    referencia: z.string().trim().max(100).nullish(),
  })
  .refine((v) => v.tipus === 'SALDO_INICIAL' || v.import > 0, {
    message: 'L’import ha de ser més gran que 0',
    path: ['import'],
  })
  .refine((v) => v.tipus === 'SALDO_INICIAL' || v.tipus === 'TRASPAS' || v.concepte.length > 0, {
    message: 'Escriu el concepte',
    path: ['concepte'],
  });
export type MovimentTresoreriaInput = z.infer<typeof MovimentTresoreriaSchema>;
