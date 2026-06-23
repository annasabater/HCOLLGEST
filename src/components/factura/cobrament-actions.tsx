'use client';

import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CobramentForm } from './cobrament-form';

/**
 * Accions de cobrament d'una factura: registrar cobrament (si encara no està
 * cobrada del tot) i registrar una devolució / reemborsament (p. ex. una
 * reserva cancel·lada que tornes). La devolució resta de l'ingrés.
 */
export function CobramentActions({
  facturaId,
  pendent,
  cobrat,
  estat,
}: {
  facturaId: string;
  pendent: number;
  cobrat: number;
  estat: 'PENDENT' | 'COBRADA';
}) {
  const [devolucio, setDevolucio] = useState(false);

  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      {estat !== 'COBRADA' && <CobramentForm facturaId={facturaId} defaultImport={pendent} />}

      {devolucio ? (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">
            Devolució (p. ex. reserva cancel·lada que tornes). Es restarà de l’ingrés.
          </p>
          <CobramentForm
            facturaId={facturaId}
            defaultImport={cobrat > 0 ? cobrat : 0}
            tipus="DEVOLUCIO"
            buttonLabel="Registrar devolució"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => setDevolucio(false)}>
            Cancel·lar
          </Button>
        </div>
      ) : (
        cobrat > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setDevolucio(true)}>
            <Undo2 className="h-4 w-4" /> Registrar devolució
          </Button>
        )
      )}
    </div>
  );
}
