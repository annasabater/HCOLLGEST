'use client';

import { formatEur } from '@/lib/utils';
import { useAmountsHidden } from '@/components/finances/amounts-visibility';

interface MesRow {
  mes: number;
  ingressos: number;
  despeses: number;
  benefici: number;
}

const MESOS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];

/** Gràfic de barres ingressos / despeses / benefici per mes (CSS pur). */
export function BalancChart({ mesos }: { mesos: MesRow[] }) {
  const { hidden } = useAmountsHidden();
  const eur = (v: number) => (hidden ? '••••' : formatEur(v));
  const max = Math.max(
    1,
    ...mesos.map((m) => Math.max(m.ingressos, m.despeses, Math.max(0, m.benefici))),
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500" /> Ingressos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-400" /> Despeses
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand-600" /> Benefici
        </span>
      </div>

      <div className="flex h-56 items-end gap-1.5 border-b border-slate-200">
        {mesos.map((m) => (
          <div key={m.mes} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-px">
              <div
                className="w-1/3 rounded-t bg-green-500 transition-all hover:bg-green-600"
                style={{ height: `${(m.ingressos / max) * 100}%` }}
                title={`${MESOS[m.mes - 1]}: ingressos ${eur(m.ingressos)}`}
              />
              <div
                className="w-1/3 rounded-t bg-red-400 transition-all hover:bg-red-500"
                style={{ height: `${(m.despeses / max) * 100}%` }}
                title={`${MESOS[m.mes - 1]}: despeses ${eur(m.despeses)}`}
              />
              <div
                className={`w-1/3 rounded-t transition-all ${m.benefici < 0 ? 'bg-red-300' : 'bg-brand-600 hover:bg-brand-700'}`}
                style={{ height: `${(Math.max(0, m.benefici) / max) * 100}%` }}
                title={`${MESOS[m.mes - 1]}: benefici ${eur(m.benefici)}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 flex gap-1.5">
        {mesos.map((m) => (
          <div key={m.mes} className="flex-1 text-center text-[10px] text-slate-400">
            {MESOS[m.mes - 1]}
          </div>
        ))}
      </div>
    </div>
  );
}
