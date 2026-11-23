'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface OpcioMes {
  label: string;
  icon?: ReactNode;
  /** Explicació curta sota el nom. */
  desc?: string;
  onClick?: () => void;
  href?: string;
  /** Obre l'enllaç en una pestanya nova. */
  nova?: boolean;
  disabled?: boolean;
}

/** Botó «Més ▾» amb un desplegable d'opcions secundàries (es tanca en clicar fora o amb Esc). */
export function MenuMes({ opcions, label = 'Més', className }: { opcions: OpcioMes[]; label?: string; className?: string }) {
  const [obert, setObert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!obert) return;
    const clic = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setObert(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setObert(false); };
    document.addEventListener('mousedown', clic);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', clic); document.removeEventListener('keydown', tecla); };
  }, [obert]);
  if (opcions.length === 0) return null;

  const contingut = (o: OpcioMes) => (
    <>
      <span className="mt-0.5 shrink-0 text-slate-500">{o.icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold text-slate-800">{o.label}</span>
        {o.desc && <span className="block text-xs text-slate-500">{o.desc}</span>}
      </span>
    </>
  );
  const classe = 'flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Button size="sm" variant="outline" aria-haspopup="menu" aria-expanded={obert} onClick={() => setObert((v) => !v)}>
        {label} <ChevronDown className="h-4 w-4" />
      </Button>
      {obert && (
        <div role="menu" className="ui-card absolute left-0 z-30 mt-1 w-[min(20rem,calc(100vw-2rem))] divide-y divide-slate-100 border border-slate-200 bg-white shadow-lg">
          {opcions.map((o) =>
            o.href ? (
              <a key={o.label} role="menuitem" href={o.href} target={o.nova ? '_blank' : undefined} rel={o.nova ? 'noreferrer' : undefined} className={classe} onClick={() => setObert(false)}>
                {contingut(o)}
              </a>
            ) : (
              <button key={o.label} role="menuitem" type="button" disabled={o.disabled} className={classe} onClick={() => { setObert(false); o.onClick?.(); }}>
                {contingut(o)}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
