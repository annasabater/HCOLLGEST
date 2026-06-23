'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/balanc', label: 'Balanç' },
  { href: '/factures', label: 'Facturació' },
  { href: '/tarifes', label: 'Tarifes' },
  { href: '/gastos', label: 'Despeses' },
  { href: '/serveis', label: 'Proveïdors i serveis' },
  { href: '/verifactu', label: 'Veri*Factu' },
];

/** Sub-navegació de la secció financera (tot penja del Balanç). */
export function FinancesNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((t) => {
        const active = t.href === '/balanc' ? pathname === '/balanc' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-brand-700 text-brand-800'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
