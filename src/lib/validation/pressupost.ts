import { z } from 'zod';

const optStr = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().trim().optional());
// Absent = no es toca; "" o null = buidar; valor = desar.
const nullStr = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && !v.trim() ? null : v), z.string().trim().max(max).nullable().optional());
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no vàlida');
const nullDate = z.preprocess((v) => (v === '' ? null : v), isoDate.nullable().optional());

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
  // Per enviar-lo per WhatsApp. Absent = no es toca (l'editor d'impressió no els envia).
  telefon: nullStr(40),
  entrada: nullDate,
  sortida: nullDate,
  linies: z.array(LiniaPressupostSchema).default([]),
}).refine((p) => !p.entrada || !p.sortida || p.sortida > p.entrada, {
  message: 'La sortida ha de ser posterior a l’entrada',
  path: ['sortida'],
});

// Pressupost nou creat des de la calculadora de preus (POST /api/pressupostos).
export const PressupostCalculSchema = z.object({
  linies: z.array(LiniaPressupostSchema).min(1),
  ivaPercent: z.coerce.number().min(0),
  notes: z.string().trim().default(''),
  // Entrada del primer tram i sortida de l'últim.
  entrada: isoDate.optional(),
  sortida: isoDate.optional(),
});

export type PressupostInput = z.infer<typeof PressupostSaveSchema>;
