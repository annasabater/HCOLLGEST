'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  /** On anar després d'eliminar. `null` = quedar-se i refrescar (p. ex. a la fitxa de l'hoste). */
  redirectTo?: string | null;
  /** Mostra només la icona (per a files de taula). */
  iconOnly?: boolean;
  /** Callback després d'eliminar (p. ex. recarregar una llista de client). */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function eliminar() {
    let msg = `Eliminar l'estada ${contracte}?\n\nDesapareixerà del llibre de registre, de les llistes i de la comptabilitat.`;
    if (nFactures > 0) {
      msg += `\nS'eliminaran també ${nFactures} ${nFactures === 1 ? 'factura/rebut' : 'factures/rebuts'} i els seus cobraments (deixaran de comptar com a ingrés).`;
    }
    if (comunicada) {
      msg += `\n\n⚠ ATENCIÓ: aquesta estada JA s'ha comunicat a Mossos. Eliminar-la aquí NO la retira del portal de Mossos.`;
    }
    msg += `\n\nLes dades queden a l'històric d'auditoria.`;
    if (!confirm(msg)) return;

    setBusy(true);
    try {
      await delJSON(`/api/estancies/${id}`);
      if (onDeleted) onDeleted();
      else if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s’ha pogut eliminar l’estada');
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={iconOnly ? 'ghost' : 'outline'}
      size="sm"
      onClick={eliminar}
      disabled={busy}
      title="Eliminar estada"
    >
      <Trash2 className="h-4 w-4 text-red-600" />
      {!iconOnly && ' Eliminar'}
    </Button>
  );
}
