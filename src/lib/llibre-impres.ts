/**
 * Llibre registre «per imprimir»: cada contracte (estada nova o ampliació) neix
 * sense `llibreImpresEl` i surt de color taronja fins que es marca com a imprès.
 * Els esborranys (dades incompletes) i les cancel·lades no compten.
 */
import type { Prisma } from '@prisma/client';

export interface EstadaLlibre {
  llibreImpresEl: Date | string | null;
  esBorrany: boolean;
  estat: string;
  deletedAt?: Date | string | null;
}

/** Cert si el llibre d'aquesta estada està per imprimir. */
export function llibrePerImprimir(e: EstadaLlibre): boolean {
  return !e.deletedAt && !e.esBorrany && e.estat !== 'CANCELLADA' && e.llibreImpresEl == null;
}

/** El mateix criteri, per a consultes Prisma. */
export const WHERE_LLIBRE_PER_IMPRIMIR = {
  deletedAt: null,
  esBorrany: false,
  estat: { not: 'CANCELLADA' },
  llibreImpresEl: null,
} satisfies Prisma.EstanciaWhereInput;
