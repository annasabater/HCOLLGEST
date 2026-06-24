'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { patchJSON, ApiError } from '@/lib/api';
import { optionsFrom, tipusPagamentValues, TIPUS_PAGAMENT_LABELS } from '@/lib/validation/enums';

export interface EditarEstadaInicial {
  dataEntrada: string; // YYYY-MM-DD
  dataSortida: string;
  tipusPagament: string;
  numHabitacions: number | null;
  teInternet: boolean | null;
  observacions: string | null;
  habitacioId: string | null;
}

export function EditarEstadaForm({
  estanciaId,
  habitacions,
  inicial,
}: {
  estanciaId: string;
  habitacions: { id: string; nom: string }[];
  inicial: EditarEstadaInicial;
}) {
  const router = useRouter();
  const [v, setV] = useState({
    dataEntrada: inicial.dataEntrada,
    dataSortida: inicial.dataSortida,
    tipusPagament: inicial.tipusPagament,
    numHabitacions: inicial.numHabitacions != null ? String(inicial.numHabitacions) : '',
    teInternet: inicial.teInternet ?? false,
    observacions: inicial.observacions ?? '',
    habitacioId: inicial.habitacioId ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function desa(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await patchJSON(`/api/estancies/${estanciaId}`, {
        dataEntrada: v.dataEntrada,
        dataSortida: v.dataSortida,
        tipusPagament: v.tipusPagament,
        habitacioId: v.habitacioId || null,
        numHabitacions: v.numHabitacions === '' ? null : Number(v.numHabitacions),
        teInternet: v.teInternet,
        observacions: v.observacions || null,
      });
      router.push(`/estancies/${estanciaId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant l’estada');
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={desa} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Data d’entrada" required>
            <Input type="date" value={v.dataEntrada} onChange={(e) => setV({ ...v, dataEntrada: e.target.value })} />
          </Field>
          <Field label="Data de sortida" required>
            <Input type="date" value={v.dataSortida} onChange={(e) => setV({ ...v, dataSortida: e.target.value })} />
          </Field>
          <Field label="Habitació">
            <Select value={v.habitacioId} onChange={(e) => setV({ ...v, habitacioId: e.target.value })}>
              <option value="">—</option>
              {habitacions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nom}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipus de pagament">
            <Select value={v.tipusPagament} onChange={(e) => setV({ ...v, tipusPagament: e.target.value })}>
              {optionsFrom(tipusPagamentValues, TIPUS_PAGAMENT_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nº d’habitacions">
            <Input
              type="number"
              min="0"
              value={v.numHabitacions}
              onChange={(e) => setV({ ...v, numHabitacions: e.target.value })}
            />
          </Field>
          <Field label="Internet">
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={v.teInternet}
                onChange={(e) => setV({ ...v, teInternet: e.target.checked })}
              />
              L’establiment disposa d’internet
            </label>
          </Field>
          <Field label="Observacions" className="sm:col-span-2 lg:col-span-3">
            <Input value={v.observacions} onChange={(e) => setV({ ...v, observacions: e.target.value })} />
          </Field>

          {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}

          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={busy}>
              <Save className="h-4 w-4" /> {busy ? 'Desant…' : 'Desar canvis'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push(`/estancies/${estanciaId}`)}>
              Cancel·lar
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
