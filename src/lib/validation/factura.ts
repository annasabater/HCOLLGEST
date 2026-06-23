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
