'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { postJSON, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { optionsFrom, sentitAnotacioValues, SENTIT_ANOTACIO_LABELS } from '@/lib/validation/enums';

export function AnotacioForm({ huespedId }: { huespedId: string }) {
  const router = useRouter();
  // Plegat per defecte: el formulari només s'obre quan es vol afegir una nota.
  const [open, setOpen] = useState(false);
  const [sentit, setSentit] = useState('NEUTRA');
  const [descripcio, setDescripcio] = useState('');
  const [noAcollir, setNoAcollir] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/huespedes/${huespedId}/anotacions`, {
        sentit,
        descripcio,
        noAcollir,
        privada: true,
      });
      setDescripcio('');
      setNoAcollir(false);
      setSentit('NEUTRA');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant la nota');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-slate-700 hover:text-brand-700"
        aria-expanded={open}
      >
        <Plus className="h-4 w-4 text-brand-600" />
        Afegir nota
        <ChevronDown
          className={cn('ml-auto h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <form onSubmit={save} className="mt-3 space-y-3">
          <Field label="Sentit">
            <Select value={sentit} onChange={(e) => setSentit(e.target.value)}>
              {optionsFrom(sentitAnotacioValues, SENTIT_ANOTACIO_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Descripció (objectiva i verificable)"
            hint="Registra FETS, no etiquetes. P.ex. «factura nº 12 impagada» o «trencament del llum, foto del 03/06». L’hoste pot demanar veure-ho."
            error={error ?? undefined}
          >
            <Textarea value={descripcio} onChange={(e) => setDescripcio(e.target.value)} rows={3} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={noAcollir} onChange={(e) => setNoAcollir(e.target.checked)} />
            Marcar com a «no acollir» (llista interna del propi establiment)
          </label>
          <Button type="submit" size="sm" disabled={saving || descripcio.trim().length < 5}>
            {saving ? 'Desant…' : 'Desar nota'}
          </Button>
        </form>
      )}
    </div>
  );
}
