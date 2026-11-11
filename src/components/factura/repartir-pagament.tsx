'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, getJSON, putJSON } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';

interface Periode {
  dataInici: string;
  dataFi: string;
  import: number;
}

interface Fila {
  dataInici: string;
  dataFi: string;
  import: string;
  nits?: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Repartir per mesos un pagament JA FET (també si ja és en una factura): el
 * Balanç comptarà cada part en el seu mes. La factura no canvia.
 *  - `multiMes`: l'estada ocupa més d'un mes → si no està repartit, es mostra l'avís.
 */
export function RepartirPagament({
  cobramentId,
  importTotal,
  periodes,
  multiMes,
}: {
  cobramentId: string;
  importTotal: number;
  periodes?: Periode[];
  multiMes: boolean;
}) {
  const router = useRouter();
  const [obert, setObert] = useState(false);
  const [files, setFiles] = useState<Fila[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState<string | null>(null);
  const repartit = (periodes?.length ?? 0) > 0;

  if (importTotal <= 0) return null;

  const suma = r2(files.reduce((a, f) => a + (Number(f.import.replace(',', '.')) || 0), 0));
  const quadra = Math.abs(suma - r2(importTotal)) <= 0.01;
  const falta = r2(importTotal - suma);

  async function obre() {
    setObert(true);
    setError(null);
    setNota(null);
    if (repartit && periodes) {
      setFiles(periodes.map((p) => ({ dataInici: p.dataInici.slice(0, 10), dataFi: p.dataFi.slice(0, 10), import: p.import.toFixed(2) })));
      return;
    }
    await proposa();
  }

  async function proposa() {
    setBusy(true);
    setError(null);
    try {
      const r = await getJSON<{
        ok: boolean;
        error?: string;
        periodes: { dataInici: string; dataFi: string; nits: number; import: number }[];
      }>(`/api/cobraments/${cobramentId}/periodes`);
      if (!r.ok || r.periodes.length === 0) {
        setError(r.error ?? 'No s’ha pogut proposar el repartiment.');
        setFiles([{ dataInici: '', dataFi: '', import: importTotal.toFixed(2) }]);
        return;
      }
      setFiles(r.periodes.map((p) => ({ dataInici: p.dataInici, dataFi: p.dataFi, import: p.import.toFixed(2), nits: p.nits })));
      setNota('Proposat automàticament segons les nits de cada mes. Pots canviar els imports.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut proposar el repartiment.');
    } finally {
      setBusy(false);
    }
  }

  async function desa(llista: Fila[]) {
    setBusy(true);
    setError(null);
    try {
      await putJSON(`/api/cobraments/${cobramentId}/periodes`, {
        periodes: llista.map((f) => ({ dataInici: f.dataInici, dataFi: f.dataFi, import: Number(f.import.replace(',', '.')) })),
      });
      setObert(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut desar.');
    } finally {
      setBusy(false);
    }
  }

  const canvia = (i: number, patch: Partial<Fila>) => setFiles((f) => f.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  // ── Tancat ────────────────────────────────────────────────────────────────
  if (!obert) {
    if (repartit) {
      return (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-green-700">
            <Check className="h-3.5 w-3.5" /> Repartit:
          </span>
          <span className="text-slate-600">
            {periodes!
              .map((p) => `${formatDate(p.dataInici).replace(/\/\d{4}$/, '')} – ${formatDate(p.dataFi).replace(/\/\d{4}$/, '')}: ${formatEur(p.import)}`)
              .join(' · ')}
          </span>
          <button type="button" onClick={obre} className="font-semibold text-brand-700 underline">
            Canviar
          </button>
        </div>
      );
    }
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {multiMes && (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
            L’estada ocupa més d’un mes, però aquest pagament compta tot el dia que es va cobrar.
          </span>
        )}
        <Button type="button" size="sm" variant="outline" onClick={obre} className="h-9 sm:h-8">
          <CalendarRange className="h-4 w-4" /> Repartir per mesos
        </Button>
      </div>
    );
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  return (
    <div className="mt-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">Repartir {formatEur(importTotal)} per mesos</p>
        {nota && <p className="text-xs text-slate-500">{nota}</p>}
      </div>

      <div className="space-y-2">
        {files.map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <Input
              type="date"
              value={f.dataInici}
              onChange={(e) => canvia(i, { dataInici: e.target.value })}
              className="w-[9.5rem]"
              aria-label="Primer dia del període"
            />
            <span className="text-xs text-slate-400">a</span>
            <Input
              type="date"
              value={f.dataFi}
              onChange={(e) => canvia(i, { dataFi: e.target.value })}
              className="w-[9.5rem]"
              aria-label="Últim dia del període"
            />
            <div className="flex items-center gap-1">
              <Input
                inputMode="decimal"
                value={f.import}
                onChange={(e) => canvia(i, { import: e.target.value })}
                className="w-28 text-right"
                aria-label="Import del període"
              />
              <span className="text-xs text-slate-500">€</span>
            </div>
            {f.nits != null && <span className="text-xs text-slate-400">{f.nits} nits</span>}
            <button
              type="button"
              onClick={() => setFiles((x) => x.filter((_, k) => k !== i))}
              className="p-2 text-slate-400 hover:text-red-600"
              aria-label="Treure aquest període"
              title="Treure aquest període"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setFiles((x) => [...x, { dataInici: '', dataFi: '', import: '' }])}
          >
            <Plus className="h-4 w-4" /> Afegir període
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={proposa} disabled={busy}>
            <CalendarRange className="h-4 w-4" /> Torna a proposar
          </Button>
        </div>
        <span className={`text-xs font-semibold ${quadra ? 'text-green-700' : 'text-red-700'}`}>
          {quadra
            ? `Total ${formatEur(suma)} · quadra amb el pagament`
            : `Total ${formatEur(suma)} · ${falta > 0 ? `falten ${formatEur(falta)}` : `sobren ${formatEur(-falta)}`}`}
        </span>
      </div>

      <p className="rounded-md border border-dashed border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600">
        <strong>La factura no canvia</strong> (mateix número, data i import). Només canvia en quin mes compta l’ingrés al
        Balanç.
      </p>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {repartit && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mr-auto text-slate-500"
            disabled={busy}
            onClick={() => void desa([])}
          >
            Treure el repartiment
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => setObert(false)} disabled={busy}>
          Cancel·la
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy || !quadra || files.length === 0 || files.some((f) => !f.dataInici || !f.dataFi)}
          onClick={() => void desa(files)}
        >
          {busy ? 'Desant…' : 'Desa el repartiment'}
        </Button>
      </div>
    </div>
  );
}
