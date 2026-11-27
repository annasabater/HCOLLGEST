import { z } from 'zod';

export const PagamentPrevistCreateSchema = z.object({
  import: z.coerce.number().positive('L’import ha de ser més gran que 0'),
  dataPrevista: z.string().trim().min(1, 'Cal la data prevista'), // ISO yyyy-mm-dd
  concepte: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().trim().optional()),
});

// Marcar pagat / desfer, o editar import, data i concepte (tot opcional; almenys un camp).
export const PagamentPrevistUpdateSchema = z
  .object({
    pagat: z.boolean().optional(),
    import: z.coerce.number().positive('L’import ha de ser més gran que 0').optional(),
    dataPrevista: z.string().trim().min(1, 'Cal la data prevista').optional(), // ISO yyyy-mm-dd
    concepte: z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional()),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'No hi ha res per canviar');
