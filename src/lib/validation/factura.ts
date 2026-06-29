/** Validación de facturación (Fase 3). */
import { z } from 'zod';
import { concepteLiniaValues, metodeCobramentValues } from './enums';

export const LiniaInputSchema = z.object({
  concepte: z.enum(concepteLiniaValues),
  descripcio: z.string().trim().min(1, 'Cal una descripció'),
  import: z.coerce.number(),
});

const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);

export const FacturaCreateSchema = z
  .object({
    estanciaId: z.string().min(1),
    numero: optStr,
    data: z.coerce.date().optional(),
    ivaPercent: z.coerce.number().min(0).max(100).default(10),
    aplicarTasa: z.boolean().default(true),
    tipusDocument: z.enum(['RECIBO', 'FACTURA', 'FACTURA_SIMPLIFICADA']).default('RECIBO'),
    descripcioOperacio: optStr,
    nifDestinatari: optStr,
    nomDestinatari: optStr,
    linies: z.array(LiniaInputSchema).min(1, 'Cal almenys una línia'),
  })
  .superRefine((data, ctx) => {
    if (data.tipusDocument === 'FACTURA' && !data.nifDestinatari) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nifDestinatari'],
        message: 'La factura fiscal requereix el NIF del destinatari',
      });
    }
  });

export const CobramentCreateSchema = z.object({
  metode: z.enum(metodeCobramentValues),
  import: z.coerce.number().positive("L'import ha de ser positiu"),
  data: z.coerce.date().optional(),
  tipus: z.enum(['COBRAMENT', 'DEVOLUCIO']).default('COBRAMENT'),
});

export const FacturaEditSchema = z.object({
  linies: z.array(LiniaInputSchema).min(1, 'Cal almenys una línia'),
});

export const CobramentEditSchema = z
  .object({
    metode: z.enum(metodeCobramentValues).optional(),
    import: z.coerce.number().positive("L'import ha de ser positiu").optional(),
    data: z.coerce.date().optional(),
  })
  .refine((d) => d.metode !== undefined || d.import !== undefined || d.data !== undefined, {
    message: 'Res a modificar',
  });

export const PagamentEstadaSchema = z.object({
  import: z.coerce.number().positive("L'import ha de ser positiu"),
  metode: z.enum(metodeCobramentValues),
  concepte: z.enum(concepteLiniaValues).default('ALLOTJAMENT'),
  descripcio: optStr,
  observacions: optStr,
  data: z.coerce.date().optional(),
  facturaId: z.string().optional(),
});

export const FacturaSeleccioSchema = z.object({
  pagamentIds: z.array(z.string().min(1)).default([]),
  fiancaIds: z.array(z.string().min(1)).default([]),
  tipusDocument: z.enum(['RECIBO', 'FACTURA', 'FACTURA_SIMPLIFICADA']).default('RECIBO'),
}).refine(
  (d) => d.pagamentIds.length + d.fiancaIds.length > 0,
  { message: 'Selecciona almenys un pagament o fiança' },
);

export type FacturaCreateInput = z.input<typeof FacturaCreateSchema>;
export type LiniaInput = z.input<typeof LiniaInputSchema>;

export const DipositCreateSchema = z.object({
  import: z.coerce.number().positive("L'import ha de ser positiu"),
  data: z.coerce.date().optional(),
  metode: z.enum(metodeCobramentValues),
  notes: optStr,
  observacions: optStr,
  destinacio: z.enum(['CUSTODIA', 'INGRES']).default('CUSTODIA'),
});

export const DipositResolSchema = z.object({
  estat: z.enum(['TORNAT', 'RETINGUT', 'EN_CUSTODIA']),
  motiu: optStr,
});

export const DipositEditSchema = z.object({
  import: z.coerce.number().positive("L'import ha de ser positiu").optional(),
  metode: z.enum(metodeCobramentValues).optional(),
  notes: optStr,
  data: z.coerce.date().optional(),
  facturaId: z.string().min(1).nullable().optional(),
});
