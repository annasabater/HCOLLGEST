'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Uniformitza els fills (Link/Button heterogenis) com a files de menú: amplada
// completa, alineats a l'esquerra i sense vora individual.
// Els selectors són de FILL DIRECTE (o de botó dins d'un enllaç fill) a posta:
// amb `[&_button]` els estils s'escapaven cap als diàlegs que obren aquests
// mateixos fills (eliminar estada, sortida anticipada) i hi deixaven els botons
// a w-full i transparents, empenyent el de confirmar fora de la vista.
const FILES_MENU = [
  '[&>a]:w-full',
  '[&>a>button]:w-full [&>a>button]:justify-start [&>a>button]:border-0 [&>a>button]:bg-transparent [&>a>button]:font-normal [&>a>button:hover]:bg-slate-100',
  '[&>button]:w-full [&>button]:justify-start [&>button]:border-0 [&>button]:bg-transparent [&>button]:font-normal [&>button:hover]:bg-slate-100',
].join(' ');

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
      const t = e.target as HTMLElement | null;
      // Els diàlegs que obren els fills es renderitzen al <body> (portal), així
      // que un clic dins seu compta com a "fora" del menú. Si el tanquéssim,
      // desmuntaríem el diàleg a mitja interacció.
      if (t?.closest('dialog, [role="dialog"]')) return;
      if (ref.current && t && !ref.current.contains(t)) setOpen(false);
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
          className={`absolute right-0 z-30 mt-1 flex min-w-52 flex-col gap-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg ${FILES_MENU}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
