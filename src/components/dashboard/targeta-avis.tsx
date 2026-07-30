'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, PenLine, FileWarning, Receipt, FileEdit, ChevronDown, TrendingUp, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = { Send, PenLine, FileWarning, Receipt, FileEdit } as const;
const COLORS = {
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-700', border: 'border-amber-200', num: 'text-amber-800' },
  violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-700', border: 'border-violet-200', num: 'text-violet-800' },
  red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-700', border: 'border-red-200', num: 'text-red-800' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', num: 'text-emerald-800' },
} as const;

export type AvisTipus = 'MOSSOS' | 'FIRMA' | 'ENVIAMENT_ERROR';
export interface AvisItem {
  key: string;
  nom: string;
  sub?: string;
  href: string;
  /** Només per als avisos que es poden amagar per sempre (Mossos/firma/error). */
  tipus?: AvisTipus;
  entitatId?: string;
}

/**
 * Targeta d'avís del taulell desplegable: mostra el número i, en clicar-la,
 * la llista de persones pendents amb un enllaç a l'estada i un botó per amagar
 * l'avís per sempre.
 */
export function TargetaAvis({
  label,
  ok,
  color,
  iconKey,
  items,
  dismissable = true,
}: {
  label: string;
  ok: boolean;
  color: keyof typeof COLORS;
  iconKey: keyof typeof ICONS;
  items: AvisItem[];
  /** Si es pot amagar cada element per sempre (botó «Amaga»). Per defecte, sí. */
  dismissable?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amagant, setAmagant] = useState<string | null>(null);
  const Icon = ICONS[iconKey];
  const c = COLORS[color];

  async function amaga(it: AvisItem) {
    if (!it.tipus || !it.entitatId) return;
    setAmagant(it.key);
    try {
      await fetch('/api/avisos/descartar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tipus: it.tipus, entitatId: it.entitatId }),
      });
      router.refresh();
    } finally {
      setAmagant(null);
    }
  }

  return (
    <div className={cn('rounded-2xl border transition-all', ok ? 'border-slate-200 bg-white' : `${c.border} ${c.bg}`)}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className={cn('rounded-xl p-2.5', ok ? 'bg-slate-100 text-slate-400' : c.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-2xl font-bold leading-none', ok ? 'text-slate-700' : c.num)}>{items.length}</p>
          <p className="mt-1 text-xs leading-tight text-slate-500">{label}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {ok ? (
            <span className="text-xs font-semibold text-green-600">✓ OK</span>
          ) : (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
              <TrendingUp className="h-3 w-3" /> Atenció
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-slate-300 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="space-y-1 border-t border-slate-100 px-2 py-2">
          {items.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-slate-400">Cap pendent.</p>
          ) : (
            items.map((it) => (
              <div key={it.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/70">
                <Link href={it.href} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{it.nom}</span>
                  {it.sub && <span className="block truncate text-xs text-slate-400">{it.sub}</span>}
                </Link>
                {dismissable && (
                  <button
                    type="button"
                    onClick={() => amaga(it)}
                    disabled={amagant === it.key}
                    title="Amaga aquest avís per sempre"
                    className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
                  >
                    <EyeOff className="h-3.5 w-3.5" /> {amagant === it.key ? 'Amagant…' : 'Amaga'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
