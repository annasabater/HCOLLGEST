import { z } from 'zod';

const optStr = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(max).optional(),
  );

/** Alta manual d'una ressenya (copiada de Google mentre no hi ha sincronització). */
export const RessenyaCreateSchema = z.object({
  autor: z.string().trim().min(1, 'Cal el nom de qui l’ha escrita').max(80),
  puntuacio: z.coerce.number().int().min(1).max(5),
  text: optStr(4000),
  idioma: optStr(5),
  dataRessenya: z.coerce
    .date()
    .refine((d) => d.getTime() <= Date.now() + 24 * 3600 * 1000, 'La data no pot ser futura'),
  resposta: optStr(4000),
});
export type RessenyaCreateInput = z.infer<typeof RessenyaCreateSchema>;

/** Moderació: estat, destacada o moure-la. El text no es pot modificar. */
export const RessenyaPatchSchema = z.union([
  z.object({ estat: z.enum(['PENDENT', 'PUBLICADA', 'AMAGADA']) }),
  z.object({ destacada: z.boolean() }),
  z.object({ moure: z.enum(['AMUNT', 'AVALL']) }),
]);
export type RessenyaPatchInput = z.infer<typeof RessenyaPatchSchema>;

/** Resum real de la fitxa de Google que la web mostra sempre. */
export const GoogleResumSchema = z.object({
  googleNota: z.preprocess(
    (v) => (v === '' || v === null ? null : typeof v === 'string' ? Number(v.replace(',', '.')) : v),
    z.number().min(1).max(5).nullable(),
  ),
  googleTotal: z.preprocess(
    (v) => (v === '' || v === null ? null : v),
    z.coerce.number().int().min(0).nullable(),
  ),
  googleUrl: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().url('Enllaç no vàlid').max(500).nullable(),
  ),
});
export type GoogleResumInput = z.infer<typeof GoogleResumSchema>;
