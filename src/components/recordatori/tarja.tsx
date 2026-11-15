'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Smartphone, X } from 'lucide-react';
import { ApiError, patchJSON } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  diesEntre,
  sumaDies,
  textHora,
  textQuan,
  textRepeticio,
  TIPUS_RECORDATORI_LABELS,
  type TipusRecordatori,
} from '@/lib/recordatoris';
import type { RecordatoriVista } from '@/lib/services/recordatoris';

const MESOS = ['GEN', 'FEB', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DES'];

/** Data en columna fina: dia gran i mes a sota. Granat si ve, vermell si ja ha passat. */
export function DataTile({ data, vencut, petit, fix }: { data: string; vencut?: boolean; petit?: boolean; fix?: boolean }) {
  return (
    <div className={cn('w-10 shrink-0 text-center leading-none', vencut ? 'text-red-700' : fix ? 'text-blue-700' : 'text-brand-700')}>
      <div className={cn('font-serif font-semibold tabular-nums', petit ? 'text-2xl' : 'text-3xl')}>{data.slice(8, 10)}</div>
      <div className="mt-0.5 text-[10px] font-bold tracking-[0.12em] opacity-80">{MESOS[Number(data.slice(5, 7)) - 1]}</div>
    </div>
  );
}

/** Recordatori que toca ara: amb «Fet» i «Recorda-m'ho en 3 dies». */
export function RecordatoriTarja({
  r,
  avui,
  canWrite,
  onCanvi,
  compacte,
}: {
  r: RecordatoriVista;
  avui: string;
  canWrite: boolean;
  onCanvi?: () => void;
  /** Una sola línia (per al tauler). */
  compacte?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'FET' | 'AJORNA' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dies = diesEntre(avui, r.data);
  const vencut = dies < 0;

  // «Ajorna…» obre les opcions de quants dies.
  const [triaDies, setTriaDies] = useState(false);

  async function accio(a: 'FET' | 'AJORNA', n = 3) {
    setBusy(a);
    setErr(null);
    try {
      await patchJSON(`/api/recordatoris/${r.id}`, a === 'FET' ? { accio: 'FET' } : { accio: 'AJORNA', dies: n });
      setTriaDies(false);
      onCanvi?.();
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut desar');
    } finally {
      setBusy(null);
    }
  }

  const botons = (mida: 'sm' | 'md') =>
    triaDies ? (
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Recorda-m’ho d’aquí a">
        <span className="text-xs font-semibold text-slate-500">Recorda-m’ho en:</span>
        {[
          [1, '1 dia'],
          [2, '2 dies'],
          [3, '3 dies'],
          [4, '4 dies'],
          [5, '5 dies'],
          [7, '1 setmana'],
          [14, '2 setmanes'],
          [30, '1 mes'],
        ].map(([n, t]) => (
          <Button
            key={n}
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => accio('AJORNA', Number(n))}
          >
            {t}
          </Button>
        ))}
        <label className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
          o el dia
          <input
            type="date"
            min={sumaDies(avui, 1)}
            disabled={busy !== null}
            onChange={(ev) => {
              const d = ev.target.value;
              const n = d ? diesEntre(avui, d) : 0;
              if (n >= 1 && n <= 365) accio('AJORNA', n);
            }}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
            aria-label="Recorda-m’ho el dia"
          />
        </label>
        <Button size="sm" variant="ghost" onClick={() => setTriaDies(false)} aria-label="Cancel·la">
          <X className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        <Button size={mida} onClick={() => accio('FET')} disabled={busy !== null} className="bg-emerald-700 hover:bg-emerald-800">
          <Check className="h-4 w-4" /> {busy === 'FET' ? 'Desant…' : 'Fet'}
        </Button>
        <Button size={mida} variant="outline" onClick={() => setTriaDies(true)} disabled={busy !== null}>
          <Clock className="h-4 w-4" /> {busy === 'AJORNA' ? 'Desant…' : 'Ajorna…'}
        </Button>
      </div>
    );

  if (compacte) {
    const dd = r.data.slice(8, 10);
    const mes = MESOS[Number(r.data.slice(5, 7)) - 1];
    return (
      <article className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-xs font-extrabold text-white',
            vencut ? 'bg-red-700' : 'bg-amber-700',
          )}
        >
          {dd} {mes}
        </span>
        <div className="flex min-w-0 flex-[1_1_14rem] flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-900">{r.titol}</span>
          <span className={cn('text-xs font-bold', vencut ? 'text-red-800' : 'text-amber-900')}>
            {dies === 0 ? 'Avui' : textQuan(dies).replace(/^./, (c) => c.toUpperCase())}
          </span>
          <span className="text-xs text-stone-500">
            · {TIPUS_RECORDATORI_LABELS[r.tipus as TipusRecordatori] ?? r.tipus}
          </span>
          {r.whatsapp && r.hora && (
            <span className="inline-flex items-center gap-0.5 text-xs text-emerald-800">
              <Smartphone className="h-3 w-3" /> {textHora(r.hora)}
            </span>
          )}
          {r.notes && <span className="w-full truncate text-xs text-slate-500">{r.notes}</span>}
          {err && <span className="w-full text-xs text-red-600">{err}</span>}
        </div>
        {canWrite && botons('sm')}
      </article>
    );
  }

  return (
    <article className={cn('flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:gap-5', r.fix && 'border-l-4 border-l-blue-600')}>
      <DataTile data={r.data} vencut={vencut} fix={r.fix} />
      <div className="min-w-0 flex-[1_1_16rem] space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {r.fix && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800">Fix</span>}
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-bold',
              vencut ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900',
            )}
          >
            {dies === 0 ? 'Avui' : textQuan(dies).replace(/^./, (c) => c.toUpperCase())}
          </span>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
            {TIPUS_RECORDATORI_LABELS[r.tipus as TipusRecordatori] ?? r.tipus} · {textRepeticio(r.repeticioCada, r.repeticioUnitat).toLowerCase()}
          </span>
          {r.ajornaments > 0 && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
              ajornat {r.ajornaments === 1 ? '1 cop' : `${r.ajornaments} cops`}
            </span>
          )}
          {r.whatsapp && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <Smartphone className="h-3 w-3" /> Mòbil{r.hora ? ` ${textHora(r.hora)}` : ''}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-900">{r.titol}</h3>
        {r.notes && <p className="text-sm text-slate-600">{r.notes}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
      {canWrite && botons('md')}
    </article>
  );
}
