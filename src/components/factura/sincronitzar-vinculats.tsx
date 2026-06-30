'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { patchJSON, ApiError } from '@/lib/api';
import { formatEur } from '@/lib/utils';

export interface VinculatItem {
  id: string;
  import: number;
  label: string;
}

/**
 * En editar l'import d'una factura, si tenia pagaments o fiances vinculats,
 * pregunta si vols actualitzar també el seu import perquè quadri. Cada element
 * mostra el seu import actual i un camp editable; només s'actualitzen els que
 * canviïn. Els pagaments es preomplen amb el nou total (cas d'un sol pagament).
 */
export function SincronitzarVinculats({
  nouTotal,
  payments,
  fiances,
  onClose,
}: {
  nouTotal: number;
  payments: VinculatItem[];
  fiances: VinculatItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Valor inicial de cada camp: un sol pagament → el nou total; la resta, l'actual.
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    payments.forEach((p) => {
      m[p.id] = String(payments.length === 1 ? nouTotal : p.import);
    });
    fiances.forEach((f) => { m[f.id] = String(f.import); });
    return m;
  });

  useEffect(() => {
    const el = dialogRef.current;
    if (el && !el.open) el.showModal();
  }, []);

  function tancar() {
    onClose();
    router.refresh();
  }

  async function actualitzar() {
    setSaving(true);
    setError(null);
    try {
      for (const p of payments) {
        const nou = Number(vals[p.id]);
        if (Number.isFinite(nou) && nou > 0 && nou !== p.import) {
          await patchJSON(`/api/cobraments/${p.id}`, { import: nou });
        }
      }
      for (const f of fiances) {
        const nou = Number(vals[f.id]);
        if (Number.isFinite(nou) && nou > 0 && nou !== f.import) {
          await patchJSON(`/api/diposits/${f.id}`, { import: nou });
        }
      }
      tancar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut actualitzar');
      setSaving(false);
    }
  }

  const row = (item: VinculatItem, tipus: 'Pagament' | 'Fiança') => (
    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">{tipus} · {item.label}</p>
        <p className="text-xs text-slate-400">Actual: {formatEur(item.import)}</p>
      </div>
      <div className="w-28">
        <Input
          type="number"
          step="0.01"
          min="0"
          className="h-9 w-full"
          value={vals[item.id] ?? ''}
          onChange={(e) => setVals((v) => ({ ...v, [item.id]: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <dialog
      ref={dialogRef}
      style={{ width: '100%', maxWidth: '30rem', maxHeight: '85vh' }}
      className="m-auto box-border overflow-x-hidden overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-900/50"
      onCancel={tancar}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Actualitzar imports vinculats?</h2>
          <button onClick={tancar} className="shrink-0 text-slate-400 hover:text-slate-600" aria-label="Tancar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Has canviat el total de la factura a <strong>{formatEur(nouTotal)}</strong>. Aquests imports
          estaven vinculats; pots actualitzar-los perquè quadrin o deixar-los com estan.
        </p>

        <div className="mt-4 space-y-2">
          {payments.map((p) => row(p, 'Pagament'))}
          {fiances.map((f) => row(f, 'Fiança'))}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={tancar} disabled={saving}>
            No, deixar-ho així
          </Button>
          <Button type="button" size="sm" onClick={actualitzar} disabled={saving}>
            <RefreshCw className="h-4 w-4" />
            {saving ? 'Actualitzant…' : 'Actualitzar imports'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
