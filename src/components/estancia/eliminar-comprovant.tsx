'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { delJSON, ApiError } from '@/lib/api';

/**
 * Elimina un comprovant/justificant de Mossos creat per error. NO toca l'estada:
 * aquesta torna a quedar com a pendent de comunicar.
 */
export function EliminarComprovant({ id, fitxerNom }: { id: string; fitxerNom: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function eliminar() {
    const msg =
      `Eliminar el comprovant "${fitxerNom}"?\n\n` +
      `Només s'elimina aquest justificant de comunicació a Mossos. ` +
      `L'estada NO es toca i tornarà a quedar com a pendent de comunicar.\n\n` +
      `⚠ Si ja l'havies pujat al portal de Mossos, eliminar-lo aquí no el retira del portal.`;
    if (!confirm(msg)) return;

    setBusy(true);
    try {
      await delJSON(`/api/enviaments/${id}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s’ha pogut eliminar el comprovant');
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={eliminar}
      disabled={busy}
      title="Eliminar comprovant"
    >
      <Trash2 className="h-4 w-4 text-red-600" />
    </Button>
  );
}
