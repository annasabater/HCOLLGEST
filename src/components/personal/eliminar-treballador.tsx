'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { delJSON, ApiError } from '@/lib/api';

export function EliminarTreballador({ id, nom }: { id: string; nom: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function eliminar() {
    if (
      !confirm(
        `Eliminar el treballador «${nom}»?\n\nEs conservaran les jornades i nòmines històriques, però deixarà d'aparèixer a la llista.`,
      )
    )
      return;
    setBusy(true);
    try {
      await delJSON(`/api/treballadors/${id}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s’ha pogut eliminar el treballador');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={eliminar} disabled={busy} title="Eliminar">
      <Trash2 className="h-4 w-4 text-red-600" />
    </Button>
  );
}
