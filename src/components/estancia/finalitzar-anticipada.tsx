'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { postJSON, ApiError } from '@/lib/api';
import { METODE_COBRAMENT_LABELS, metodeCobramentValues } from '@/lib/validation/enums';
import { toISODate } from '@/lib/dates';

export function FinalitzarAnticipada({
  estanciaId,
  dataEntrada,
  dataSortidaActual,
  habitacioNom,
  jaAnticipada = false,
}: {
  estanciaId: string;
  dataEntrada: string | null; // ISO YYYY-MM-DD
  dataSortidaActual: string | null; // ISO YYYY-MM-DD
  habitacioNom: string | null;
  jaAnticipada?: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [dataSortida, setDataSortida] = useState('');
  const [horaSortida, setHoraSortida] = useState('');
  const [retorn, setRetorn] = useState(false);
  const [retornImport, setRetornImport] = useState('');
  const [retornMetode, setRetornMetode] = useState<string>('EFECTIU');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  function obre() {
    setDataSortida(toISODate(new Date()));
    setHoraSortida('');
    setRetorn(false);
    setRetornImport('');
    setRetornMetode('EFECTIU');
    setError(null);
    setOpen(true);
  }

  async function confirmar() {
    setSaving(true);
    setError(null);
    try {
      // Combina dia + hora opcional en un ISO datetime (sense hora → mitjanit).
      const dataIso = horaSortida ? `${dataSortida}T${horaSortida}` : dataSortida;
      await postJSON(`/api/estancies/${estanciaId}/finalitzar-anticipada`, {
        dataSortida: dataIso,
        retorn,
        ...(retorn ? { retornImport: Number(retornImport), retornMetode } : {}),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error finalitzant l’estada');
    } finally {
      setSaving(false);
    }
  }

  async function reactivar() {
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/estancies/${estanciaId}/reactivar`, {});
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error reactivant l’estada');
    } finally {
      setSaving(false);
    }
  }

  // Si ja està finalitzada anticipadament: botó per desfer-ho (tornar a allotjat).
  if (jaAnticipada) {
    return (
      <Button variant="ghost" size="sm" onClick={reactivar} disabled={saving}>
        <RotateCcw className="h-4 w-4" /> {saving ? 'Reactivant…' : 'Reactivar (tornar a allotjat)'}
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={obre}>
        <LogOut className="h-4 w-4" /> Sortida anticipada
      </Button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(92vw,34rem)] max-w-none max-h-[88vh] overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-900/50"
        onClick={(e) => { if (e.target === dialogRef.current) setOpen(false); }}
        onCancel={() => setOpen(false)}
      >
        <div className="p-6">
          <div className="relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-0 top-0 text-slate-400 hover:text-slate-600"
              aria-label="Tancar"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="pr-8 text-lg font-semibold text-slate-900">Sortida anticipada</h2>
            <p className="mt-1 pr-8 text-sm text-slate-500">
              L’hoste marxa abans del previst. Es marcarà l’estada com a finalitzada abans d’hora,
              s’alliberarà{habitacioNom ? ` l’habitació ${habitacioNom}` : ' l’habitació'} i quedarà
              una nota interna. Ho podràs desfer si t’equivoques.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-end gap-2">
              <Field label="Data real de sortida" required>
                <Input
                  type="date"
                  value={dataSortida}
                  min={dataEntrada ?? undefined}
                  max={dataSortidaActual ?? undefined}
                  onChange={(e) => setDataSortida(e.target.value)}
                />
              </Field>
              <Field label="Hora (opcional)">
                <Input
                  type="time"
                  value={horaSortida}
                  onChange={(e) => setHoraSortida(e.target.value)}
                />
              </Field>
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Devolució de diners</p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={!retorn} onChange={() => setRetorn(false)} />
                No torno cap import
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={retorn} onChange={() => setRetorn(true)} />
                Torno diners
              </label>
              {retorn && (
                <div className="flex items-end gap-2 pt-1">
                  <Field label="Import €">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={retornImport}
                      onChange={(e) => setRetornImport(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                    />
                  </Field>
                  <Field label="Mètode">
                    <Select value={retornMetode} onChange={(e) => setRetornMetode(e.target.value)}>
                      {metodeCobramentValues.map((m) => (
                        <option key={m} value={m}>{METODE_COBRAMENT_LABELS[m]}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
              {retorn && (
                <p className="text-xs text-slate-400">
                  Es registrarà com a devolució (resta de l’ingrés de l’estada).
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel·lar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmar}
              disabled={saving || !dataSortida || (retorn && !(Number(retornImport) > 0))}
            >
              <LogOut className="h-4 w-4" />
              {saving ? 'Desant…' : 'Confirmar sortida'}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
