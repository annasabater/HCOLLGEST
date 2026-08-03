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
  irpfPercent: z.coerce.number().default(0),
  irpf: z.coerce.number().default(0),
  total: z.coerce.number().default(0),
});

/** Fila del "Libro de gastos" (format gestoria): base per columna + IVA per tipus. */
export const LibroGastoRowSchema = z.object({
  data: z.string().trim().default(''),
  nif: z.string().trim().default(''),
  proveidor: z.string().trim().default(''),
  numFactura: z.string().trim().default(''),
  bases: z.record(z.coerce.number()).default({}),
  iva5: z.coerce.number().default(0),
  iva10: z.coerce.number().default(0),
  iva21: z.coerce.number().default(0),
  total: z.coerce.number().default(0),
});

/** Estat editat del Libro de gastos: files + columnes tretes + amplades. */
export const LibroGastosSchema = z.object({
  rows: z.array(LibroGastoRowSchema).default([]),
  removedCols: z.array(z.string()).default([]),
  widths: z.record(z.coerce.number()).default({}),
});

export const LlibreIvaSaveSchema = z.object({
  etiqueta: z.string().trim().min(1),
  files: z.array(FilaIvaSchema),
  gastos: z.array(FilaGastoSchema).optional(),
  libroGastos: LibroGastosSchema.optional(),
});

export type LibroGastosInput = z.infer<typeof LibroGastosSchema>;

export type FilaIvaInput = z.infer<typeof FilaIvaSchema>;
export type FilaGastoInput = z.infer<typeof FilaGastoSchema>;
