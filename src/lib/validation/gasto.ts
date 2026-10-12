/** Validación de gastos y proveedores (Fase 4). */
import { z } from 'zod';
import { metodeCobramentValues } from './enums';
import { LiniaIvaSchema } from '../gasto-iva';

const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);

// Import amb signe opcional ('' → undefined): la base d'un abonament és negativa.
const optNumSigne = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().optional(),
);

// Número opcional: '' → undefined (per als camps fiscals que poden quedar buits).
const optNum = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().nonnegative().optional(),
);

export const GastoCreateSchema = z.object({
  data: z.coerce.date(),
  // Negatiu = abonament / factura rectificativa del proveïdor (resta de la despesa).
  import: z.coerce.number().refine((n) => n !== 0, 'L’import no pot ser 0'),
  categoriaId: z.string().min(1, 'Cal una categoria'),
  proveidorId: optStr,
  habitacioId: optStr,
  animalId: optStr,
  descripcio: z.string().trim().min(1, 'Cal una descripció'),
  numFactura: optStr, // nº de factura del proveïdor (per al llibre d'IVA)
  // Desglossament fiscal (llibre d'IVA soportat): si es donen, s'usen tal qual;
  // si no, la base es dedueix del total al 21% (veure getGastosSoportats).
  baseImposable: optNumSigne,
  ivaPercent: optNum,
  irpfPercent: optNum,
  // Diversos tipus d'IVA a la mateixa factura (2+ línies). Si es dona, mana
  // sobre baseImposable/ivaPercent. [] o null en editar → torna a una sola base.
  desglossamentIva: z.array(LiniaIvaSchema).max(8).nullable().optional(),
  metodePagament: z.enum(metodeCobramentValues),
  adjuntPath: optStr,
  // Proveïdor detectat per l'escàner (OCR): si no hi ha proveidorId, es busca
  // o es crea un Proveidor a partir d'aquestes dades (per tenir NIF al trimestre).
  proveidorNom: optStr,
  proveidorNif: optStr,
  // Dades de contacte del proveïdor nou (editables abans de desar).
  proveidorActivitat: optStr,
  proveidorTelefon: optStr,
  proveidorEmail: optStr,
  proveidorAdreca: optStr,
  proveidorWeb: optStr,
  // Fiança/dipòsit pagat (recuperable): no compta al balanç fins que es desmarqui.
  esFianca: z.coerce.boolean().optional(),
  // Desa encara que sembli una factura ja pujada (l'usuari ha vist l'avís).
  ignoraDuplicat: z.boolean().optional(),
});

export const GastoUpdateSchema = GastoCreateSchema.partial();

export const ProveidorCreateSchema = z.object({
  nom: z.string().trim().min(1, 'Cal un nom'),
  cif: optStr,
  contacte: optStr,
  telefon: optStr,
  email: optStr,
  adreca: optStr,
  web: optStr,
  activitat: optStr,
  notes: optStr,
});

export const ProveidorUpdateSchema = ProveidorCreateSchema.partial();

export type GastoCreateInput = z.input<typeof GastoCreateSchema>;
