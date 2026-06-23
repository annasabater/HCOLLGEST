'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { postJSON, ApiError } from '@/lib/api';

export function AmpliarEstada({
  estanciaId,
  defaultEntrada,
}: {
  estanciaId: string;
  defaultEntrada: string; // ISO YYYY-MM-DD (normalment la sortida actual)
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dataEntrada, setDataEntrada] = useState(defaultEntrada);
  const [dataSortida, setDataSortida] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ampliar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await postJSON<{ estanciaId: string }>(`/api/estancies/${estanciaId}/ampliar`, {
        dataEntrada,
        dataSortida,
      });
      router.push(`/estancies/${res.estanciaId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error ampliant l’estada');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Ampliar estada
      </Button>
    );
  }

  return (
    <form onSubmit={ampliar} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <Field label="Nova entrada">
        <Input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} />
      </Field>
      <Field label="Nova sortida">
        <Input type="date" value={dataSortida} onChange={(e) => setDataSortida(e.target.value)} />
      </Field>
      <Button type="submit" size="sm" disabled={saving || !dataSortida}>
        {saving ? 'Ampliant…' : 'Crear ampliació'}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel·lar
      </Button>
      {error && <span className="w-full text-sm text-red-600">{error}</span>}
    </form>
  );
}
