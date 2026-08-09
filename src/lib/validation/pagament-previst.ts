import { z } from 'zod';

export const PagamentPrevistCreateSchema = z.object({
  import: z.coerce.number().positive('L’import ha de ser més gran que 0'),
  dataPrevista: z.string().trim().min(1, 'Cal la data prevista'), // ISO yyyy-mm-dd
  concepte: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().trim().optional()),
});

export const PagamentPrevistUpdateSchema = z.object({
  pagat: z.boolean(),
});
