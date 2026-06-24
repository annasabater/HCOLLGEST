'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import {
  METODE_COBRAMENT_LABELS,
  metodeCobramentValues,
  optionsFrom,
} from '@/lib/validation/enums';

type Cobrament = { id: string; metode: string; import: number; data: string | Date };

const metodes = optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS);

/**
 * Llista de cobraments d'una factura amb edició/eliminació per fila. Editar o
 * eliminar un cobrament recalcula l'estat de la factura al servidor (pot tornar
 * a Pendent). Una devolució (import negatiu) es mostra com a tal i conserva el
 * signe en editar-la.
 */
export function CobramentsList({ cobraments }: { cobraments: Cobrament[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [metode, setMetode] = useState('EFECTIU');
  const [importVal, setImportVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function obrir(c: Cobrament) {
    setEditId(c.id);
    setMetode(c.metode);
    setImportVal(String(Math.abs(c.import)));
    setError(null);
  }

  async function desar(id: string) {
    setBusy(true);
    setError(null);
    try {
      await patchJSON(`/api/cobraments/${id}`, { metode, import: Number(importVal) });
      setEditId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut desar el cobrament');
    } finally {
      setBusy(false);
    }
  }

  async function eliminar(c: Cobrament) {
    const quant = formatEur(c.import);
    if (!confirm(`Eliminar aquest cobrament de ${quant}?\n\nL'estat de la factura es recalcularà.`))
      return;
    setBusy(true);
    setError(null);
    try {
      await delJSON(`/api/cobraments/${c.id}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s’ha pogut eliminar el cobrament');
    } finally {
      setBusy(false);
    }
  }

  if (cobraments.length === 0) return null;

  return (
    <ul className="space-y-1 border-t border-slate-100 pt-2 text-sm">
      {cobraments.map((c) => {
        const esDevolucio = c.import < 0;
        if (editId === c.id) {
          return (
            <li key={c.id} className="space-y-2 rounded-lg bg-slate-50 p-2">
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Mètode</label>
                  <Select
                    className="h-9 w-36"
                    value={metode}
                    onChange={(e) => setMetode(e.target.value)}
                  >
                    {metodes.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Import €{esDevolucio && ' (devolució)'}
                  </label>
                  <Input
                    className="h-9 w-28"
                    type="number"
                    step="0.01"
                    min="0"
                    value={importVal}
                    onChange={(e) => setImportVal(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => desar(c.id)}
                  disabled={busy || !importVal}
                  title="Desar"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditId(null)}
                  disabled={busy}
                  title="Cancel·lar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </li>
          );
        }
        return (
          <li key={c.id} className="group flex items-center justify-between gap-2">
            <span className="text-slate-600">
              {esDevolucio && <span className="text-red-600">Devolució · </span>}
              {METODE_COBRAMENT_LABELS[c.metode as keyof typeof METODE_COBRAMENT_LABELS]} ·{' '}
              {formatDate(c.data)}
            </span>
            <span className="flex items-center gap-1">
              <span className={esDevolucio ? 'text-red-600' : ''}>{formatEur(c.import)}</span>
              <button
                type="button"
                onClick={() => obrir(c)}
                disabled={busy}
                title="Editar cobrament"
                className="text-slate-400 opacity-0 transition hover:text-slate-700 group-hover:opacity-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => eliminar(c)}
                disabled={busy}
                title="Eliminar cobrament"
                className="text-slate-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
