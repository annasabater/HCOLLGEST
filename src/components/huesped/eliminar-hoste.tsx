'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { delJSON, ApiError } from '@/lib/api';

export function EliminarHoste({ id, nom, visites }: { id: string; nom: string; visites: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function eliminar() {
    const avis =
      visites > 0
        ? `\n\nTé ${visites} ${visites === 1 ? 'estada registrada' : 'estades registrades'}: es CONSERVEN al llibre de registre (requisit legal), però l'hoste deixarà d'aparèixer a la llista d'Hostes.`
        : '';
    if (!confirm(`Eliminar l'hoste «${nom}»?${avis}`)) return;
    setBusy(true);
    try {
      await delJSON(`/api/huespedes/${id}`);
      router.push('/huespedes');
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s’ha pogut eliminar l’hoste');
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={eliminar} disabled={busy} title="Eliminar hoste">
      <Trash2 className="h-4 w-4 text-red-600" /> Eliminar
    </Button>
  );
}
