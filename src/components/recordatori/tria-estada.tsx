'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { getJSON } from '@/lib/api';
import { nomPropi } from '@/lib/nom-propi';
import { cn } from '@/lib/utils';
import type { EstadaRecordatori } from '@/lib/services/recordatoris';

const dc = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');
export const nomsEstada = (e: EstadaRecordatori, max = 3) => {
  const n = e.noms.map((x) => x.split(' ').map(nomPropi).join(' '));
  return n.length > max ? `${n.slice(0, max).join(' · ')} i ${n.length - max} més` : n.join(' · ') || 'Sense hostes';
};

/** Targeta d'una estada: habitació gran, hostes, contracte i dates. */
export function TargetaEstada({ e, accio }: { e: EstadaRecordatori; accio?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-3 border border-brand-200 bg-brand-50/60 p-3">
      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center bg-brand-700 leading-none text-white">
        <span className="text-[9px] tracking-[0.1em]">HAB.</span>
        <span className="text-lg font-extrabold">{e.habitacio ?? '—'}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900">{nomsEstada(e)}</span>
        <span className="block text-xs text-slate-600">
          {e.contracte ? `Contracte ${e.contracte} · ` : ''}
          {dc(e.entrada)} – {dc(e.sortida)}
        </span>
      </span>
      {accio}
    </span>
  );
}

/**
 * Cercador d'estades (d'ara i futures) per lligar-hi un recordatori: per número
 * d'habitació, número de contracte o nom d'un hoste.
 */
export function TriaEstada({ onTria }: { onTria: (e: EstadaRecordatori) => void }) {
  const [q, setQ] = useState('');
  const [llista, setLlista] = useState<EstadaRecordatori[] | null>(null);

  useEffect(() => {
    let cancel = false;
    const t = setTimeout(() => {
      getJSON<{ estades: EstadaRecordatori[] }>(`/api/recordatoris/estades?q=${encodeURIComponent(q.trim())}`)
        .then((r) => !cancel && setLlista(r.estades))
        .catch(() => !cancel && setLlista([]));
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="space-y-2">
      <label className="flex h-11 items-center gap-2 border border-slate-300 bg-white px-3 text-sm">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          aria-label="Busca l’estada per habitació o nom"
          placeholder="Habitació, nom o contracte…"
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none"
          autoFocus
        />
      </label>
      {llista === null ? (
        <p className="text-xs text-slate-500">Carregant…</p>
      ) : llista.length === 0 ? (
        <p className="text-xs text-slate-500">Cap estada d’ara o futura coincideix.</p>
      ) : (
        <ul className="max-h-60 space-y-1.5 overflow-y-auto">
          {llista.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onTria(e)}
                className={cn('w-full text-left hover:opacity-90')}
              >
                <TargetaEstada e={e} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
