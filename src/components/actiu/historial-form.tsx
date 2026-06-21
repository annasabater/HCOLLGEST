'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { postJSON, ApiError } from '@/lib/api';
import { toISODate } from '@/lib/dates';
import {
  optionsFrom,
  tipusHistorialActiuValues,
  TIPUS_HISTORIAL_ACTIU_LABELS,
} from '@/lib/validation/enums';

export function HistorialForm({ actiuId }: { actiuId: string }) {
  const router = useRouter();
  const [tipus, setTipus] = useState('REPARACIO');
  const [descripcio, setDescripcio] = useState('');
  const [data, setData] = useState(toISODate(new Date()));
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/actius/${actiuId}/historial`, {
        tipus,
        descripcio,
        data,
        cost: cost ? Number(cost) : undefined,
      });
      setDescripcio('');
      setCost('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid items-end gap-2 sm:grid-cols-4">
      <Field label="Tipus">
        <Select value={tipus} onChange={(e) => setTipus(e.target.value)}>
          {optionsFrom(tipusHistorialActiuValues, TIPUS_HISTORIAL_ACTIU_LABELS).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Data">
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </Field>
      <Field label="Cost €">
        <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
      </Field>
      <Field label="Descripció" className="sm:col-span-4">
        <Input value={descripcio} onChange={(e) => setDescripcio(e.target.value)} />
      </Field>
      <div className="sm:col-span-4">
        <Button type="submit" size="sm" disabled={saving || !descripcio}>
          {saving ? 'Desant…' : 'Afegir al historial'}
        </Button>
        {error && <span className="ml-3 text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
