'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { postJSON, patchJSON, ApiError } from '@/lib/api';

export interface TreballadorEditable {
  id: string;
  nom: string;
  carrec: string;
  preuHora: string;
  telefon: string;
  email: string;
  dni: string;
}

const BUIT = { nom: '', carrec: '', preuHora: '', telefon: '', email: '', dni: '' };

/**
 * Formulari de treballador. Sense `treballador` → alta (botó "Nou treballador").
 * Amb `treballador` → edició de les seves dades (botó llapis + modal).
 */
export function TreballadorForm({ treballador }: { treballador?: TreballadorEditable }) {
  const router = useRouter();
  const isEdit = !!treballador;
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(
    treballador
      ? {
          nom: treballador.nom,
          carrec: treballador.carrec,
          preuHora: treballador.preuHora,
          telefon: treballador.telefon,
          email: treballador.email,
          dni: treballador.dni,
        }
      : BUIT,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nom: v.nom,
        carrec: v.carrec,
        preuHora: v.preuHora || undefined,
        telefon: v.telefon || undefined,
        email: v.email || undefined,
        dni: v.dni || undefined,
      };
      if (isEdit) {
        await patchJSON(`/api/treballadors/${treballador.id}`, payload);
      } else {
        await postJSON('/api/treballadors', payload);
        setV(BUIT);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return isEdit ? (
      <button
        onClick={() => setOpen(true)}
        className="text-slate-400 hover:text-brand-700"
        title="Editar treballador"
        aria-label="Editar treballador"
      >
        <Pencil className="h-4 w-4" />
      </button>
    ) : (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nou treballador
      </Button>
    );
  }

  const fields = (
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
  );

  // Edició: modal centrat (es crida des d'una fila de la taula).
  if (isEdit) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16"
        onClick={() => setOpen(false)}
      >
        <div className="w-full max-w-2xl text-left" onClick={(e) => e.stopPropagation()}>
          <Card>
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Editar treballador</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Tancar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {fields}
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // Alta: targeta en lloc.
  return (
    <Card className="mb-6">
      <CardBody>{fields}</CardBody>
    </Card>
  );
}
