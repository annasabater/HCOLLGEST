'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Targeta col·lapsable genèrica (capçalera clicable + cos plegable), amb el
 * mateix estil compacte que el panell de mascotes/documents. Accepta `children`
 * renderitzats al servidor (es mostren/amaguen al client).
 */
export function CollapsibleCard({
  title,
  icon,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
        aria-expanded={open}
      >
        {icon}
        <CardTitle>{title}</CardTitle>
        {count != null && <span className="text-sm font-medium text-slate-400">({count})</span>}
        <ChevronDown
          className={cn('ml-auto h-5 w-5 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <CardBody className="border-t border-slate-100">{children}</CardBody>}
    </Card>
  );
}
