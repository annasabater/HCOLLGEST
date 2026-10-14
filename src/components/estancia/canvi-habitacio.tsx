'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { AvisSolapament } from '@/components/estancia/avis-solapament';
import { postJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toISODate, addDays } from '@/lib/dates';

/**
 * Canvi d'habitació a mitja estada (mateix contracte): a partir del dia triat
 * l'hoste dorm a la nova. L'habitació d'abans queda lliure des d'aquell dia i la
 * nova no compta com a ocupada abans, així no xoca amb qui hi havia abans.
 */
export function CanviHabitacio({
  estanciaId,
  dataEntrada,
  dataSortida,
  habitacions,
  actualHabitacioId,
}: {
  estanciaId: string;
  dataEntrada: string; // ISO YYYY-MM-DD
  dataSortida: string; // ISO YYYY-MM-DD
  habitacions: { id: string; nom: string }[];
  actualHabitacioId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const minData = toISODate(addDays(new Date(`${dataEntrada}T00:00:00`), 1));
  const maxData = toISODate(addDays(new Date(`${dataSortida}T00:00:00`), -1));
  const avui = toISODate(new Date());
  const [data, setData] = useState(avui < minData ? minData : avui > maxData ? maxData : avui);
  const [habitacioId, setHabitacioId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function desa(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/estancies/${estanciaId}/canvi-habitacio`, { habitacioId, data });
      setOpen(false);
      setHabitacioId('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error canviant d’habitació');
    } finally {
      setSaving(false);
    }
  }

  if (minData > maxData) return null; // estada d'una sola nit: no hi ha canvi possible

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowRightLeft className="h-4 w-4" /> Canviar d’habitació
      </Button>
    );
  }

  return (
    <form onSubmit={desa} className="w-full space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Dorm a la nova des del">
          <Input type="date" value={data} min={minData} max={maxData} onChange={(e) => setData(e.target.value)} />
        </Field>
        <Field label="Nova habitació">
          <Select value={habitacioId} onChange={(e) => setHabitacioId(e.target.value)}>
            <option value="">—</option>
            {habitacions
              .filter((h) => h.id !== actualHabitacioId)
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nom}
                </option>
              ))}
          </Select>
        </Field>
        <Button type="submit" size="sm" disabled={saving || !habitacioId || !data}>
          {saving ? 'Desant…' : 'Canviar'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel·lar
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Mateix contracte: fins al {data ? formatDate(data) : '…'} compta a l’habitació actual i, a partir
        d’aquell dia, a la nova (fins a la sortida, {formatDate(dataSortida)}).
      </p>
      {habitacioId && data && (
        <AvisSolapament
          habitacioId={habitacioId}
          dataEntrada={data}
          dataSortida={dataSortida}
          exclouEstanciaId={estanciaId}
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

/** Historial de canvis d'habitació, amb opció de desfer l'últim. */
export function HistorialHabitacio({
  estanciaId,
  trams,
  ultimCanviId,
  canWrite,
}: {
  estanciaId: string;
  trams: { habitacio: string; desde: string | null; fins: string | null }[];
  ultimCanviId: string | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function desfer() {
    if (!ultimCanviId || !confirm('Desfer l’últim canvi d’habitació?')) return;
    setBusy(true);
    setError(null);
    try {
      await delJSON(`/api/estancies/${estanciaId}/canvi-habitacio/${ultimCanviId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desfent el canvi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-0.5">
      {trams.map((t, i) => (
        <div key={i} className={i === trams.length - 1 ? 'font-medium' : 'text-slate-500'}>
          {t.habitacio}{' '}
          <span className="text-xs text-slate-400">
            ({formatDate(t.desde)} – {formatDate(t.fins)})
          </span>
        </div>
      ))}
      {canWrite && ultimCanviId && (
        <button
          type="button"
          onClick={desfer}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700 disabled:opacity-40"
        >
          <Undo2 className="h-3 w-3" /> {busy ? 'Desfent…' : 'Desfer l’últim canvi'}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
