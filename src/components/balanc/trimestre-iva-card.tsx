'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getJSON } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Eur } from '@/components/finances/amounts-visibility';

interface Desat { periode: string; etiqueta: string; totalTotal: number; updatedAt: string }

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

/**
 * Llibre d'IVA (ingressos) en una sola fila: l'any, els 4 trimestres (✓ si ja està
 * desat; les dates, en passar-hi el ratolí), el total del triat i l'enllaç per obrir
 * el llibre imprimible i EDITABLE. De moment només ingressos.
 */
export function TrimestreIvaCard({ className }: { className?: string }) {
  const avui = new Date();
  const anyActual = avui.getFullYear();
  const trimActual = Math.floor(avui.getMonth() / 3) + 1;
  const [any, setAny] = useState(anyActual);
  const [trim, setTrim] = useState(trimActual);
  const [desats, setDesats] = useState<Desat[]>([]);

  useEffect(() => {
    getJSON<{ desats: Desat[] }>('/api/llibre-iva').then((r) => setDesats(r.desats)).catch(() => {});
  }, []);

  const desat = (t: number) => desats.find((d) => d.periode === `${any}-${t}`);
  const esFutur = (t: number) => any > anyActual || (any === anyActual && t > trimActual);
  const enCurs = (t: number) => any === anyActual && t === trimActual;

  function canviaAny(nou: number) {
    setAny(nou);
    setTrim(nou === anyActual ? trimActual : 4);
  }

  const triat = desat(trim);

  return (
    <div className={cn('ui-card flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm', className)}>
      <span className="ui-card-title text-xs font-bold uppercase tracking-wider text-brand-700">Llibre d&apos;IVA</span>
      <span className="flex items-center font-bold tabular-nums text-slate-900">
        <button type="button" aria-label="Any anterior" onClick={() => canviaAny(any - 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-brand-700">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {any}
        <button type="button" aria-label="Any següent" disabled={any >= anyActual} onClick={() => canviaAny(any + 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </span>

      <div role="group" aria-label="Trimestre" className="flex h-10 gap-[3px] rounded-lg border border-slate-300 bg-white p-[3px]">
        {[1, 2, 3, 4].map((t) => {
          const d = desat(t);
          const actiu = t === trim;
          const futur = esFutur(t);
          const ini = new Date(any, (t - 1) * 3, 1);
          const fiT = enCurs(t) ? avui : new Date(any, t * 3, 0);
          return (
            <button
              key={t}
              type="button"
              disabled={futur}
              aria-pressed={actiu}
              onClick={() => setTrim(t)}
              title={`${fmt(ini)} – ${fmt(fiT)}${d ? ` · desat el ${new Date(d.updatedAt).toLocaleDateString('ca-ES')}` : enCurs(t) ? ' · en curs' : ''}`}
              className={cn(
                'flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 text-sm transition-colors',
                actiu ? 'bg-brand-700 font-bold text-white' : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                futur && 'cursor-default text-slate-300 hover:bg-white hover:text-slate-300',
              )}
            >
              {t}T
              {d && <span className={actiu ? 'text-white' : 'text-green-700'}>✓</span>}
            </button>
          );
        })}
      </div>

      {triat ? (
        <Eur value={triat.totalTotal} className="font-bold tabular-nums text-slate-900" />
      ) : (
        <span className="text-xs text-slate-500">{enCurs(trim) ? 'en curs' : 'sense desar'}</span>
      )}

      <a href={`/imprimir/trimestre-ingressos/${any}-${trim}`} target="_blank" rel="noreferrer" className="whitespace-nowrap font-semibold text-brand-700 hover:underline">
        Obrir el llibre →
      </a>
    </div>
  );
}
