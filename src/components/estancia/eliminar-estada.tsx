'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { delJSON, ApiError } from '@/lib/api';

export function EliminarEstada({
  id,
  contracte,
  comunicada = false,
  nFactures = 0,
  redirectTo = '/estancies',
  iconOnly = false,
  onDeleted,
}: {
  id: string;
  contracte: string;
  comunicada?: boolean;
  nFactures?: number;
  redirectTo?: string | null;
  iconOnly?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [obert, setObert] = useState(false);

  let msg = `L'estada ${contracte} desapareixerà del llibre de registre, de les llistes i de la comptabilitat.`;
  if (nFactures > 0) {
    msg += ` S'eliminaran també ${nFactures} ${nFactures === 1 ? 'factura/rebut' : 'factures/rebuts'} i els seus cobraments.`;
  }
  if (comunicada) {
    msg += ` ⚠ ATENCIÓ: ja s'ha comunicat a Mossos. Eliminar-la aquí NO la retira del portal.`;
  }
  msg += ' Les dades queden a l\'històric d\'auditoria.';

  async function confirmar() {
    setObert(false);
    setBusy(true);
    try {
      await delJSON(`/api/estancies/${id}`);
      if (onDeleted) onDeleted();
      else if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s\'ha pogut eliminar l\'estada');
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={iconOnly ? 'ghost' : 'outline'}
        size="sm"
        onClick={() => setObert(true)}
        disabled={busy}
        title="Eliminar estada"
      >
        <Trash2 className="h-4 w-4 text-red-600" />
        {!iconOnly && ' Eliminar'}
      </Button>
      <ConfirmDialog
        open={obert}
        title={`Eliminar l'estada ${contracte}?`}
        message={msg}
        onConfirm={confirmar}
        onCancel={() => setObert(false)}
      />
    </>
  );
}
