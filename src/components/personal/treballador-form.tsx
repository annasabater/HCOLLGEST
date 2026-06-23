'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { postJSON, ApiError } from '@/lib/api';

export function TreballadorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ nom: '', carrec: '', preuHora: '', telefon: '', email: '', dni: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJSON('/api/treballadors', {
        nom: v.nom,
        carrec: v.carrec,
        preuHora: v.preuHora || undefined,
        telefon: v.telefon || undefined,
        email: v.email || undefined,
        dni: v.dni || undefined,
      });
      setV({ nom: '', carrec: '', preuHora: '', telefon: '', email: '', dni: '' });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nou treballador
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <CardBody>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
          <Field label="Nom" required>
            <Input value={v.nom} onChange={(e) => setV({ ...v, nom: e.target.value })} />
          </Field>
          <Field label="Càrrec" required>
            <Input value={v.carrec} onChange={(e) => setV({ ...v, carrec: e.target.value })} />
          </Field>
          <Field label="Preu/hora (€)" hint="Es paga per hores treballades">
            <Input
              type="number"
              step="0.01"
              value={v.preuHora}
              onChange={(e) => setV({ ...v, preuHora: e.target.value })}
            />
          </Field>
          <Field label="Telèfon">
            <Input value={v.telefon} onChange={(e) => setV({ ...v, telefon: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
          </Field>
          <Field label="DNI (opcional)">
            <Input value={v.dni} onChange={(e) => setV({ ...v, dni: e.target.value })} />
          </Field>
          <div className="sm:col-span-3 flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Desant…' : 'Desar'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel·lar
            </Button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
