'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

const OPCIONS: { value: string; href: string; label: string }[] = [
  { value: 'totes', href: '/factures', label: 'Totes' },
  { value: 'simples', href: '/factures?tipus=simples', label: 'Simplificades' },
  { value: 'fiscals', href: '/factures?tipus=fiscals', label: 'Fiscals' },
];

/** Segmentat per filtrar les factures per tipus (simplificades / fiscals / totes). */
export function FacturaFiltreTipus({ actual }: { actual: string }) {
  return (
    <div role="group" aria-label="Tipus de factura" className="flex h-10 gap-[3px] rounded-lg border border-slate-300 bg-white p-[3px] text-sm">
      {OPCIONS.map((o) => {
        const active = o.value === actual;
        return (
          <Link
            key={o.value}
            href={o.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center whitespace-nowrap rounded-md px-3 transition-colors',
              active ? 'bg-brand-700 font-bold text-white' : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
