'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { rangPeriode, type EstatPeriode, type TipusPeriode } from '@/lib/periode';

const TIPUS: { clau: TipusPeriode | 'per'; etiqueta: string }[] = [
  { clau: 'any', etiqueta: 'Any' },
  { clau: 'tri', etiqueta: 'Trimestre' },
  { clau: 'mes', etiqueta: 'Mes' },
  { clau: 'per', etiqueta: 'Personalitzat' },
];

/** `YYYY-MM-DD` → `dd/mm/aaaa`. */
const fmt = (d: string) => d.split('-').reverse().join('/');

/**
 * Navegador de períodes (plantilla de Finances): una targeta blanca amb
 * [Mes | Trimestre | Any | Personalitzat] i ‹ Novembre 2026 › (o les dates), i a la
 * dreta el que es passi a `extra` (p. ex. l'ull d'amagar imports). No deixa anar
 * més enllà del període actual. «Tot» a Personalitzat si es passa `primerDia`.
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
  return (
    <div className={cn('ui-card flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4', className)}>
      <PeriodeEnLinia estat={estat} onChange={onChange} avui={avui} primerDia={primerDia} tipus={tipus} />
      {extra && <div className="ml-auto flex flex-wrap items-center gap-1.5">{extra}</div>}
    </div>
  );
}

const MESOS_CURTS = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];

/** «21 jul. – 22 nov. 2026» (o amb els dos anys si són diferents). */
export function etiquetaRang(desde: string, fins: string): string {
  const d = (s: string) => `${Number(s.slice(8, 10))} ${MESOS_CURTS[Number(s.slice(5, 7)) - 1]}`;
  if (desde === fins) return `${d(desde)} ${desde.slice(0, 4)}`;
  return desde.slice(0, 4) === fins.slice(0, 4)
    ? `${d(desde)} – ${d(fins)} ${fins.slice(0, 4)}`
    : `${d(desde)} ${desde.slice(0, 4)} – ${d(fins)} ${fins.slice(0, 4)}`;
}

/**
 * El mateix navegador en un sol botó «‹ Novembre 2026 ▾ ›»: les fletxes es mouen
 * pel període i el desplegable tria mes / trimestre / any o un rang a mà (amb «Tot»).
 */
export function PeriodeCompacte({
  estat,
  onChange,
  avui,
  primerDia,
  className,
}: {
  estat: EstatPeriode;
  onChange: (e: EstatPeriode) => void;
  avui: string;
  primerDia?: string;
  className?: string;
}) {
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

  const rang = estat.tipus === 'per' ? null : rangPeriode(estat.tipus, estat.off, avui);
  const etiqueta = rang ? rang.etiqueta : etiquetaRang(estat.tipus === 'per' ? estat.desde : avui, estat.tipus === 'per' ? estat.fins : avui);

  function triaTipus(t: TipusPeriode | 'per') {
    if (t === 'per') {
      if (estat.tipus !== 'per') {
        const r = rang ?? { desde: avui, fins: avui };
        onChange({ tipus: 'per', desde: r.desde, fins: r.fins });
      }
      return; // es queda obert per posar les dates
    }
    if (t !== estat.tipus) onChange({ tipus: t, off: 0 });
    setObert(false);
  }

  const fletxa = 'grid h-full w-9 place-items-center bg-white text-slate-700 hover:bg-slate-50 hover:text-brand-700 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-white';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white ui-card">
        <button
          type="button"
          aria-label="Període anterior"
          disabled={estat.tipus === 'per'}
          onClick={() => estat.tipus !== 'per' && onChange({ tipus: estat.tipus, off: estat.off - 1 })}
          className={cn(fletxa, 'border-r border-slate-200')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-expanded={obert}
          aria-haspopup="dialog"
          title={rang ? `${fmt(rang.desde)} – ${fmt(rang.fins)}` : undefined}
          onClick={() => setObert((o) => !o)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
        >
          {etiqueta}
          {estat.tipus !== 'per' && estat.off === 0 && rang?.fins === avui && <span className="text-[12.5px] font-normal text-slate-500">· fins avui</span>}
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
        <button
          type="button"
          aria-label="Període següent"
          disabled={estat.tipus === 'per' || estat.off >= 0}
          onClick={() => estat.tipus !== 'per' && onChange({ tipus: estat.tipus, off: estat.off + 1 })}
          className={cn(fletxa, 'border-l border-slate-200')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {obert && (
        <div role="dialog" aria-label="Triar el període" className="absolute left-0 z-30 mt-1 w-72 border border-slate-300 bg-white py-1 shadow-lg ui-card">
          {TIPUS.map((t) => (
            <button
              key={t.clau}
              type="button"
              onClick={() => triaTipus(t.clau)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-slate-50',
                estat.tipus === t.clau && 'bg-brand-50 font-bold text-brand-800',
              )}
            >
              {t.clau === 'per' ? 'Personalitzat (des de – fins a)' : t.etiqueta}
              {estat.tipus === t.clau && <span aria-hidden="true">✓</span>}
            </button>
          ))}
          {estat.tipus === 'per' && (
            <div className="grid gap-2 border-t border-slate-100 px-3 py-3 text-sm text-slate-600">
              <label className="flex items-center justify-between gap-2">
                Des de
                <Input
                  type="date"
                  value={estat.desde}
                  max={estat.fins}
                  onChange={(e) => e.target.value && onChange({ ...estat, desde: e.target.value })}
                  className="h-9 w-40"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                Fins a
                <Input
                  type="date"
                  value={estat.fins}
                  min={estat.desde}
                  onChange={(e) => e.target.value && onChange({ ...estat, fins: e.target.value })}
                  className="h-9 w-40"
                />
              </label>
              <div className="flex gap-2 pt-1">
                {primerDia && (
                  <button
                    type="button"
                    onClick={() => onChange({ tipus: 'per', desde: primerDia, fins: avui })}
                    className="h-9 flex-1 rounded border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-brand-600 hover:text-brand-700"
                  >
                    Tot
                  </button>
                )}
                <button type="button" onClick={() => setObert(false)} className="h-9 flex-1 rounded bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800">
                  Fet
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Grup de botons «segmentat» (blanc per dins, l'actiu en granat), per posar en una fila. */
export function Segmentat<T extends string>({
  opcions,
  valor,
  onChange,
  etiqueta,
  rol = 'group',
}: {
  opcions: { valor: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
  etiqueta: string;
  /** `tablist` quan canvia la vista (accessibilitat). */
  rol?: 'group' | 'tablist';
}) {
  return (
    <div role={rol} aria-label={etiqueta} className="flex h-10 gap-[3px] rounded-lg border border-slate-300 bg-white p-[3px] ui-card">
      {opcions.map((o) => (
        <button
          key={o.valor}
          type="button"
          {...(rol === 'tablist' ? { role: 'tab', 'aria-selected': valor === o.valor } : { 'aria-pressed': valor === o.valor })}
          onClick={() => onChange(o.valor)}
          className={cn(
            'whitespace-nowrap rounded-md px-3 text-sm transition-colors',
            valor === o.valor ? 'bg-brand-700 font-bold text-white' : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * El navegador en línia, sense fons propi (per anar dins d'una targeta):
 * [Mes | Trimestre | Any | Personalitzat] i ‹ Novembre 2026 › (o les dues dates).
 */
export function PeriodeEnLinia({
  estat,
  onChange,
  avui,
  primerDia,
  tipus = ['mes', 'tri', 'any', 'per'],
}: {
  estat: EstatPeriode;
  onChange: (e: EstatPeriode) => void;
  avui: string;
  primerDia?: string;
  /** Tipus que es poden triar (si només n'hi ha un, no surt el selector). */
  tipus?: (TipusPeriode | 'per')[];
}) {
  const opcions = TIPUS.filter((t) => tipus.includes(t.clau));
  const rang = estat.tipus === 'per' ? null : rangPeriode(estat.tipus, estat.off, avui);

  function triaTipus(t: TipusPeriode | 'per') {
    if (t === estat.tipus) return;
    if (t === 'per') {
      const r = rang ?? { desde: avui, fins: avui };
      onChange({ tipus: 'per', desde: r.desde, fins: r.fins });
    } else {
      onChange({ tipus: t, off: 0 });
    }
  }

  const fletxa = 'grid w-9 place-items-center text-slate-700 hover:bg-slate-50 hover:text-brand-700 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-white';

  return (
    <>
      {opcions.length > 1 && (
        <Segmentat
          etiqueta="Tipus de període"
          opcions={opcions.map((t) => ({ valor: t.clau, label: t.etiqueta }))}
          valor={estat.tipus}
          onChange={triaTipus}
        />
      )}
      {estat.tipus === 'per' ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <label className="flex items-center gap-1.5">
            Des de
            <Input type="date" value={estat.desde} max={estat.fins} onChange={(e) => e.target.value && onChange({ ...estat, desde: e.target.value })} className="h-10 w-40" />
          </label>
          <label className="flex items-center gap-1.5">
            fins a
            <Input type="date" value={estat.fins} min={estat.desde} onChange={(e) => e.target.value && onChange({ ...estat, fins: e.target.value })} className="h-10 w-40" />
          </label>
          {primerDia && (
            <button type="button" onClick={() => onChange({ tipus: 'per', desde: primerDia, fins: avui })} className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:border-brand-600 hover:text-brand-700">
              Tot
            </button>
          )}
        </div>
      ) : (
        <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white ui-card">
          <button type="button" aria-label="Període anterior" onClick={() => onChange({ tipus: estat.tipus, off: estat.off - 1 })} className={cn(fletxa, 'border-r border-slate-200')}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange({ tipus: estat.tipus, off: 0 })}
            // Les dates exactes, en passar-hi el ratolí.
            title={`${fmt(rang!.desde)} – ${fmt(rang!.fins)}${estat.off === 0 ? '' : ' · clica per tornar al període actual'}`}
            className="flex min-w-[9.5rem] items-center justify-center gap-1.5 whitespace-nowrap px-3 hover:bg-slate-50"
          >
            <span className="text-sm font-bold text-slate-900">{rang!.etiqueta}</span>
            {/* Només si el període encara corre (s'atura avui). */}
            {estat.off === 0 && rang!.fins === avui && <span className="text-[12.5px] text-slate-500">· fins avui</span>}
          </button>
          <button type="button" aria-label="Període següent" disabled={estat.off >= 0} onClick={() => onChange({ tipus: estat.tipus, off: estat.off + 1 })} className={cn(fletxa, 'border-l border-slate-200')}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
