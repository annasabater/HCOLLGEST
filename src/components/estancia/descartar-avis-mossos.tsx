'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { patchJSON } from '@/lib/api';

// Descarta l'avís del termini de Mossos d'una estada (deixa de sortir al tauler).
export function DescartarAvisMossos({ estanciaId }: { estanciaId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function descartar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Descartar l’avís de Mossos d’aquesta estada? Deixarà de sortir al tauler.')) return;
    setBusy(true);
    try {
      await patchJSON(`/api/estancies/${estanciaId}`, { avisMossosParat: true });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={descartar}
      disabled={busy}
      className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
      title="Descartar avís de Mossos"
      aria-label="Descartar avís de Mossos"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
