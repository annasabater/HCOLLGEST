import { z } from 'zod';

const optStr = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().trim().optional());

export const LiniaPressupostSchema = z.object({
  descripcio: z.string().trim().default(''),
  import: z.coerce.number().default(0),
});

export const PressupostSaveSchema = z.object({
  numero: z.string().trim().min(1, 'Cal el número'),
  data: optStr, // ISO "yyyy-mm-dd"
  validesa: optStr,
  idioma: z.enum(['ca', 'es', 'fr', 'en']).optional(),
  // Enllaç a una estada: absent = no es toca; null o "" = desassignar; id = assignar.
  estanciaId: z.union([z.string(), z.null()]).optional(),
  clientNom: optStr,
  clientNif: optStr,
  clientAdreca: optStr,
  clientLocalitat: optStr,
  compte: optStr,
  notes: optStr,
  ivaPercent: z.coerce.number().min(0).default(21),
  // Amaga Base i IVA al document imprès. Absent = no es toca.
  ocultaIva: z.boolean().optional(),
  linies: z.array(LiniaPressupostSchema).default([]),
});

// Pressupost nou creat des de la calculadora de preus (POST /api/pressupostos).
export const PressupostCalculSchema = z.object({
  linies: z.array(LiniaPressupostSchema).min(1),
  ivaPercent: z.coerce.number().min(0),
  notes: z.string().trim().default(''),
});

export type PressupostInput = z.infer<typeof PressupostSaveSchema>;
