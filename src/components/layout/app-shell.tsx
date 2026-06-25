'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Settings } from 'lucide-react';
import type { Role } from '@prisma/client';
import { Sidebar } from '@/components/layout/sidebar';
import { LogoutButton } from '@/components/layout/logout-button';
import { GlobalSearch } from '@/components/layout/global-search';
import { AmountsVisibilityProvider } from '@/components/finances/amounts-visibility';
import { RestringitProvider } from '@/components/layout/restringit-context';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPCIO: 'Recepció',
  CONSULTA: 'Consulta',
};

export function AppShell({
  user,
  readOnly = false,
  children,
}: {
  user: { nom: string; role: Role };
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tanca el menú en navegar (mòbil/tablet).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <AmountsVisibilityProvider>
    <RestringitProvider value={readOnly}>
    <div className="flex min-h-screen">
      {/* Fons fosc quan el menú està obert (només mòbil/tablet) */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-brand-900 text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-brand-800 px-5 py-5">
          <div>
            <p className="font-serif text-2xl font-semibold tracking-wide">Hostal Coll</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-brand-300">
              Gestió integral
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-brand-200 hover:bg-brand-800 lg:hidden"
            aria-label="Tancar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Sidebar role={user.role} restringit={readOnly} />
        <div className="border-t border-brand-800 p-3">
          {user.role === 'ADMIN' ? (
            <Link
              href="/config"
              className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-100 transition-colors hover:bg-brand-800"
            >
              <Settings className="h-4 w-4 shrink-0" />
              Configuració
            </Link>
          ) : (
            <div className="mb-2 px-3">
              <p className="truncate text-sm font-medium">{user.nom}</p>
              <p className="text-xs text-brand-300">
                {readOnly ? 'Només lectura' : (ROLE_LABEL[user.role] ?? user.role)}
              </p>
            </div>
          )}
          <LogoutButton />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Obrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
    </RestringitProvider>
    </AmountsVisibilityProvider>
  );
}
