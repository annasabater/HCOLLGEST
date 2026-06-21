'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { postJSON, ApiError } from '@/lib/api';
import { optionsFrom, sentitAnotacioValues, SENTIT_ANOTACIO_LABELS } from '@/lib/validation/enums';

export function AnotacioForm({ huespedId }: { huespedId: string }) {
  const router = useRouter();
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
    <form onSubmit={save} className="space-y-3">
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
        hint="Registra FETS, no etiquetes. P.ex. «factura nº 12 impagada» o «trencament del llum, foto del 03/06». L’hoste pot demanar veure-ho (§7)."
        error={error ?? undefined}
      >
        <Textarea value={descripcio} onChange={(e) => setDescripcio(e.target.value)} rows={3} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={noAcollir} onChange={(e) => setNoAcollir(e.target.checked)} />
        Marcar com a «no acollir» (llista interna del propi establiment)
      </label>
      <Button type="submit" size="sm" disabled={saving || descripcio.trim().length < 5}>
        {saving ? 'Desant…' : 'Afegir nota'}
      </Button>
    </form>
  );
}
