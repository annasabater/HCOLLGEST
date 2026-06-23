'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Undo2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import { optionsFrom, metodeCobramentValues, METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';

interface Diposit {
  id: string;
  import: number;
  data: string;
  metode: keyof typeof METODE_COBRAMENT_LABELS;
  estat: 'EN_CUSTODIA' | 'TORNAT' | 'RETINGUT';
  motiu: string | null;
}

const ESTAT_LABEL: Record<Diposit['estat'], string> = {
  EN_CUSTODIA: 'En custòdia',
  TORNAT: 'Tornat',
  RETINGUT: 'Retingut (ingrés)',
};

export function DipositsPanel({ estanciaId, diposits }: { estanciaId: string; diposits: Diposit[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [importVal, setImport] = useState('');
  const [metode, setMetode] = useState('EFECTIU');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Edició d'un dipòsit en custòdia.
  const [editId, setEditId] = useState<string | null>(null);
  const [editImport, setEditImport] = useState('');
  const [editMetode, setEditMetode] = useState('EFECTIU');
  const [editNotes, setEditNotes] = useState('');

  function startEdit(d: Diposit) {
    setEditId(d.id);
    setEditImport(String(d.import));
    setEditMetode(d.metode);
    setEditNotes('');
    setError(null);
  }

  async function saveEdit(id: string) {
    setBusy(true);
    setError(null);
    try {
      await patchJSON(`/api/diposits/${id}`, {
        import: Number(editImport),
        metode: editMetode,
        notes: editNotes || undefined,
      });
      setEditId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error editant');
    } finally {
      setBusy(false);
    }
  }

  async function eliminar(id: string) {
    if (!confirm('Eliminar aquest dipòsit definitivament?')) return;
    try {
      await delJSON(`/api/diposits/${id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'No s’ha pogut eliminar');
    }
  }

  const custodia = diposits.filter((d) => d.estat === 'EN_CUSTODIA').reduce((a, d) => a + d.import, 0);
  const retingut = diposits.filter((d) => d.estat === 'RETINGUT').reduce((a, d) => a + d.import, 0);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!importVal) return;
    setBusy(true);
    setError(null);
    try {
      await postJSON(`/api/estancies/${estanciaId}/diposits`, {
        import: Number(importVal),
        metode,
        notes: notes || undefined,
      });
      setImport('');
      setNotes('');
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function resoldre(id: string, estat: 'TORNAT' | 'RETINGUT' | 'EN_CUSTODIA') {
    const motiu = estat === 'RETINGUT' ? window.prompt('Motiu de la retenció (opcional):') ?? undefined : undefined;
    await patchJSON(`/api/diposits/${id}`, { estat, motiu });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Només per a <strong>fiances de garantia retornables</strong> (no són ingrés fins que es
        retenen). Si són diners que <strong>cobres</strong> (p. ex. un pagament per avançat d’una
        reserva), registra’ls com a <strong>cobrament</strong>, no aquí.
      </p>
      <div className="flex flex-wrap gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span>
          En custòdia: <strong>{formatEur(custodia)}</strong>
        </span>
        {retingut > 0 && (
          <>
            <span className="text-slate-400">·</span>
            <span className="text-green-700">Retingut (ingrés): {formatEur(retingut)}</span>
          </>
        )}
      </div>

      {diposits.length === 0 && !open && (
        <p className="text-sm text-slate-400">Sense dipòsits.</p>
      )}
      {diposits.map((d) => (
        <div key={d.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">
              {formatEur(d.import)}{' '}
              <span className="text-slate-400">· {METODE_COBRAMENT_LABELS[d.metode]} · {formatDate(d.data)}</span>
            </span>
            <Badge
              tone={d.estat === 'TORNAT' ? 'neutral' : 'success'}
            >
              {ESTAT_LABEL[d.estat]}
            </Badge>
          </div>
          {d.motiu && <p className="mt-1 text-xs text-slate-500">{d.motiu}</p>}
          {editId === d.id ? (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" step="0.01" placeholder="Import €" value={editImport} onChange={(e) => setEditImport(e.target.value)} />
                <Select value={editMetode} onChange={(e) => setEditMetode(e.target.value)}>
                  {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Input placeholder="Notes (opcional)" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={busy || !editImport} onClick={() => saveEdit(d.id)}>
                  Desar canvis
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditId(null)}>
                  Cancel·lar
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(d)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              {d.estat !== 'EN_CUSTODIA' && (
                <Button type="button" size="sm" variant="outline" onClick={() => resoldre(d.id, 'EN_CUSTODIA')}>
                  <Undo2 className="h-4 w-4" /> Tornar a custòdia
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={() => eliminar(d.id)} title="Eliminar">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
        </div>
      ))}

      {open ? (
        <form onSubmit={crear} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" step="0.01" placeholder="Import €" value={importVal} onChange={(e) => setImport(e.target.value)} />
            <Select value={metode} onChange={(e) => setMetode(e.target.value)}>
              {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <Input placeholder="Notes (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy || !importVal}>
              Desar dipòsit
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel·lar
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nou dipòsit / fiança
        </Button>
      )}
    </div>
  );
}
