'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Trash2, Upload, Lock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
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
  title = 'Documents d’identitat',
}: {
  huespedId: string;
  documents: Doc[];
  canWrite: boolean;
  title?: string;
}) {
  const router = useRouter();
  // Plegat per defecte si no hi ha documents; desplegat si en té.
  const [open, setOpen] = useState(documents.length > 0);
  const [tipus, setTipus] = useState('DNI_ANVERS');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

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
    if (!confirm('Segur que vols eliminar aquest document?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
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
        <FileText className="h-4 w-4 text-brand-600" />
        <CardTitle>{title}</CardTitle>
        <span className="text-sm font-medium text-slate-400">({documents.length})</span>
        <ChevronDown
          className={cn('ml-auto h-5 w-5 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <CardBody className="space-y-3 border-t border-slate-100">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5" /> Els documents es desen xifrats (AES-256-GCM) i cada accés
            queda auditat.
          </p>

          {documents.length === 0 && <p className="text-sm text-slate-400">Sense documents.</p>}
      {documents.map((d) => {
        const esImatge = (d.mime || '').startsWith('image/');
        const url = `/api/documents/${d.id}`;
        return (
        <div
          key={d.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <div className="flex min-w-0 items-center gap-3">
            {esImatge ? (
              <button type="button" onClick={() => setLightbox(url)} title="Veure el document" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={TIPUS_DOCUMENT_PUJAT_LABELS[d.tipus]}
                  className="h-14 w-20 rounded border border-slate-200 object-cover"
                />
              </button>
            ) : (
              <a href={url} target="_blank" rel="noreferrer" className="shrink-0" title="Obrir el document">
                <FileText className="h-6 w-6 text-slate-400" />
              </a>
            )}
            <div className="min-w-0">
              <div className="font-medium text-slate-800">{TIPUS_DOCUMENT_PUJAT_LABELS[d.tipus]}</div>
              <Badge tone="neutral">{d.fitxerNom}</Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-slate-400">{formatDate(d.dataSubida)}</span>
            {canWrite && (
              <button className="text-slate-400 hover:text-red-600" onClick={() => esborrar(d.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        );
      })}

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
        </CardBody>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Document"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-4 text-2xl font-bold text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}
    </Card>
  );
}
