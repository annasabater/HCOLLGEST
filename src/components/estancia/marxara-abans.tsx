'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, LogOut, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { postJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const diaMes = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * «Marxarà abans»: l'hoste ha dit que probablement marxarà abans de la sortida
 * oficial. No cancel·la res ni toca la sortida oficial; l'habitació surt
 * «probablement lliure» des d'aquell dia. Un cop marcada: «Ha marxat» (sortida
 * anticipada amb aquesta data, sense retorn) o «Al final es queda».
 */
export function MarxaraAbans({
  estanciaId,
  dataEntrada,
  dataSortida,
  sortidaProbable,
}: {
  estanciaId: string;
  dataEntrada: string; // YYYY-MM-DD
  dataSortida: string; // YYYY-MM-DD (oficial)
  sortidaProbable: string | null; // YYYY-MM-DD
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  async function fes(accio: () => Promise<unknown>, missatge: string) {
    setSaving(true);
    setError(null);
    try {
      await accio();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : missatge);
    } finally {
      setSaving(false);
    }
  }

  if (sortidaProbable) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={saving}
          title={`Dona l'estada per acabada el ${formatDate(sortidaProbable)} (sortida anticipada, sense retornar diners). La sortida oficial queda guardada.`}
          onClick={() =>
            fes(
              () => postJSON(`/api/estancies/${estanciaId}/finalitzar-anticipada`, { dataSortida: sortidaProbable, retorn: false }),
              'No s’ha pogut marcar la sortida',
            )
          }
        >
          <LogOut className="h-4 w-4" /> Ha marxat
        </Button>
        <Button
          variant="outline"
          disabled={saving}
          title="Treu la sortida probable: torna a estar ocupada fins a la sortida oficial"
          onClick={() => fes(() => delJSON(`/api/estancies/${estanciaId}/sortida-probable`), 'No s’ha pogut desfer')}
        >
          <Undo2 className="h-4 w-4" /> Al final es queda
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </span>
    );
  }

  const min = diaMes(dataEntrada, 1);
  const max = diaMes(dataSortida, -1);
  if (min > max) return null; // estada d'una nit: no pot marxar abans

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setData('');
          setNota('');
          setError(null);
          setOpen(true);
        }}
      >
        <CalendarClock className="h-4 w-4" /> Marxarà abans
      </Button>

      <dialog
        ref={dialogRef}
        style={{ width: '100%', maxWidth: '30rem', maxHeight: '85vh' }}
        className="m-auto box-border overflow-x-hidden overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-900/50"
        onClick={(e) => { if (e.target === dialogRef.current) setOpen(false); }}
        onCancel={() => setOpen(false)}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="ui-pretitol text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">Marxarà abans</p>
              <h2 className="text-lg font-semibold text-slate-900">Quan creu que marxarà?</h2>
            </div>
            <button onClick={() => setOpen(false)} className="shrink-0 text-slate-400 hover:text-slate-600" aria-label="Tancar">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            No es cancel·la res i no es toca el que ha pagat. La sortida oficial ({formatDate(dataSortida)}) es queda
            igual —és la de Mossos i la factura—; l’habitació surt <b>probablement lliure</b> des d’aquest dia.
          </p>

          <div className="mt-5 space-y-4">
            <Field label="Sortida probable" required>
              <Input type="date" className="w-full" value={data} min={min} max={max} onChange={(e) => setData(e.target.value)} />
            </Field>
            <Field label="Nota (opcional)">
              <Input
                className="w-full"
                value={nota}
                maxLength={300}
                placeholder="p. ex. m’ho ha dit per WhatsApp"
                onChange={(e) => setNota(e.target.value)}
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel·lar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={saving || !data || data < min || data > max}
              onClick={() =>
                fes(() => postJSON(`/api/estancies/${estanciaId}/sortida-probable`, { data, nota: nota || null }), 'No s’ha pogut desar')
              }
            >
              {saving ? 'Desant…' : 'Desar'}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
