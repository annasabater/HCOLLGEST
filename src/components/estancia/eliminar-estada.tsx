'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { delJSON, getJSON, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface ViatgerCRM {
  id: string;
  nom: string;
  /** Estades visibles que li quedarien si s'elimina aquesta. */
  altresEstades: number;
  /** Data en què ja es va treure del CRM, si és el cas. */
  eliminatEl: string | null;
}

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
  // Situació al CRM de cada client d'aquesta estada.
  const [viatgers, setViatgers] = useState<ViatgerCRM[]>([]);
  const [carregant, setCarregant] = useState(false);
  const [ambHostes, setAmbHostes] = useState(false);

  // Es quedarien sense cap estada i encara són al CRM: són els que s'ofereix eliminar.
  const orfes = viatgers.filter((v) => !v.eliminatEl && v.altresEstades === 0);

  let msg = `L'estada ${contracte} desapareixerà del llibre de registre, de les llistes i de la comptabilitat.`;
  if (nFactures > 0) {
    msg += ` S'eliminaran també ${nFactures} ${nFactures === 1 ? 'factura/rebut' : 'factures/rebuts'} i els seus cobraments.`;
  }
  if (comunicada) {
    msg += ` ⚠ ATENCIÓ: ja s'ha comunicat a Mossos. Eliminar-la aquí NO la retira del portal.`;
  }
  msg += ' Les dades queden a l\'històric d\'auditoria.';

  // En obrir el diàleg es consulta com queda cada client, per dir-ho sempre de
  // manera explícita (i oferir treure del CRM els que quedarien sense estades).
  async function obre() {
    setAmbHostes(false);
    setViatgers([]);
    setCarregant(true);
    setObert(true);
    const r = await getJSON<{ viatgers: ViatgerCRM[] }>(`/api/estancies/${id}/hostes-orfes`).catch(() => null);
    if (r) setViatgers(r.viatgers);
    setCarregant(false);
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

  // Els que NO s'ofereixen per eliminar: es diu igualment què passa amb ells,
  // perquè el silenci no es confongui amb un avís que falta.
  const notes = viatgers
    .filter((v) => v.eliminatEl || v.altresEstades > 0)
    .map((v) =>
      v.eliminatEl
        ? `«${v.nom}» ja estava eliminat del CRM (${formatDate(v.eliminatEl)}).`
        : `«${v.nom}» té ${v.altresEstades} ${v.altresEstades === 1 ? 'estada més' : 'estades més'}: la seva fitxa de client es manté.`,
    );

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
          carregant || orfes.length > 0 || notes.length > 0 ? (
            <div className="mt-4 space-y-2">
              {carregant && (
                <p className="text-xs text-slate-400">Comprovant els clients d&apos;aquesta estada…</p>
              )}
              {orfes.length > 0 && (
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
              )}
              {notes.length > 0 && (
                <ul className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  {notes.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : null
        }
      />
    </>
  );
}
