'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X } from 'lucide-react';
import { patchJSON, ApiError } from '@/lib/api';

export function EditarNumeroFactura({
  facturaId,
  numero,
}: {
  facturaId: string;
  numero: string;
}) {
  const router = useRouter();
  // Es mostra i s'edita només la part seqüencial; l'any es manté internament.
  const any = numero.match(/^(\d{4})-/)?.[1] ?? String(new Date().getFullYear());
  const seqActual = numero.replace(/^\d{4}-/, '');
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(seqActual);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function desar() {
    if (value.trim() === seqActual || !value.trim()) { setEditing(false); return; }
    setSaving(true);
    setError(null);
    try {
      await patchJSON(`/api/factures/${facturaId}`, { numero: `${any}-${value.trim()}` });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error en desar');
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setValue(seqActual);
    setEditing(false);
    setError(null);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-serif font-semibold text-slate-900">
          Factura {seqActual}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-slate-400 hover:text-brand-600"
          title="Editar número"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-serif font-semibold text-slate-400">Factura</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') desar(); if (e.key === 'Escape') cancel(); }}
          className="w-36 rounded-lg border border-brand-300 px-2 py-1 text-xl font-serif font-semibold focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <button
          type="button"
          onClick={desar}
          disabled={saving}
          className="rounded-lg bg-brand-700 p-1.5 text-white hover:bg-brand-800 disabled:opacity-50"
          title="Desar"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          title="Cancel·lar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
