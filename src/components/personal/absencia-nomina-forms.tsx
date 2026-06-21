'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { postJSON, ApiError } from '@/lib/api';
import { toISODate } from '@/lib/dates';
import { optionsFrom, tipusAbsenciaValues, TIPUS_ABSENCIA_LABELS } from '@/lib/validation/enums';

export function AbsenciaForm({ treballadorId }: { treballadorId: string }) {
  const router = useRouter();
  const [tipus, setTipus] = useState('VACANCES');
  const [dataInici, setInici] = useState(toISODate(new Date()));
  const [dataFi, setFi] = useState(toISODate(new Date()));
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await postJSON(`/api/treballadors/${treballadorId}/absencies`, { tipus, dataInici, dataFi });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    }
  }

  return (
    <form onSubmit={save} className="grid items-end gap-2 sm:grid-cols-4">
      <Field label="Tipus">
        <Select value={tipus} onChange={(e) => setTipus(e.target.value)}>
          {optionsFrom(tipusAbsenciaValues, TIPUS_ABSENCIA_LABELS).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Inici">
        <Input type="date" value={dataInici} onChange={(e) => setInici(e.target.value)} />
      </Field>
      <Field label="Fi">
        <Input type="date" value={dataFi} onChange={(e) => setFi(e.target.value)} />
      </Field>
      <Button type="submit" size="sm">
        Afegir absència
      </Button>
      {error && <span className="text-sm text-red-600 sm:col-span-4">{error}</span>}
    </form>
  );
}

export function NominaForm({ treballadorId }: { treballadorId: string }) {
  const router = useRouter();
  const [periode, setPeriode] = useState('');
  const [base, setBase] = useState('');
  const [extres, setExtres] = useState('');
  const [bonificacions, setBonificacions] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await postJSON(`/api/treballadors/${treballadorId}/nomines`, {
        periode,
        base: Number(base || 0),
        extres: Number(extres || 0),
        bonificacions: Number(bonificacions || 0),
      });
      setPeriode('');
      setBase('');
      setExtres('');
      setBonificacions('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    }
  }

  return (
    <form onSubmit={save} className="grid items-end gap-2 sm:grid-cols-5">
      <Field label="Període">
        <Input placeholder="2026-06" value={periode} onChange={(e) => setPeriode(e.target.value)} />
      </Field>
      <Field label="Base €">
        <Input type="number" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} />
      </Field>
      <Field label="Extres €">
        <Input type="number" step="0.01" value={extres} onChange={(e) => setExtres(e.target.value)} />
      </Field>
      <Field label="Bonif. €">
        <Input type="number" step="0.01" value={bonificacions} onChange={(e) => setBonificacions(e.target.value)} />
      </Field>
      <Button type="submit" size="sm">
        Afegir nòmina
      </Button>
      {error && <span className="text-sm text-red-600 sm:col-span-5">{error}</span>}
    </form>
  );
}
