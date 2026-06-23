'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { patchJSON, delJSON } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { optionsFrom, sentitAnotacioValues, SENTIT_ANOTACIO_LABELS } from '@/lib/validation/enums';
import { AnotacioForm } from './anotacio-form';

export interface NotaInterna {
  id: string;
  sentit: keyof typeof SENTIT_ANOTACIO_LABELS;
  descripcio: string;
  noAcollir: boolean;
  data: string | Date;
}

const tone = (s: string): 'success' | 'danger' | 'neutral' =>
  s === 'POSITIVA' ? 'success' : s === 'NEGATIVA' ? 'danger' : 'neutral';

export function NotesPanel({
  huespedId,
  notes,
  canWrite,
  title = 'Notes internes',
}: {
  huespedId: string;
  notes: NotaInterna[];
  canWrite: boolean;
  title?: string;
}) {
  const router = useRouter();
  // Plegat per defecte si no hi ha notes; desplegat si en té.
  const [open, setOpen] = useState(notes.length > 0);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ sentit: 'NEUTRA', descripcio: '', noAcollir: false });
  const [saving, setSaving] = useState(false);

  function startEdit(n: NotaInterna) {
    setEditId(n.id);
    setDraft({ sentit: n.sentit, descripcio: n.descripcio, noAcollir: n.noAcollir });
  }

  async function desar(id: string) {
    if (draft.descripcio.trim().length < 5) return;
    setSaving(true);
    try {
      await patchJSON(`/api/huespedes/${huespedId}/anotacions/${id}`, draft);
      setEditId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function esborrar(id: string) {
    if (!confirm('Eliminar aquesta nota interna?')) return;
    await delJSON(`/api/huespedes/${huespedId}/anotacions/${id}`);
    router.refresh();
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <MessageSquare className="h-4 w-4 text-brand-600" />
        <CardTitle>{title}</CardTitle>
        <span className="text-sm font-medium text-slate-400">({notes.length})</span>
        <ChevronDown
          className={cn('ml-auto h-5 w-5 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <CardBody className="space-y-4 border-t border-slate-100">
          {notes.length === 0 && <p className="text-sm text-slate-400">Sense notes.</p>}

          {notes.map((n) =>
            editId === n.id ? (
              <div key={n.id} className="space-y-2 rounded-lg border border-brand-200 p-3">
                <Select value={draft.sentit} onChange={(e) => setDraft({ ...draft, sentit: e.target.value })}>
                  {optionsFrom(sentitAnotacioValues, SENTIT_ANOTACIO_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Textarea
                  rows={3}
                  value={draft.descripcio}
                  onChange={(e) => setDraft({ ...draft, descripcio: e.target.value })}
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.noAcollir}
                    onChange={(e) => setDraft({ ...draft, noAcollir: e.target.checked })}
                  />
                  Marcar com a «no acollir»
                </label>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => desar(n.id)} disabled={saving || draft.descripcio.trim().length < 5}>
                    <Check className="h-4 w-4" /> {saving ? 'Desant…' : 'Desar'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                    <X className="h-4 w-4" /> Cancel·lar
                  </Button>
                </div>
              </div>
            ) : (
              <div key={n.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={tone(n.sentit)}>{SENTIT_ANOTACIO_LABELS[n.sentit]}</Badge>
                  {n.noAcollir && <Badge tone="danger">No acollir</Badge>}
                  <span className="ml-auto text-xs text-slate-400">{formatDate(n.data)}</span>
                  {canWrite && (
                    <>
                      <button
                        onClick={() => startEdit(n)}
                        className="text-slate-400 hover:text-brand-700"
                        title="Editar nota"
                        aria-label="Editar nota"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => esborrar(n.id)}
                        className="text-slate-400 hover:text-red-600"
                        title="Eliminar nota"
                        aria-label="Eliminar nota"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-700">{n.descripcio}</p>
              </div>
            ),
          )}

          {canWrite && (
            <div className="border-t border-slate-100 pt-4">
              <AnotacioForm huespedId={huespedId} />
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}
