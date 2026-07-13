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

// Camp de sobreescriptura (client/emissor a la factura): buit = neteja
// explícitament l'override (torna a calcular-se); absent = no es toca.
const overrideStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().nullable().optional(),
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
  linies: z.array(LiniaInputSchema).min(1, 'Cal almenys una línia').optional(),
  numero: z.string().min(1).optional(),
  data: z.coerce.date().optional(),
  estat: z.enum(['COBRADA', 'PENDENT']).optional(),
  fiancaInclosa: z.boolean().nullable().optional(),
  // Sobreescriptures manuals (impressió de la factura simple/fiscal). Buit = neteja.
  clientNom: overrideStr,
  clientNif: overrideStr,
  clientAdreca: overrideStr,
  clientLocalitat: overrideStr,
  emissorTitular: overrideStr,
  emissorNif: overrideStr,
  emissorAdreca: overrideStr,
  emissorLocalitat: overrideStr,
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

export const FinalitzarAnticipadaSchema = z
  .object({
    dataSortida: z.coerce.date(),
    retorn: z.boolean().default(false),
    retornImport: z.coerce.number().positive().optional(),
    retornMetode: z.enum(metodeCobramentValues).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.retorn && (!d.retornImport || d.retornImport <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['retornImport'],
        message: "Indica l'import a retornar",
      });
    }
  });

export const FacturaSeleccioSchema = z.object({
  pagamentIds: z.array(z.string().min(1)).default([]),
  fiancaIds: z.array(z.string().min(1)).default([]),
  tipusDocument: z.enum(['RECIBO', 'FACTURA', 'FACTURA_SIMPLIFICADA']).default('RECIBO'),
  numero: z.string().trim().min(1).optional(),
  descripcioAllotjament: z.string().trim().min(1).optional(),
  // Simplificada: si true, la fiança compta al total. Fiscal: sempre inclosa.
  ambFianca: z.boolean().optional(),
}).refine(
  (d) => d.pagamentIds.length + d.fiancaIds.length > 0,
  { message: 'Selecciona almenys un pagament o fiança' },
);

// Factura rectificativa (reducció): nova factura simplificada amb import NEGATIU
// que redueix una factura anterior (p. ex. per sortida anticipada amb devolució).
export const FacturaRectificativaSchema = z.object({
  facturaOriginalId: z.string().min(1),
  import: z.coerce.number().positive("Indica l'import de la reducció"),
  motiu: z.string().trim().min(1).optional(),
  numero: z.string().trim().min(1).optional(),
  data: z.coerce.date().optional(),
  // Cobraments negatius (devolucions) que aquesta rectificativa "cobreix": es
  // vinculen a la nova factura perquè deixin de sortir com "a compte sense factura".
  cobramentIds: z.array(z.string().min(1)).default([]),
});

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
