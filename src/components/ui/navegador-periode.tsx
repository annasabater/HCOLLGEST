'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { rangPeriode, type EstatPeriode, type TipusPeriode } from '@/lib/periode';

const TIPUS: { clau: TipusPeriode | 'per'; etiqueta: string }[] = [
  { clau: 'mes', etiqueta: 'Mes' },
  { clau: 'tri', etiqueta: 'Trimestre' },
  { clau: 'any', etiqueta: 'Any' },
  { clau: 'per', etiqueta: 'Personalitzat' },
];

/** `YYYY-MM-DD` → `dd/mm/aaaa`. */
const fmt = (d: string) => d.split('-').reverse().join('/');

/**
 * Navegador de períodes: tries mes / trimestre / any i et mous amb ‹ ›, sense
 * escriure dates. «Personalitzat» mostra «Des de / Fins a» (i «Tot», si se li passa
 * `primerDia`). No deixa anar més enllà del període actual.
 */
export function NavegadorPeriode({
  estat,
  onChange,
  avui,
  tipus = ['mes', 'tri', 'any', 'per'],
  primerDia,
  extra,
  className,
}: {
  estat: EstatPeriode;
  onChange: (e: EstatPeriode) => void;
  /** Avui en `YYYY-MM-DD`. */
  avui: string;
  /** Tipus que es poden triar (si només n'hi ha un, no surt el selector). */
  tipus?: (TipusPeriode | 'per')[];
  /** Primer dia amb dades: activa el botó «Tot» a «Personalitzat». */
  primerDia?: string;
  /** Contingut addicional a la dreta (p. ex. «Amagar imports»). */
  extra?: ReactNode;
  className?: string;
}) {
  const opcions = TIPUS.filter((t) => tipus.includes(t.clau));
  const rang = estat.tipus === 'per' ? null : rangPeriode(estat.tipus, estat.off, avui);

  function triaTipus(t: TipusPeriode | 'per') {
    if (t === estat.tipus) return;
    if (t === 'per') {
      // Parteix del que s'estava mirant, perquè no calgui tornar-ho a escriure.
      const r = rang ?? { desde: avui, fins: avui };
      onChange({ tipus: 'per', desde: r.desde, fins: r.fins });
    } else {
      onChange({ tipus: t, off: 0 });
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3', className)}>
      {opcions.length > 1 && (
        <div role="group" aria-label="Tipus de període" className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
          {opcions.map((t) => (
            <button
              key={t.clau}
              type="button"
              aria-pressed={estat.tipus === t.clau}
              onClick={() => triaTipus(t.clau)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                estat.tipus === t.clau ? 'bg-brand-700 text-white' : 'text-slate-600 hover:text-brand-700',
              )}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      )}

      {estat.tipus === 'per' ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Des de">
            <Input
              type="date"
              value={estat.desde}
              max={estat.fins}
              onChange={(e) => e.target.value && onChange({ ...estat, desde: e.target.value })}
            />
          </Field>
          <Field label="Fins a">
            <Input
              type="date"
              value={estat.fins}
              min={estat.desde}
              onChange={(e) => e.target.value && onChange({ ...estat, fins: e.target.value })}
            />
          </Field>
          {primerDia && (
            <button
              type="button"
              onClick={() => onChange({ tipus: 'per', desde: primerDia, fins: avui })}
              className="mb-0.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand-600 hover:text-brand-700"
            >
              Tot
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Període anterior"
            onClick={() => onChange({ tipus: estat.tipus, off: estat.off - 1 })}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange({ tipus: estat.tipus, off: 0 })}
            title={estat.off === 0 ? 'Període actual' : 'Tornar al període actual'}
            className="min-w-[11rem] rounded-lg px-2 py-0.5 text-center hover:bg-white"
          >
            <span className="block font-serif text-lg font-semibold leading-tight text-slate-900">{rang!.etiqueta}</span>
            <span className="block text-xs text-slate-500">
              {fmt(rang!.desde)} – {fmt(rang!.fins)}
            </span>
          </button>
          <button
            type="button"
            aria-label="Període següent"
            disabled={estat.off >= 0}
            onClick={() => onChange({ tipus: estat.tipus, off: estat.off + 1 })}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700 disabled:cursor-default disabled:opacity-35 disabled:hover:border-slate-200 disabled:hover:text-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {extra && <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">{extra}</div>}
    </div>
  );
}
