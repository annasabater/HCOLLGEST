'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PawPrint, Plus, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { midaAnimalValues, MIDA_ANIMAL_LABELS } from '@/lib/validation/enums';

export interface Mascota {
  id: string;
  nom: string;
  especie: string;
  mida: 'PETIT' | 'MITJA' | 'GRAN' | null;
}

export function MascotesPanel({
  huespedId,
  mascotes,
  canWrite,
  title = 'Mascotes',
}: {
  huespedId: string;
  mascotes: Mascota[];
  canWrite: boolean;
  title?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(mascotes.length > 0);
  const [nom, setNom] = useState('');
  const [especie, setEspecie] = useState('Gos');
  const [mida, setMida] = useState('');
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editEspecie, setEditEspecie] = useState('');
  const [editMida, setEditMida] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  function startEdit(m: Mascota) {
    setEditId(m.id);
    setEditNom(m.nom);
    setEditEspecie(m.especie);
    setEditMida(m.mida ?? '');
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function desar(id: string) {
    setEditBusy(true);
    try {
      await patchJSON(`/api/animals/${id}`, {
        nom: editNom || undefined,
        especie: editEspecie || undefined,
        mida: editMida || undefined,
      });
      setEditId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error desant');
    } finally {
      setEditBusy(false);
    }
  }

  async function eliminar(id: string) {
    if (!confirm('Eliminar aquesta mascota?')) return;
    try {
      await delJSON(`/api/animals/${id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error eliminant');
    }
  }

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !especie.trim()) return;
    setSaving(true);
    try {
      await postJSON('/api/animals', { nom, especie, mida: mida || undefined, huespedId });
      setNom('');
      setMida('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <PawPrint className="h-4 w-4 text-brand-600" />
        <CardTitle>{title}</CardTitle>
        <span className="text-sm font-medium text-slate-400">({mascotes.length})</span>
        <ChevronDown
          className={cn('ml-auto h-5 w-5 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <CardBody className="space-y-3 border-t border-slate-100">
          {mascotes.length > 0 && (
            <ul className="space-y-2">
              {mascotes.map((m) =>
                editId === m.id ? (
                  <li key={m.id} className="rounded-lg border border-brand-200 bg-brand-50/30 px-3 py-2">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="w-28">
                        <label className="mb-1 block text-xs text-slate-500">Nom</label>
                        <Input value={editNom} onChange={(e) => setEditNom(e.target.value)} />
                      </div>
                      <div className="w-28">
                        <label className="mb-1 block text-xs text-slate-500">Espècie</label>
                        <Input value={editEspecie} onChange={(e) => setEditEspecie(e.target.value)} />
                      </div>
                      <div className="w-28">
                        <label className="mb-1 block text-xs text-slate-500">Mida</label>
                        <Select value={editMida} onChange={(e) => setEditMida(e.target.value)}>
                          <option value="">—</option>
                          {midaAnimalValues.map((v) => (
                            <option key={v} value={v}>{MIDA_ANIMAL_LABELS[v]}</option>
                          ))}
                        </Select>
                      </div>
                      <Button type="button" size="sm" onClick={() => desar(m.id)} disabled={editBusy}>
                        <Check className="h-4 w-4" /> Desar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4" /> Cancel·lar
                      </Button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={m.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <PawPrint className="h-4 w-4 text-brand-600" />
                    <span className="font-medium text-slate-800">{m.nom}</span>
                    <span className="text-slate-400">· {m.especie}</span>
                    {m.mida && (
                      <Badge tone="neutral">{MIDA_ANIMAL_LABELS[m.mida]}</Badge>
                    )}
                    {canWrite && (
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-brand-600"
                          onClick={() => startEdit(m)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => eliminar(m.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </li>
                )
              )}
            </ul>
          )}

          {canWrite ? (
            <form
              onSubmit={afegir}
              className={cn(
                'flex flex-wrap items-end gap-2',
                mascotes.length > 0 && 'border-t border-slate-100 pt-3',
              )}
            >
              <div className="w-28">
                <label className="mb-1 block text-xs text-slate-500">Nom</label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs text-slate-500">Espècie</label>
                <Input value={especie} onChange={(e) => setEspecie(e.target.value)} placeholder="Gos, gat…" />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs text-slate-500">Mida</label>
                <Select value={mida} onChange={(e) => setMida(e.target.value)}>
                  <option value="">—</option>
                  {midaAnimalValues.map((v) => (
                    <option key={v} value={v}>
                      {MIDA_ANIMAL_LABELS[v]}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={saving}>
                <Plus className="h-4 w-4" /> Afegir
              </Button>
            </form>
          ) : (
            mascotes.length === 0 && <p className="text-sm text-slate-400">Sense mascotes.</p>
          )}
        </CardBody>
      )}
    </Card>
  );
}
