import { z } from 'zod';

/** Camp de text opcional: cadenes buides → undefined, amb límit de longitud. */
const optStr = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(max).optional(),
  );

/**
 * Valoració enviada per l'hoste des de hostalcoll.com/benvinguda.html.
 * Endpoint públic (sense auth): validem amb límits per evitar abusos.
 */
export const ValoracioCreateSchema = z.object({
  puntuacio: z.coerce.number().int().min(1).max(5),
  comentari: optStr(1000),
  nom: optStr(80),
  habitacio: optStr(40),
  idioma: z.enum(['ca', 'es', 'en', 'fr']).optional(),
  estanciaId: optStr(40),
});

export type ValoracioCreateInput = z.infer<typeof ValoracioCreateSchema>;
