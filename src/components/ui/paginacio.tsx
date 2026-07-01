'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  total: number;
  pagina: number;
  perPagina: number;
  paramName?: string;
  className?: string;
}

const OPCIONS = [10, 25, 50];

export function Paginacio({ total, pagina, perPagina, paramName = 'pagina', className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPagines = Math.ceil(total / perPagina);
  if (totalPagines <= 1 && total <= Math.min(...OPCIONS)) return null;

  function nav(newPagina: number, newPer?: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, String(newPagina));
    if (newPer != null) params.set('perPagina', String(newPer));
    router.push(`${pathname}?${params.toString()}`);
  }

  const btn = (label: React.ReactNode, disabled: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 transition-colors',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-brand-300 hover:text-brand-700',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 pt-4', className)}>
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <span>Files per pàgina:</span>
        {OPCIONS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => nav(1, o)}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              o === perPagina
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-700',
            )}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {btn(<ChevronLeft className="h-4 w-4" />, pagina <= 1, () => nav(pagina - 1))}
        <span>
          Pàgina <strong>{pagina}</strong> de <strong>{totalPagines}</strong>
          <span className="ml-2 text-slate-400">({total} registres)</span>
        </span>
        {btn(<ChevronRight className="h-4 w-4" />, pagina >= totalPagines, () => nav(pagina + 1))}
      </div>
    </div>
  );
}
