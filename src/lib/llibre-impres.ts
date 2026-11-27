/**
 * Llibre registre «per imprimir»: cada contracte (estada nova o ampliació) neix
 * sense `llibreImpresEl` i surt de color taronja fins que es marca com a imprès.
 * Les cancel·lades no compten. Els esborranys SÍ (decisió de l'Anna, nov. 2026:
 * un esborrany s'ha de veure com qualsevol altra estada).
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
  return !e.deletedAt && e.estat !== 'CANCELLADA' && e.llibreImpresEl == null;
}

/** El mateix criteri, per a consultes Prisma. */
export const WHERE_LLIBRE_PER_IMPRIMIR = {
  deletedAt: null,
  estat: { not: 'CANCELLADA' },
  llibreImpresEl: null,
} satisfies Prisma.EstanciaWhereInput;
