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
          // Tanca el menú només en clicar un enllaç de navegació. Si es tanqués
          // amb qualsevol clic, desmuntaria els fills que obren un diàleg (sortida
          // anticipada, eliminar…) abans que el diàleg arribés a mostrar-se.
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setOpen(false);
          }}
          // Uniformitza els fills (Link/Button heterogenis) com a files de menú:
          // amplada completa, alineats a l'esquerra i sense vora individual.
          className="absolute right-0 z-30 mt-1 flex min-w-52 flex-col gap-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg [&>*]:w-full [&_a]:w-full [&_button]:w-full [&_button]:justify-start [&_button]:border-0 [&_button]:bg-transparent [&_button]:font-normal [&_button:hover]:bg-slate-100"
        >
          {children}
        </div>
      )}
    </div>
  );
}
