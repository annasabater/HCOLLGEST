import * as React from 'react';
import { cn } from '@/lib/utils';

type Tone =
  | 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  // Estats de facturació: rectificativa retornada i dipòsits (en custòdia, retingut, retornat a l'hoste).
  | 'rectificativa' | 'custodia' | 'retingut' | 'retornat';

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-brand-100 text-brand-800',
  rectificativa: 'bg-rose-100 text-rose-800',
  custodia: 'bg-teal-100 text-teal-800',
  retingut: 'bg-violet-100 text-violet-800',
  retornat: 'bg-sky-100 text-sky-800',
};

/** Color de l'etiqueta d'estat d'un dipòsit. */
export function toneEstatDiposit(estat: 'EN_CUSTODIA' | 'TORNAT' | 'RETINGUT' | undefined): Tone {
  return estat === 'RETINGUT' ? 'retingut' : estat === 'TORNAT' ? 'neutral' : 'custodia';
}

/** Color de l'etiqueta d'estat d'una factura (rectificativa en vermell). */
export function toneEstatFactura(estat: 'PENDENT' | 'COBRADA', total: number): Tone {
  if (estat !== 'COBRADA') return 'warning';
  return total < 0 ? 'rectificativa' : 'success';
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
