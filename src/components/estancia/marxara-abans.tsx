'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, LogOut, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { postJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toISODate } from '@/lib/dates';

type Quin = 'dit' | 'avui' | 'oficial' | 'altre';

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
  jaMarxat = null,
}: {
  estanciaId: string;
  dataEntrada: string; // YYYY-MM-DD
  dataSortida: string; // YYYY-MM-DD (oficial)
  sortidaProbable: string | null; // YYYY-MM-DD
  /** Ja ha marxat (sortida real): el botó serveix per canviar-la. */
  jaMarxat?: string | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState('');
  const [nota, setNota] = useState('');
  const [quin, setQuin] = useState<Quin>('dit');
  const [altre, setAltre] = useState('');
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
    const avui = toISODate(new Date());
    const dit = sortidaProbable;
    // Dia real: el que va dir, avui o un altre (entre l'entrada i la sortida oficial).
    const triat = quin === 'dit' ? dit : quin === 'avui' ? avui : quin === 'oficial' ? dataSortida : altre;
    const valid = quin === 'oficial' || (!!triat && triat > dataEntrada && triat < dataSortida);
    return (
      <>
        <Button
          variant="outline"
          disabled={saving}
          onClick={() => {
            if (jaMarxat) {
              setQuin(jaMarxat === dit ? 'dit' : 'altre');
              setAltre(jaMarxat === dit ? '' : jaMarxat);
            } else {
              setQuin(avui > dit && avui < dataSortida ? 'avui' : 'dit');
              setAltre('');
            }
            setError(null);
            setOpen(true);
          }}
        >
          <LogOut className="h-4 w-4" /> {jaMarxat ? 'Canviar la sortida real' : 'Ha marxat'}
        </Button>
        {!jaMarxat && <Button
          variant="outline"
          disabled={saving}
          title="Treu la sortida probable: torna a estar ocupada fins a la sortida oficial"
          onClick={() => fes(() => delJSON(`/api/estancies/${estanciaId}/sortida-probable`), 'No s’ha pogut desfer')}
        >
          <Undo2 className="h-4 w-4" /> Al final es queda
        </Button>}
        {error && !open && <span className="text-sm text-red-600">{error}</span>}

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
                <p className="ui-pretitol text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">Ha marxat</p>
                <h2 className="text-lg font-semibold text-slate-900">Quin dia ha marxat?</h2>
              </div>
              <button onClick={() => setOpen(false)} className="shrink-0 text-slate-400 hover:text-slate-600" aria-label="Tancar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {(
                [
                  ['dit', `El dia que va dir · ${formatDate(dit)}`],
                  ...(avui !== dit && avui > dataEntrada && avui < dataSortida ? [['avui', `Avui · ${formatDate(avui)}`]] : []),
                  ['oficial', `El dia oficial · ${formatDate(dataSortida)} (s’ha quedat fins al final)`],
                  ['altre', 'Un altre dia'],
                ] as [Quin, string][]
              ).map(([k, t]) => (
                <label
                  key={k}
                  className={`flex cursor-pointer items-center gap-3 border px-3 py-2.5 text-sm ${quin === k ? 'border-brand-700 bg-brand-50' : 'border-slate-200'}`}
                >
                  <input type="radio" checked={quin === k} onChange={() => setQuin(k)} />
                  <span className="font-medium text-slate-800">{t}</span>
                </label>
              ))}
              {quin === 'altre' && (
                <Input type="date" className="w-full" value={altre} min={diaMes(dataEntrada, 1)} max={diaMes(dataSortida, -1)} onChange={(e) => setAltre(e.target.value)} />
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              A la fitxa quedaran els tres dies: el que ha marxat, el que va dir ({formatDate(dit)}) i l’oficial ({formatDate(dataSortida)}).
              No es torna cap diner.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel·lar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={saving || !valid}
                onClick={() =>
                  fes(
                    () =>
                      quin === 'oficial'
                        ? jaMarxat
                          ? postJSON(`/api/estancies/${estanciaId}/reactivar`, {})
                          : delJSON(`/api/estancies/${estanciaId}/sortida-probable`)
                        : postJSON(`/api/estancies/${estanciaId}/finalitzar-anticipada`, { dataSortida: triat, retorn: false }),
                    'No s’ha pogut marcar la sortida',
                  )
                }
              >
                {saving ? 'Desant…' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </dialog>
      </>
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
