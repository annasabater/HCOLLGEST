'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, MessageCircle } from 'lucide-react';
import { ApiError, patchJSON } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  diesEntre,
  textQuan,
  textRepeticio,
  TIPUS_RECORDATORI_LABELS,
  type TipusRecordatori,
} from '@/lib/recordatoris';
import type { RecordatoriVista } from '@/lib/services/recordatoris';

const MESOS = ['GEN', 'FEB', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DES'];

/** Calendari petit: mes, dia i any. Vermell si ja ha passat, taronja si ve. */
export function DataTile({ data, vencut, petit }: { data: string; vencut?: boolean; petit?: boolean }) {
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-2xl border bg-white text-center',
        petit ? 'w-14' : 'w-[4.5rem]',
        vencut ? 'border-red-200' : 'border-amber-200',
      )}
    >
      <div className={cn('py-1 text-[11px] font-extrabold tracking-[0.1em] text-white', vencut ? 'bg-red-700' : 'bg-amber-700')}>
        {MESOS[Number(data.slice(5, 7)) - 1]}
      </div>
      <div className={cn('font-extrabold text-slate-900', petit ? 'pt-0.5 text-xl' : 'pt-1 text-3xl')}>{data.slice(8, 10)}</div>
      <div className="pb-1 text-[11px] text-slate-500">{data.slice(0, 4)}</div>
    </div>
  );
}

/** Recordatori que toca ara: amb «Fet» i «Recorda-m'ho en 3 dies». */
export function RecordatoriTarja({
  r,
  avui,
  canWrite,
  onCanvi,
}: {
  r: RecordatoriVista;
  avui: string;
  canWrite: boolean;
  onCanvi?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'FET' | 'AJORNA' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dies = diesEntre(avui, r.data);
  const vencut = dies < 0;

  async function accio(a: 'FET' | 'AJORNA') {
    setBusy(a);
    setErr(null);
    try {
      await patchJSON(`/api/recordatoris/${r.id}`, a === 'FET' ? { accio: 'FET' } : { accio: 'AJORNA', dies: 3 });
      onCanvi?.();
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut desar');
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_28px_rgba(60,30,20,0.07)] sm:gap-5 sm:p-5">
      <DataTile data={r.data} vencut={vencut} />
      <div className="min-w-0 flex-[1_1_16rem] space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
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
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-900">{r.titol}</h3>
        {r.notes && <p className="text-sm text-slate-600">{r.notes}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => accio('FET')}
            disabled={busy !== null}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> {busy === 'FET' ? 'Desant…' : 'Fet'}
          </button>
          <button
            type="button"
            onClick={() => accio('AJORNA')}
            disabled={busy !== null}
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            <Clock className="h-4 w-4" /> {busy === 'AJORNA' ? 'Desant…' : 'Recorda-m’ho en 3 dies'}
          </button>
        </div>
      )}
    </article>
  );
}
