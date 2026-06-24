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
    data: z.coerce.date().optional(),
    ivaPercent: z.coerce.number().min(0).max(100).default(10),
    aplicarTasa: z.boolean().default(true),
    // Elecció: recibo (sense Veri*Factu) o factura fiscal (amb Veri*Factu).
    tipusDocument: z.enum(['RECIBO', 'FACTURA', 'FACTURA_SIMPLIFICADA']).default('RECIBO'),
    descripcioOperacio: optStr,
    nifDestinatari: optStr,
    nomDestinatari: optStr,
    linies: z.array(LiniaInputSchema).min(1, 'Cal almenys una línia'),
  })
  .superRefine((data, ctx) => {
    // Factura completa (F1) requereix identificar el destinatari.
    if (data.tipusDocument === 'FACTURA' && !data.nifDestinatari) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nifDestinatari'],
        message: 'La factura completa (F1) requereix el NIF del destinatari',
      });
    }
  });

export const CobramentCreateSchema = z.object({
  metode: z.enum(metodeCobramentValues),
  import: z.coerce.number().positive('L’import ha de ser positiu'),
  data: z.coerce.date().optional(),
  // DEVOLUCIO = reemborsament (p. ex. reserva cancel·lada): es desa com a import
  // negatiu i resta de l'ingrés.
  tipus: z.enum(['COBRAMENT', 'DEVOLUCIO']).default('COBRAMENT'),
});

// Edició de les línies d'un rebut ja creat (NO d'una factura fiscal Veri*Factu).
// En desar es recalculen base/IVA/total conservant el % d'IVA i la tassa actuals.
export const FacturaEditSchema = z.object({
  linies: z.array(LiniaInputSchema).min(1, 'Cal almenys una línia'),
});

// Edició d'un cobrament concret (corregir mètode/import/data). El signe es
// conserva al servei: una devolució (import negatiu) segueix sent devolució.
export const CobramentEditSchema = z
  .object({
    metode: z.enum(metodeCobramentValues).optional(),
    import: z.coerce.number().positive('L’import ha de ser positiu').optional(),
    data: z.coerce.date().optional(),
  })
  .refine((d) => d.metode !== undefined || d.import !== undefined || d.data !== undefined, {
    message: 'Res a modificar',
  });

// Pagament a compte de l'estada (sense factura encara): import + mètode + concepte.
export const PagamentEstadaSchema = z.object({
  import: z.coerce.number().positive('L’import ha de ser positiu'),
  metode: z.enum(metodeCobramentValues),
  concepte: z.enum(concepteLiniaValues).default('ALLOTJAMENT'),
  descripcio: optStr,
  data: z.coerce.date().optional(),
});

// Crear una factura/rebut a partir de pagaments ja registrats de l'estada.
export const FacturaSeleccioSchema = z.object({
  pagamentIds: z.array(z.string().min(1)).min(1, 'Selecciona almenys un pagament'),
  tipusDocument: z.enum(['RECIBO', 'FACTURA', 'FACTURA_SIMPLIFICADA']).default('RECIBO'),
});

export type FacturaCreateInput = z.input<typeof FacturaCreateSchema>;
export type LiniaInput = z.input<typeof LiniaInputSchema>;

// Dipòsit/fiança de garantia (els "altres"): no és ingrés fins que es retén.
// destinacio: CUSTODIA = fiança retornable (no és ingrés); INGRES = càrrec que
// compta com a ingrés ja (p. ex. "finança mascota"), però retornable després.
export const DipositCreateSchema = z.object({
  import: z.coerce.number().positive('L’import ha de ser positiu'),
  data: z.coerce.date().optional(),
  metode: z.enum(metodeCobramentValues),
  notes: optStr,
  destinacio: z.enum(['CUSTODIA', 'INGRES']).default('CUSTODIA'),
});

export const DipositResolSchema = z.object({
  estat: z.enum(['TORNAT', 'RETINGUT', 'EN_CUSTODIA']),
  motiu: optStr,
});

// Edició d'un dipòsit en custòdia (corregir import/mètode/notes, sense resoldre'l).
export const DipositEditSchema = z.object({
  import: z.coerce.number().positive('L’import ha de ser positiu').optional(),
  metode: z.enum(metodeCobramentValues).optional(),
  notes: optStr,
  data: z.coerce.date().optional(),
});
