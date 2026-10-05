'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { patchJSON, delJSON, ApiError } from '@/lib/api';
import { estatFacturaLabel } from '@/lib/factura-display';

/** Badge d'estat clicable: alterna Cobrada ↔ Pendent (mostra "Devolta" si el total és negatiu). */
export function EstatFacturaToggle({
  id,
  estat,
  total,
}: {
  id: string;
  estat: 'PENDENT' | 'COBRADA';
  total: number;
}) {
  const router = useRouter();
  async function toggle() {
    try {
      await patchJSON(`/api/factures/${id}`, { estat: estat === 'COBRADA' ? 'PENDENT' : 'COBRADA' });
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No s'ha pogut canviar l'estat");
    }
  }
  return (
    <button type="button" onClick={toggle} title="Canviar entre Cobrada i Pendent" className="cursor-pointer">
      <Badge tone={estat === 'COBRADA' ? 'success' : 'warning'}>{estatFacturaLabel(estat, total)}</Badge>
    </button>
  );
}

/** Paperera per eliminar la factura des de la llista. */
export function EliminarFacturaIcona({ id, numero }: { id: string; numero: string }) {
  const router = useRouter();
  const [obert, setObert] = useState(false);
  async function del() {
    setObert(false);
    try {
      await delJSON(`/api/factures/${id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No s'ha pogut eliminar la factura");
    }
  }
  return (
    <>
      <button type="button" onClick={() => setObert(true)} title="Eliminar factura" className="p-2 touch-manipulation text-slate-400 hover:text-red-600">
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={obert}
        title={`Eliminar la factura ${numero}?`}
        message="Els pagaments tornen a «a compte» de l'estada."
        onConfirm={del}
        onCancel={() => setObert(false)}
      />
    </>
  );
}
