import { cn } from '@/lib/utils';

/**
 * Estil dels botons i enllaços de PDF (i d'imprimir): diferents dels altres botons
 * perquè es reconeguin d'una ullada, però quadrats a tot arreu (també a l'estil
 * original). Vora i text granat, fons blanc. Es fa servir com a `className` en un
 * <a>, <button> o <Link>, amb la icona `FileText` al davant.
 */
export function classePdf(mida: 'xs' | 'sm' | 'md' = 'sm', extra?: string): string {
  return cn(
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-none border border-brand-700 bg-white font-semibold text-brand-800 transition-colors hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-50',
    mida === 'xs' ? 'h-7 px-2 text-xs' : mida === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
    extra,
  );
}
