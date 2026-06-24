'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { patchJSON, ApiError } from '@/lib/api';

// Marca una estada com a completa (treu l'estat "esborrany").
export function TreureEsborrany({ estanciaId }: { estanciaId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function treure() {
    if (
      !confirm(
        'Marcar aquesta estada com a completa (treure esborrany)?\n\nAssegura’t que les dades estan completes; la validació final es fa igualment en generar el fitxer de Mossos.',
      )
    )
      return;
    setBusy(true);
    try {
      await patchJSON(`/api/estancies/${estanciaId}`, { esBorrany: false });
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s’ha pogut treure l’esborrany');
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={treure} disabled={busy}>
      <Check className="h-4 w-4" /> Treure esborrany
    </Button>
  );
}
