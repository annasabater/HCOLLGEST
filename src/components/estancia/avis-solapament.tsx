'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, LogOut, CheckCircle2 } from 'lucide-react';
import { getJSON, postJSON, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Conflicte {
  id: string;
  contracte: string;
  estat: string;
  titular: string;
  dataEntrada: string | null;
  dataSortida: string | null;
}

/**
 * Avís de solapament: si l'habitació triada ja està ocupada en el rang de dates,
 * mostra qui hi ha i ofereix donar per finalitzada anticipadament aquella estada
 * (la sortida queda fixada al dia d'entrada de la nova). Reusa el flux de sortida
 * anticipada (POST .../finalitzar-anticipada).
 */
export function AvisSolapament({
  habitacioId,
  dataEntrada,
  dataSortida,
  exclouEstanciaId,
}: {
  habitacioId: string;
  dataEntrada: string;
  dataSortida: string;
  exclouEstanciaId?: string;
}) {
  const [conflictes, setConflictes] = useState<Conflicte[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const datesValides = !!habitacioId && !!dataEntrada && !!dataSortida && dataSortida > dataEntrada;

  useEffect(() => {
    if (!datesValides) {
      setConflictes([]);
      setChecked(false);
      return;
    }
    let cancel = false;
    setChecked(false);
    const t = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ habitacioId, desde: dataEntrada, fins: dataSortida });
        if (exclouEstanciaId) p.set('exclou', exclouEstanciaId);
        const r = await getJSON<{ conflictes: Conflicte[] }>(`/api/habitacions/conflicte?${p.toString()}`);
        if (!cancel) { setConflictes(r.conflictes); setChecked(true); }
      } catch {
        if (!cancel) { setConflictes([]); setChecked(false); }
      }
    }, 350);
    return () => { cancel = true; clearTimeout(t); };
  }, [datesValides, habitacioId, dataEntrada, dataSortida, exclouEstanciaId]);

  async function finalitzar(c: Conflicte) {
    setBusyId(c.id);
    setError(null);
    try {
      // La sortida de l'estada en conflicte queda fixada al dia d'entrada de la nova.
      await postJSON(`/api/estancies/${c.id}/finalitzar-anticipada`, {
        dataSortida: dataEntrada,
        retorn: false,
      });
      setConflictes((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error finalitzant l’estada');
    } finally {
      setBusyId(null);
    }
  }

  if (!datesValides) return null;

  // Cap solapament i ja s'ha comprovat → l'habitació és lliure en aquest rang.
  if (checked && conflictes.length === 0) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Habitació lliure en aquestes dates
      </div>
    );
  }
  if (conflictes.length === 0) return null;

  // "Reservada" si totes les estades en conflicte són reserves; si no, "ocupada".
  const totReserves = conflictes.every((c) => c.estat === 'RESERVA');

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-red-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {totReserves
          ? 'Aquesta habitació ja està reservada en aquestes dates'
          : 'Aquesta habitació ja està ocupada en aquestes dates'}
      </p>
      {conflictes.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm">
          <span className="text-slate-700">
            <span
              className={`mr-1.5 rounded px-1.5 py-0.5 text-xs font-medium ${
                c.estat === 'RESERVA' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {c.estat === 'RESERVA' ? 'Reservada' : 'Ocupada'}
            </span>
            <strong>{c.titular}</strong>{' '}
            <span className="text-slate-400">
              (contracte {c.contracte} · {c.dataEntrada ? formatDate(c.dataEntrada) : '—'} – {c.dataSortida ? formatDate(c.dataSortida) : '—'})
            </span>
          </span>
          <button
            type="button"
            disabled={busyId === c.id}
            onClick={() => finalitzar(c)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
            title={`Donar per finalitzada l'estada de ${c.titular} el ${formatDate(dataEntrada)}`}
          >
            <LogOut className="h-3.5 w-3.5" />
            {busyId === c.id ? 'Finalitzant…' : `Finalitzar el ${formatDate(dataEntrada)}`}
          </button>
        </div>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-red-600">
        Si l’hoste anterior ja ha marxat, dóna per finalitzada la seva estada i així podràs assignar
        l’habitació. Si no, tria una altra habitació o altres dates.
      </p>
    </div>
  );
}
