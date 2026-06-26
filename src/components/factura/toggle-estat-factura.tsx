'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { patchJSON, ApiError } from '@/lib/api';

export function ToggleEstatFactura({
  facturaId,
  estat,
}: {
  facturaId: string;
  estat: 'COBRADA' | 'PENDENT';
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function canviar() {
    setLoading(true);
    setError(null);
    try {
      const nouEstat = estat === 'COBRADA' ? 'PENDENT' : 'COBRADA';
      await patchJSON(`/api/factures/${facturaId}`, { estat: nouEstat });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error en canviar l\'estat');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={canviar}
        disabled={loading}
        className={estat === 'COBRADA'
          ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
          : 'border-green-300 text-green-700 hover:bg-green-50'}
      >
        {estat === 'COBRADA' ? (
          <><Clock className="h-4 w-4" /> Marcar com a pendent</>
        ) : (
          <><CheckCircle className="h-4 w-4" /> Marcar com a cobrada</>
        )}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
