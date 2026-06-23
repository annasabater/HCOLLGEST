import { z } from 'zod';

export const gravetatAvisValues = ['BAIXA', 'MITJA', 'ALTA'] as const;
export const GRAVETAT_AVIS_LABELS: Record<(typeof gravetatAvisValues)[number], string> = {
  BAIXA: 'Baixa',
  MITJA: 'Mitjana',
  ALTA: 'Alta',
};

const optStr = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const AvisCreateSchema = z.object({
  nom: z.string().trim().min(1, 'El nom és obligatori').max(120),
  telefon: z.preprocess(optStr, z.string().trim().max(40).optional()),
  email: z.preprocess(optStr, z.string().trim().email('Email no vàlid').max(120).optional()),
  motiu: z.string().trim().min(1, 'Indica el motiu').max(500),
  gravetat: z.enum(gravetatAvisValues).default('MITJA'),
  notes: z.preprocess(optStr, z.string().trim().max(2000).optional()),
});
export type AvisCreateInput = z.infer<typeof AvisCreateSchema>;

export const AvisUpdateSchema = AvisCreateSchema.partial().extend({
  actiu: z.boolean().optional(),
});

/** Normalitza un telèfon per comparar (només dígits). */
export function normTelefon(t: string | null | undefined): string {
  return (t ?? '').replace(/\D/g, '');
}
