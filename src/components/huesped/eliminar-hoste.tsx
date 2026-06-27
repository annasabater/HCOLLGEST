'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { delJSON, ApiError } from '@/lib/api';

export function EliminarHoste({ id, nom, visites }: { id: string; nom: string; visites: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [obert, setObert] = useState(false);

  const avis =
    visites > 0
      ? ` Té ${visites} ${visites === 1 ? 'estada registrada' : 'estades registrades'} que es conserven al llibre de registre (requisit legal), però l'hoste deixarà d'aparèixer a la llista.`
      : '';

  async function confirmar() {
    setObert(false);
    setBusy(true);
    try {
      await delJSON(`/api/huespedes/${id}`);
      router.push('/huespedes');
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s\'ha pogut eliminar l\'hoste');
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setObert(true)} disabled={busy} title="Eliminar hoste">
        <Trash2 className="h-4 w-4 text-red-600" /> Eliminar
      </Button>
      <ConfirmDialog
        open={obert}
        title={`Eliminar l'hoste «${nom}»?`}
        message={`Desapareixerà de la llista d'hostes.${avis} Les dades queden a l'històric d'auditoria.`}
        onConfirm={confirmar}
        onCancel={() => setObert(false)}
      />
    </>
  );
}
