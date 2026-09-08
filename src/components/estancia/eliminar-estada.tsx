'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { delJSON, getJSON, ApiError } from '@/lib/api';

interface Orfe { id: string; nom: string }

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
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [obert, setObert] = useState(false);
  // Clients que es quedarien sense cap estada si s'elimina aquesta.
  const [orfes, setOrfes] = useState<Orfe[]>([]);
  const [ambHostes, setAmbHostes] = useState(false);

  let msg = `L'estada ${contracte} desapareixerà del llibre de registre, de les llistes i de la comptabilitat.`;
  if (nFactures > 0) {
    msg += ` S'eliminaran també ${nFactures} ${nFactures === 1 ? 'factura/rebut' : 'factures/rebuts'} i els seus cobraments.`;
  }
  if (comunicada) {
    msg += ` ⚠ ATENCIÓ: ja s'ha comunicat a Mossos. Eliminar-la aquí NO la retira del portal.`;
  }
  msg += ' Les dades queden a l\'històric d\'auditoria.';

  // En obrir el diàleg es consulta quins clients quedarien orfes, per poder
  // oferir treure'ls del CRM en la mateixa acció.
  async function obre() {
    setAmbHostes(false);
    setOrfes([]);
    setObert(true);
    const r = await getJSON<{ hostes: Orfe[] }>(`/api/estancies/${id}/hostes-orfes`).catch(() => null);
    if (r) setOrfes(r.hostes);
  }

  async function confirmar() {
    setObert(false);
    setBusy(true);
    const treuHostes = ambHostes && orfes.length > 0;
    try {
      await delJSON(`/api/estancies/${id}${treuHostes ? '?hostes=1' : ''}`);
      // Si s'ha eliminat el client de la fitxa on som, no hi podem tornar.
      const aquiEsborrat = treuHostes && orfes.some((o) => pathname?.startsWith(`/huespedes/${o.id}`));
      if (aquiEsborrat) {
        router.push('/huespedes');
        router.refresh();
        return;
      }
      if (onDeleted) onDeleted();
      else if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s\'ha pogut eliminar l\'estada');
      setBusy(false);
    }
  }

  const noms = orfes.map((o) => o.nom).join(', ');

  return (
    <>
      <Button
        type="button"
        variant={iconOnly ? 'ghost' : 'outline'}
        size="sm"
        onClick={obre}
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
        extra={
          orfes.length > 0 ? (
            <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <input
                type="checkbox"
                checked={ambHostes}
                onChange={(e) => setAmbHostes(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700"
              />
              <span>
                {orfes.length === 1
                  ? `«${noms}» es quedarà sense cap estada.`
                  : `Aquests ${orfes.length} clients es quedaran sense cap estada: ${noms}.`}{' '}
                <strong>Eliminar {orfes.length === 1 ? 'el client' : 'els clients'} també del CRM.</strong>
              </span>
            </label>
          ) : null
        }
      />
    </>
  );
}
