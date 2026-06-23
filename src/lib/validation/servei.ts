/**
 * Validació de serveis/manteniments recurrents (assegurances, extintors, LOPD…).
 * La `properaData` venç → es genera una despesa i s'avança segons la freqüència.
 */
import { z } from 'zod';
import { metodeCobramentValues } from './enums';

export const frequenciaServeiValues = [
  'MENSUAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
  'BIENNAL',
  'PUNTUAL',
] as const;

export type FrequenciaServeiValue = (typeof frequenciaServeiValues)[number];

export const FREQUENCIA_SERVEI_LABELS: Record<FrequenciaServeiValue, string> = {
  MENSUAL: 'Mensual',
  TRIMESTRAL: 'Trimestral (cada 3 mesos)',
  SEMESTRAL: 'Semestral (cada 6 mesos)',
  ANUAL: 'Anual (1 cop a l’any)',
  BIENNAL: 'Cada 2 anys',
  PUNTUAL: 'Puntual (un sol cop)',
};

/** Mesos entre dues ocurrències, o null si és puntual (sense recurrència). */
export const FREQUENCIA_MESOS: Record<FrequenciaServeiValue, number | null> = {
  MENSUAL: 1,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
  BIENNAL: 24,
  PUNTUAL: null,
};

const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);
const optDate = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.date().optional(),
);
const optNum = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().min(0, 'L’import no pot ser negatiu').optional(),
);

export const ServeiCreateSchema = z.object({
  activitat: z.string().trim().min(1, 'Cal indicar l’activitat/servei'),
  proveidorId: optStr,
  categoriaId: optStr,
  frequencia: z.enum(frequenciaServeiValues).default('ANUAL'),
  importPrevist: optNum,
  metodePagament: z.enum(metodeCobramentValues).default('TRANSFERENCIA'),
  properaData: z.coerce.date(),
  vigenciaInici: optDate,
  vigenciaFi: optDate,
  generaDespesa: z.coerce.boolean().default(true),
  observacions: optStr,
  actiu: z.coerce.boolean().default(true),
});

export const ServeiUpdateSchema = ServeiCreateSchema.partial();

export type ServeiCreateInput = z.input<typeof ServeiCreateSchema>;
