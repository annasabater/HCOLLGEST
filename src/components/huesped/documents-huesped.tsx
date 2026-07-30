'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Trash2, Upload, Lock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { cn, formatDate } from '@/lib/utils';
import { optionsFrom, tipusDocumentPujatValues, TIPUS_DOCUMENT_PUJAT_LABELS } from '@/lib/validation/enums';
import type { ViatgerOcr } from '@/lib/ocr/mrz';

// El lector de la MRZ diu si és DNI/NIE/passaport; ho traduïm al "tipus de
// document pujat". La MRZ és al REVERS del DNI, per això DNI → DNI_REVERS.
function mapTipusDocument(t: ViatgerOcr['tipusDocument']): string | null {
  switch (t) {
    case 'DNI_NIF': return 'DNI_REVERS';
    case 'NIE': return 'NIE';
    case 'PASSAPORT': return 'PASSAPORT';
    default: return null;
  }
}

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
  // Lectura automàtica del document (OCR de la MRZ) en triar el fitxer.
  const [scanning, setScanning] = useState(false);
  const [scanInfo, setScanInfo] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  // En triar un fitxer, l'escanegem (mateix lector que a l'estada): detecta si és
  // DNI/NIE/passaport, posa el "Tipus de document" sol i mostra què ha llegit.
  async function triaFitxer(f: File | null) {
    setFile(f);
    setScanInfo(null);
    setError(null);
    if (!f || !f.type.startsWith('image/')) return; // OCR només amb imatges
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append('image', f);
      const res = await fetch('/api/ocr/document', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => null)) as
        | { result?: ViatgerOcr; warnings?: string[] }
        | null;
      if (res.ok && data?.result) {
        const r = data.result;
        const mapped = mapTipusDocument(r.tipusDocument);
        if (mapped) setTipus(mapped);
        const nom = [r.nom, r.cognom1].filter(Boolean).join(' ');
        const parts = [
          TIPUS_DOCUMENT_PUJAT_LABELS[(mapped ?? tipus) as keyof typeof TIPUS_DOCUMENT_PUJAT_LABELS],
          nom || null,
          r.numDocument || null,
        ].filter(Boolean);
        setScanInfo({ tone: 'ok', text: `Llegit: ${parts.join(' · ')}. Revisa el tipus abans de pujar.` });
      } else {
        const w = data?.warnings?.[0];
        setScanInfo({
          tone: 'warn',
          text: w ?? "No s'ha detectat la MRZ (potser és l'anvers del DNI). Tria el tipus a mà.",
        });
      }
    } catch {
      setScanInfo({ tone: 'warn', text: "No s'ha pogut llegir el document; tria el tipus a mà." });
    } finally {
      setScanning(false);
    }
  }

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
          className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <div className="flex min-w-0 items-start gap-3">
            {esImatge ? (
              <button type="button" onClick={() => setLightbox(url)} title="Veure el document" className="relative shrink-0 overflow-hidden rounded border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={TIPUS_DOCUMENT_PUJAT_LABELS[d.tipus]}
                  className="h-14 w-20 object-cover"
                />
                <WatermarkOverlay size="sm" />
              </button>
            ) : (
              <a href={url} target="_blank" rel="noreferrer" className="shrink-0" title="Obrir el document">
                <FileText className="h-6 w-6 text-slate-400" />
              </a>
            )}
            <div className="min-w-0">
              <div className="font-medium text-slate-800">{TIPUS_DOCUMENT_PUJAT_LABELS[d.tipus]}</div>
              <div className="truncate text-xs text-slate-500" title={d.fitxerNom}>{d.fitxerNom}</div>
              <div className="mt-0.5 text-xs text-slate-400">{formatDate(d.dataSubida)}</div>
            </div>
          </div>
          {canWrite && (
            <button className="shrink-0 text-slate-400 hover:text-red-600" onClick={() => esborrar(d.id)} aria-label="Eliminar document">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
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
                onChange={(e) => triaFitxer(e.target.files?.[0] ?? null)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs"
              />
            </Field>
          </div>
          <p className="text-xs text-slate-400">
            En triar una foto es llegeix sola (DNI, NIE o passaport) i s’omple el tipus. Fes la foto de la cara amb les línies «&lt;&lt;&lt;».
          </p>
          {scanning && <p className="text-xs font-medium text-brand-700">Llegint el document…</p>}
          {scanInfo && (
            <p className={cn('text-xs', scanInfo.tone === 'ok' ? 'text-green-700' : 'text-amber-700')}>
              {scanInfo.text}
            </p>
          )}
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
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt="Document"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
            <WatermarkOverlay size="lg" />
          </div>
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

/**
 * Marca d'aigua "HOSTAL COLL" repetida, dibuixada AL NAVEGADOR sobre la imatge
 * (fiable: el navegador sí que té fonts, a diferència del servidor de Vercel).
 */
function WatermarkOverlay({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const text = size === 'sm' ? 'text-[7px]' : 'text-2xl sm:text-3xl';
  const rows = size === 'sm' ? 2 : 3;
  const cols = size === 'sm' ? 2 : 2;
  const rowGap = size === 'sm' ? 'gap-2' : 'gap-16';
  const colGap = size === 'sm' ? 'gap-2' : 'gap-16';
  return (
    <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center overflow-hidden select-none ${rowGap}`}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={`flex whitespace-nowrap ${colGap}`} style={{ transform: 'rotate(-30deg)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <span key={c} className={`${text} font-bold uppercase tracking-wider text-black/20`}>
              HOSTAL COLL
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
