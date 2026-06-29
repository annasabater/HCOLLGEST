'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { delJSON, ApiError } from '@/lib/api';

export function EliminarFactura({
  id,
  numero,
  redirectTo,
  teVerifactu = false,
}: {
  id: string;
  numero: string;
  redirectTo: string;
  teVerifactu?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [obert, setObert] = useState(false);

  let msg = `La factura ${numero} sortirà de la comptabilitat (els seus cobraments deixaran de comptar com a ingrés).`;
  if (teVerifactu) {
    msg += ' ⚠ Té registre Veri*Factu (fiscal). Eliminar-la aquí NO anul·la el registre davant l\'AEAT.';
  }
  msg += ' Les dades queden a l\'històric d\'auditoria.';

  async function confirmar() {
    setObert(false);
    setBusy(true);
    try {
      await delJSON(`/api/factures/${id}`);
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s\'ha pogut eliminar la factura');
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setObert(true)} disabled={busy} title="Eliminar factura">
        <Trash2 className="h-4 w-4 text-red-600" /> Eliminar factura
      </Button>
      <ConfirmDialog
        open={obert}
        title={`Eliminar la factura ${numero}?`}
        message={msg}
        onConfirm={confirmar}
        onCancel={() => setObert(false)}
      />
    </>
  );
}
