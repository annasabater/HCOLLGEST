'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn, formatEur } from '@/lib/utils';

const STORAGE_KEY = 'hc:finances-amagades';
const MASK = '••••';

type Ctx = { hidden: boolean; toggle: () => void; hide: () => void };

const AmountsContext = createContext<Ctx | null>(null);

/**
 * Proveïdor global de la preferència "amagar imports".
 * Es munta a l'AppShell, així la preferència és única per a tot el dashboard
 * (KPIs, factures, despeses…) i es recorda entre sessions.
 */
export function AmountsVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  // Es llegeix després del muntatge per no provocar mismatch d'hidratació.
  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const toggle = useCallback(() => {
    setHidden((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  // Amaga sense desar la preferència (per amagar per defecte en entrar a una pàgina).
  const hide = useCallback(() => setHidden(true), []);

  return <AmountsContext.Provider value={{ hidden, toggle, hide }}>{children}</AmountsContext.Provider>;
}

export function useAmountsHidden(): Ctx {
  // Fallback segur si s'usa fora del provider: mai amaga.
  return useContext(AmountsContext) ?? { hidden: false, toggle: () => {}, hide: () => {} };
}

/** Amaga els imports en muntar (p. ex. en entrar a Balanç). No es renderitza. */
export function HideAmountsOnMount() {
  const { hide } = useAmountsHidden();
  useEffect(() => { hide(); }, [hide]);
  return null;
}

/** Botó d'ull per mostrar/amagar tots els imports de la pàgina. */
export function HideAmountsButton({ className }: { className?: string }) {
  const { hidden, toggle } = useAmountsHidden();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
        className,
      )}
    >
      {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      {hidden ? 'Mostrar imports' : 'Amagar imports'}
    </button>
  );
}

/** Import en € que s'amaga globalment amb el botó d'ull. */
export function Eur({ value, className }: { value: number; className?: string }) {
  const { hidden } = useAmountsHidden();
  if (hidden) {
    return <span className={cn('tracking-widest text-slate-400', className)}>{MASK}</span>;
  }
  return <span className={className}>{formatEur(value)}</span>;
}
