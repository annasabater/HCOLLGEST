'use client';

import { useRouter } from 'next/navigation';
import { Tr } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// Clics que NO han d'obrir la fila: botons, enllaços, camps, i qualsevol diàleg.
const INTERACTIU = 'a,button,input,select,textarea,label,summary,[role="dialog"],[role="menu"],[data-no-row-link]';

/**
 * Fila de taula que obre `href` en clicar-hi a qualsevol lloc (no només al nom).
 * Els botons/enllaços de dins continuen funcionant com sempre, i els diàlegs que
 * s'hi obren (encara que siguin portals) no la disparen. Ctrl/Cmd+clic → pestanya nova.
 */
export function TrLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Tr
      className={cn('cursor-pointer', className)}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!e.currentTarget.contains(target)) return; // clic dins d'un portal (diàleg)
        if (target.closest(INTERACTIU)) return;
        if (window.getSelection()?.toString()) return; // estava seleccionant text
        if (e.ctrlKey || e.metaKey) window.open(href, '_blank');
        else router.push(href);
      }}
    >
      {children}
    </Tr>
  );
}
