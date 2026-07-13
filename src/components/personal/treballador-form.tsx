'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { postJSON, patchJSON, ApiError } from '@/lib/api';

export interface TreballadorEditable {
  id: string;
  nom: string;
  carrec: string;
  telefon: string;
  email: string;
  dni: string;
  // Mode per hores
  preuHora: string;
  // Mode per tasques de neteja
  preuSortida: string;
  preuManteniment: string;
  preuZones: string;
  // Empresa de neteja / pertinença a una empresa
  esEmpresa: boolean;
  nomEmpresa: string;
  empresaId: string;
}

type ModePagament = 'hora' | 'tasques';

function detectMode(t?: TreballadorEditable): ModePagament {
  if (!t) return 'hora';
  if (t.preuSortida || t.preuManteniment || t.preuZones) return 'tasques';
  return 'hora';
}

const BUIT = {
  nom: '', carrec: '', telefon: '', email: '', dni: '',
  preuHora: '', preuSortida: '', preuManteniment: '', preuZones: '',
  esEmpresa: false, nomEmpresa: '', empresaId: '',
};

export function TreballadorForm({
  treballador,
  empreses = [],
}: {
  treballador?: TreballadorEditable;
  empreses?: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const isEdit = !!treballador;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModePagament>(detectMode(treballador));
  const [v, setV] = useState(treballador ? { ...treballador } : { ...BUIT, id: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function switchMode(m: ModePagament) {
    setMode(m);
    if (m === 'hora') setV((prev) => ({ ...prev, preuSortida: '', preuManteniment: '', preuZones: '' }));
    else setV((prev) => ({ ...prev, preuHora: '' }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nom: v.nom,
        carrec: v.carrec,
        telefon: v.telefon || undefined,
        email: v.email || undefined,
        dni: v.dni || undefined,
        preuHora: mode === 'hora' ? (v.preuHora || undefined) : null,
        preuSortida: mode === 'tasques' ? (v.preuSortida || undefined) : null,
        preuManteniment: mode === 'tasques' ? (v.preuManteniment || undefined) : null,
        preuZones: mode === 'tasques' ? (v.preuZones || undefined) : null,
        esEmpresa: v.esEmpresa,
        nomEmpresa: v.nomEmpresa || undefined,
        empresaId: v.esEmpresa ? null : (v.empresaId || null),
      };
      if (isEdit) {
        await patchJSON(`/api/treballadors/${treballador.id}`, payload);
      } else {
        await postJSON('/api/treballadors', payload);
        setV({ ...BUIT, id: '' });
        setMode('hora');
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
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nom" required>
          <Input value={v.nom} onChange={(e) => setV({ ...v, nom: e.target.value })} />
        </Field>
        <Field label="Càrrec" required>
          <Input value={v.carrec} onChange={(e) => setV({ ...v, carrec: e.target.value })} />
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
      </div>

      <div className="border-t border-slate-100 pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={v.esEmpresa}
            onChange={(e) => setV({ ...v, esEmpresa: e.target.checked, empresaId: e.target.checked ? '' : v.empresaId })}
            className="accent-brand-700"
          />
          És una empresa de neteja (pago a l&apos;empresa, no al treballador)
        </label>
        <div className="mt-2 max-w-sm">
          <Field label="Nom de l'empresa (opcional)" hint="Raó social; surt a la llista.">
            <Input
              value={v.nomEmpresa}
              onChange={(e) => setV({ ...v, nomEmpresa: e.target.value })}
              placeholder="p. ex. Neteja Barcelona SL"
            />
          </Field>
        </div>
        {!v.esEmpresa && empreses.filter((em) => em.id !== v.id).length > 0 && (
          <div className="mt-2 max-w-xs">
            <Field label="Pertany a l'empresa" hint="Els membres reben WhatsApp i queden al registre de qui ha netejat.">
              <Select value={v.empresaId} onChange={(e) => setV({ ...v, empresaId: e.target.value })}>
                <option value="">— Independent —</option>
                {empreses.filter((em) => em.id !== v.id).map((em) => (
                  <option key={em.id} value={em.id}>{em.nom}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="mb-2 text-sm font-medium text-slate-700">
          {v.esEmpresa ? 'Mode de pagament (a l’empresa)' : 'Mode de pagament'}
        </p>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="mode-pagament"
              checked={mode === 'hora'}
              onChange={() => switchMode('hora')}
              className="accent-brand-700"
            />
            Per hores (€/hora)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="mode-pagament"
              checked={mode === 'tasques'}
              onChange={() => switchMode('tasques')}
              className="accent-brand-700"
            />
            Per tasques de neteja
          </label>
        </div>
      </div>

      {mode === 'hora' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Preu/hora (€)">
            <Input
              type="number"
              step="0.01"
              value={v.preuHora}
              onChange={(e) => setV({ ...v, preuHora: e.target.value })}
              placeholder="p.ex. 10"
            />
          </Field>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Sortida (€/habitació)">
            <Input
              type="number"
              step="0.01"
              value={v.preuSortida}
              onChange={(e) => setV({ ...v, preuSortida: e.target.value })}
              placeholder="15"
            />
          </Field>
          <Field label="Manteniment (€/habitació)">
            <Input
              type="number"
              step="0.01"
              value={v.preuManteniment}
              onChange={(e) => setV({ ...v, preuManteniment: e.target.value })}
              placeholder="12.50"
            />
          </Field>
          <Field label="Zones comunes (€ pack)" hint="Passadís + vorera + pati, tot junt.">
            <Input
              type="number"
              step="0.01"
              value={v.preuZones}
              onChange={(e) => setV({ ...v, preuZones: e.target.value })}
              placeholder="12.50"
            />
          </Field>
        </div>
      )}

      <div className="flex items-center gap-3">
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

  return (
    <Card className="mb-6">
      <CardBody>{fields}</CardBody>
    </Card>
  );
}
