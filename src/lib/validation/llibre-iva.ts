/** Validació del llibre d'IVA trimestral desat (instantània editable). */
import { z } from 'zod';

export const FilaIvaSchema = z.object({
  data: z.string().trim().default(''), // display "dd/mm/aaaa"
  numeroSimple: z.string().trim().default(''),
  numeroFiscal: z.string().trim().default(''),
  client: z.string().trim().default(''),
  periode: z.string().trim().default(''),
  base: z.coerce.number().default(0),
  ivaPercent: z.coerce.number().default(0),
  iva: z.coerce.number().default(0),
  total: z.coerce.number().default(0),
});

/** Fila de despesa/factura rebuda (soportada): proveïdor, NIF, nº factura + IVA. */
export const FilaGastoSchema = z.object({
  data: z.string().trim().default(''), // display "dd/mm/aaaa"
  nif: z.string().trim().default(''),
  proveidor: z.string().trim().default(''),
  numFactura: z.string().trim().default(''),
  base: z.coerce.number().default(0),
  ivaPercent: z.coerce.number().default(0),
  iva: z.coerce.number().default(0),
  total: z.coerce.number().default(0),
});

export const LlibreIvaSaveSchema = z.object({
  etiqueta: z.string().trim().min(1),
  files: z.array(FilaIvaSchema),
  gastos: z.array(FilaGastoSchema).optional(),
});

export type FilaIvaInput = z.infer<typeof FilaIvaSchema>;
export type FilaGastoInput = z.infer<typeof FilaGastoSchema>;
