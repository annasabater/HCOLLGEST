'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Trash2, Upload, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { optionsFrom, tipusDocumentPujatValues, TIPUS_DOCUMENT_PUJAT_LABELS } from '@/lib/validation/enums';

interface Doc {
  id: string;
  tipus: keyof typeof TIPUS_DOCUMENT_PUJAT_LABELS;
  fitxerNom: string;
  mime: string;
  dataSubida: string | Date;
}

export function DocumentsHuesped({
  huespedId,
  documents,
  canWrite,
}: {
  huespedId: string;
  documents: Doc[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [tipus, setTipus] = useState('DNI_ANVERS');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pujar(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Selecciona un fitxer');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tipus', tipus);
      const res = await fetch(`/api/huespedes/${huespedId}/documents`, { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'No s’ha pogut pujar el document');
        return;
      }
      setFile(null);
      router.refresh();
    } catch {
      setError('Error de connexió');
    } finally {
      setBusy(false);
    }
  }

  async function esborrar(id: string) {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5" /> Els documents es desen xifrats (AES-256-GCM) i cada accés
        queda auditat.
      </p>

      {documents.length === 0 && <p className="text-sm text-slate-400">Sense documents.</p>}
      {documents.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <a
            href={`/api/documents/${d.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 font-medium text-slate-800 hover:text-brand-700"
          >
            <FileText className="h-4 w-4 text-slate-400" />
            {TIPUS_DOCUMENT_PUJAT_LABELS[d.tipus]}
            <Badge tone="neutral">{d.fitxerNom}</Badge>
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{formatDate(d.dataSubida)}</span>
            {canWrite && (
              <button className="text-slate-400 hover:text-red-600" onClick={() => esborrar(d.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      {canWrite && (
        <form onSubmit={pujar} className="space-y-2 border-t border-slate-100 pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tipus de document">
              <Select value={tipus} onChange={(e) => setTipus(e.target.value)}>
                {optionsFrom(tipusDocumentPujatValues, TIPUS_DOCUMENT_PUJAT_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fitxer (PDF o imatge)">
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs"
              />
            </Field>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button type="submit" size="sm" disabled={busy}>
            <Upload className="h-4 w-4" /> {busy ? 'Pujant…' : 'Pujar document'}
          </Button>
        </form>
      )}
    </div>
  );
}
