'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export function EliminarValoracio({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function eliminar() {
    if (!confirm('Segur que vols eliminar aquesta valoració? No es pot desfer.')) return;
    setBusy(true);
    try {
      await fetch(`/api/valoracions/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={eliminar}
      disabled={busy}
      className="text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50"
      title="Eliminar valoració"
      aria-label="Eliminar valoració"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
