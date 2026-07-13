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
    <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
      {OPCIONS.map((o) => {
        const active = o.value === actual;
        return (
          <Link
            key={o.value}
            href={o.href}
            className={cn(
              'rounded-md px-3 py-1.5 font-medium transition-colors',
              active ? 'bg-brand-700 text-white' : 'text-slate-500 hover:text-brand-700',
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
