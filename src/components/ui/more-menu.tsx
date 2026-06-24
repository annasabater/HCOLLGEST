'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Menú "⋯ Més": agrupa accions secundàries en un desplegable per no atapeir la
 * capçalera. Els fills (botons/enllaços) es passen com a children i es mostren
 * apilats; el menú es tanca en clicar fora o en clicar un element.
 */
export function MoreMenu({ children, label = 'Més' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal className="h-4 w-4" /> {label}
      </Button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 z-30 mt-1 flex min-w-48 flex-col items-stretch gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  );
}
