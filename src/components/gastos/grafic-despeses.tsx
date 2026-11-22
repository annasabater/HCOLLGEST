'use client';

import { useState } from 'react';
import { Eur, useAmountsHidden } from '@/components/finances/amounts-visibility';
import { cn, formatEur } from '@/lib/utils';
import { agrupaFiancesPerMesos, agrupaPerMesos, type DespesaFiltrable } from '@/lib/filtre-despeses';

// Colors validats (contrast i daltonisme) per distingir el període triat i el de comparar.
const COLOR_ARA = '#9B2F3C';
const COLOR_ABANS = '#A87528';
// Les fiances (recuperables) van rallades a sobre de la despesa real.
const RALLAT = 'repeating-linear-gradient(135deg, #B45309 0 3px, #B4530929 3px 6px)';

const AGRUPACIONS = [
  { mesos: 1, label: 'Per mes' },
  { mesos: 2, label: 'Per bimestre' },
  { mesos: 3, label: 'Per trimestre' },
] as const;

interface Barra { etiqueta: string; import: number; n: number; fiances: number; quin: 'ara' | 'abans' }

/**
 * Barres del que s'ha gastat (ja filtrat) al període triat i, si n'hi ha, al de
 * comparar. Cada període s'agrupa des del seu primer mes, i el de comparar va primer
 * si és anterior.
 */
export function GraficDespeses({
  gastosAra,
  rangAra,
  gastosAbans,
  rangAbans,
}: {
  gastosAra: DespesaFiltrable[];
  rangAra: { desde: string; fins: string };
  gastosAbans: DespesaFiltrable[] | null;
  rangAbans: { desde: string; fins: string } | null;
}) {
  // Per defecte, el que doni com a molt ~12 barres per període.
  const mesosAra = (Number(rangAra.fins.slice(0, 4)) - Number(rangAra.desde.slice(0, 4))) * 12
    + Number(rangAra.fins.slice(5, 7)) - Number(rangAra.desde.slice(5, 7)) + 1;
  const [mesos, setMesos] = useState<number>(mesosAra > 24 ? 3 : 1);
  const { hidden } = useAmountsHidden();

  const ara: Barra[] = agrupaPerMesos(gastosAra, rangAra.desde, rangAra.fins, mesos).map((b, i) => ({
    ...b,
    fiances: agrupaFiancesPerMesos(gastosAra, rangAra.desde, rangAra.fins, mesos)[i] ?? 0,
    quin: 'ara',
  }));
  const abans: Barra[] = gastosAbans && rangAbans
    ? agrupaPerMesos(gastosAbans, rangAbans.desde, rangAbans.fins, mesos).map((b, i) => ({
        ...b,
        fiances: agrupaFiancesPerMesos(gastosAbans, rangAbans.desde, rangAbans.fins, mesos)[i] ?? 0,
        quin: 'abans' as const,
      }))
    : [];
  const hiHaFiances = [...ara, ...abans].some((b) => b.fiances > 0);
  const barres = rangAbans && rangAbans.desde < rangAra.desde ? [...abans, ...ara] : [...ara, ...abans];
  const max = Math.max(1, ...barres.map((b) => b.import + b.fiances));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5" style={{ background: COLOR_ARA }} />Període triat</span>
        {abans.length > 0 && (
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5" style={{ background: COLOR_ABANS }} />Comparació</span>
        )}
        {hiHaFiances && (
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5" style={{ background: RALLAT }} />Fiances (recuperables)</span>
        )}
        <div role="group" aria-label="Agrupa" className="ml-auto flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {AGRUPACIONS.map((a) => (
            <button
              key={a.mesos}
              type="button"
              aria-pressed={mesos === a.mesos}
              onClick={() => setMesos(a.mesos)}
              className={cn('h-8 rounded-md px-2.5 text-xs font-semibold', mesos === a.mesos ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-full items-end gap-2 border-b border-slate-300" style={{ minWidth: `${barres.length * 64}px` }}>
          {barres.map((b, i) => {
            const alt = Math.round((b.import / max) * 150);
            const altFiances = Math.round((b.fiances / max) * 150);
            const total = Math.round((b.import + b.fiances) * 100) / 100;
            const primerAra = b.quin === 'ara' && i > 0 && barres[i - 1]!.quin === 'abans';
            return (
              <div
                key={`${b.quin}-${b.etiqueta}`}
                className={cn('group relative flex min-w-[56px] flex-1 flex-col items-center justify-end', primerAra && 'ml-4 border-l border-dashed border-slate-200 pl-4')}
                style={{ height: 190 }}
                title={
                  hidden
                    ? b.etiqueta
                    : `${b.etiqueta}: ${formatEur(b.import)} · ${b.n} ${b.n === 1 ? 'despesa' : 'despeses'}${b.fiances > 0 ? ` + ${formatEur(b.fiances)} en fiances` : ''}`
                }
              >
                {total > 0 ? (
                  <span className="mb-1 text-xs font-bold text-slate-800"><Eur value={total} /></span>
                ) : (
                  <span className="mb-1 text-xs text-slate-400">0 €</span>
                )}
                {b.fiances > 0 && (
                  <span
                    className={cn('w-full max-w-14 transition-opacity group-hover:opacity-80', b.import === 0 && 'rounded-t')}
                    style={{ height: Math.max(3, altFiances), background: RALLAT }}
                  />
                )}
                <span
                  className={cn('w-full max-w-14 transition-opacity group-hover:opacity-80', b.fiances === 0 && 'rounded-t')}
                  style={{ height: Math.max(b.import > 0 ? 3 : 0, alt), background: b.quin === 'ara' ? COLOR_ARA : COLOR_ABANS }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex min-w-full gap-2" style={{ minWidth: `${barres.length * 64}px` }}>
          {barres.map((b, i) => {
            const primerAra = b.quin === 'ara' && i > 0 && barres[i - 1]!.quin === 'abans';
            return (
              <span key={`l-${b.quin}-${b.etiqueta}`} className={cn('min-w-[56px] flex-1 pt-1.5 text-center text-xs text-slate-600', primerAra && 'ml-4 pl-4')}>
                {b.etiqueta}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
