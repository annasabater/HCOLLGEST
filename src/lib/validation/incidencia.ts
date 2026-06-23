import { z } from 'zod';

export const estatIncidenciaValues = ['OBERTA', 'EN_CURS', 'RESOLTA'] as const;
export const prioritatIncidenciaValues = ['BAIXA', 'MITJA', 'ALTA'] as const;

export const ESTAT_INCIDENCIA_LABELS: Record<(typeof estatIncidenciaValues)[number], string> = {
  OBERTA: 'Oberta',
  EN_CURS: 'En curs',
  RESOLTA: 'Resolta',
};
export const PRIORITAT_INCIDENCIA_LABELS: Record<(typeof prioritatIncidenciaValues)[number], string> = {
  BAIXA: 'Baixa',
  MITJA: 'Mitjana',
  ALTA: 'Alta',
};

const optStr = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optNum = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().min(0).optional());

export const IncidenciaCreateSchema = z.object({
  titol: z.string().trim().min(1, 'Cal un títol'),
  descripcio: z.preprocess(optStr, z.string().optional()),
  habitacioId: z.preprocess(optStr, z.string().optional()),
  prioritat: z.enum(prioritatIncidenciaValues).default('MITJA'),
  cost: optNum,
  notes: z.preprocess(optStr, z.string().optional()),
});

export const IncidenciaUpdateSchema = IncidenciaCreateSchema.partial().extend({
  estat: z.enum(estatIncidenciaValues).optional(),
});
