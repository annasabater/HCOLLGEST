import * as React from 'react';
import { Pretitol } from '@/components/ui/pretitol';

export function PageHeader({
  title,
  subtitle,
  actions,
  pretitol,
}: {
  /** Text petit a sobre del títol; si no n'hi ha, l'apartat de la barra lateral. */
  pretitol?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Pretitol text={pretitol} />
        <h1 className="ui-page-title font-serif text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
