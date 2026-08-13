'use client';

import { useRef, useState, useEffect } from 'react';
import { ScanLine, Upload, CheckCircle2, AlertTriangle, FileText, Trash2, Lock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { optionsFrom, tipusDocumentPujatValues, TIPUS_DOCUMENT_PUJAT_LABELS } from '@/lib/validation/enums';
import type { ViatgerOcr } from '@/lib/ocr/mrz';

export interface PendingDoc {
  id: string;
  file: File;
  tipus: string;
}

/**
 * Captura de documents d'identitat en un sol bloc: fer foto o pujar (DNI,
 * passaport, carnet de conduir…). Cada document:
 *  - si és DNI/passaport, es transcriu la zona MRZ (Claude Vision, /api/ocr/document)
 *    i, validant els dígits de control, s'autoreplena el formulari (corregible);
 *  - s'afegeix a la llista per desar-lo (al servidor: xifrat, B/N + marca d'aigua).
 * Es poden afegir diversos (DNI anvers i revers, carnet de conduir…).
 */
export function DocumentScanner({
  onExtract,
  onImage,
  docs,
  onRemoveDoc,
  onTipusDoc,
}: {
  onExtract: (v: ViatgerOcr) => void;
  onImage?: (file: File) => void; // la foto capturada, per desar-la com a document
  docs?: PendingDoc[];
  onRemoveDoc?: (id: string) => void;
  onTipusDoc?: (id: string, tipus: string) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn'; text: string; items?: string[]; mrz?: string[] } | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Si està desactivat, la foto NOMÉS es desa (no llegeix ni autoreplena el formulari).
  const [autoreplenar, setAutoreplenar] = useState(true);
  // True quan ja s'han llegit dades d'una cara: així, si després escaneges la cara
  // del davant (sense MRZ), no es sobreescriu ni s'ensenya un avís confús.
  const [readOk, setReadOk] = useState(false);

  // Genera URLs de previsualització per a cada imatge pendent
  useEffect(() => {
    const list = docs ?? [];
    const urls: Record<string, string> = {};
    list.forEach((d) => {
      if (d.file.type.startsWith('image/')) {
        urls[d.id] = URL.createObjectURL(d.file);
      }
    });
    setPreviews(urls);
    return () => { Object.values(urls).forEach(URL.revokeObjectURL); };
  }, [docs]);

  // Safari (iPadOS): quan aquest escàner creix (afegeix miniatures o el resultat
  // de l'OCR), el CSS grid del formulari a vegades NO recalcula l'alçada de la
  // fila i les etiquetes de sota se solapen fins que recarregues. Forcem el
  // reflow del grid contenidor amb un toggle de display (imperceptible; no afecta
  // altres navegadors, que ja reflueixen bé).
  useEffect(() => {
    const grid = rootRef.current?.closest('.grid') as HTMLElement | null;
    if (!grid) return;
    const prev = grid.style.display;
    grid.style.display = 'block';
    void grid.offsetHeight; // força el reflow amb el nou contingut
    grid.style.display = prev;
    void grid.offsetHeight;
  }, [docs, msg, busy, previews]);

  async function processFile(file: File) {
    setBusy(true);
    setProgress(10);
    setMsg(null);
    try {
      const formData = new FormData();
      formData.append('image', file);

      setProgress(30);
      const res = await fetch('/api/ocr/document', { method: 'POST', body: formData });
      setProgress(90);

      if (!res.ok) {
        // Si ja hem llegit bé una cara abans (p.ex. el darrere), aquesta és
        // segurament la cara del davant (sense MRZ): NO espantem ni sobreescrivim.
        if (readOk) {
          setMsg({ tone: 'ok', text: 'Aquesta cara no té MRZ (p.ex. el davant): s\'ha desat com a foto. Les dades ja s\'han llegit de l\'altra cara.' });
          return;
        }
        // 422: s'ha desat la foto però no s'ha pogut llegir la MRZ. El cos porta
        // `warnings` amb el motiu concret (sense MRZ / dígits no quadren).
        let items: string[] | undefined;
        let mrz: string[] | undefined;
        let detail = '';
        try {
          const j = (await res.json()) as { error?: string; warnings?: string[]; mrzLines?: string[] };
          if (j.warnings && j.warnings.length > 0) items = j.warnings;
          else if (j.error) detail = ` (${j.error})`;
          if (j.mrzLines && j.mrzLines.length > 0) mrz = j.mrzLines;
        } catch { /* ignore */ }
        setMsg({
          tone: 'warn',
          text: items
            ? 'Foto desada. No s\'han pogut autoreplenar les dades:'
            : `Document desat, però no s'ha pogut llegir el text${detail}. Torna-ho a provar o omple-ho a mà.`,
          items,
          mrz,
        });
        return;
      }

      const { result, warnings, mrzLines } = (await res.json()) as {
        result: ViatgerOcr;
        warnings: string[];
        mrzLines?: string[];
      };
      setProgress(100);

      const hasUsefulData = result.nom || result.cognom1 || result.numDocument || result.adreca;
      if (!hasUsefulData) {
        // Si ja teníem una lectura bona, no la trepitgem amb un avís.
        if (readOk) {
          setMsg({ tone: 'ok', text: 'Aquesta cara no té MRZ: s\'ha desat com a foto. Les dades ja s\'han llegit de l\'altra cara.' });
          return;
        }
        setMsg({
          tone: 'warn',
          text: "Document desat, però no s'han pogut llegir les dades. Fes una foto nítida i ben enquadrada. Pots omplir-ho a mà.",
          mrz: mrzLines,
        });
        return;
      }

      onExtract({ ...result, warnings });
      setReadOk(true);

      if (warnings && warnings.length > 0) {
        // Prioritza els avisos de lectura ("no s'ha pogut llegir…") i, després, les
        // incoherències (titular menor, etc.). Cada avís es mostra en una línia.
        const prioritari = (w: string) =>
          /no s.?ha pogut llegir|no s.?ha llegit|il·legible|no s.?ha reconegut|sense llegir/i.test(w);
        const items = [...warnings].sort((a, b) => Number(prioritari(b)) - Number(prioritari(a)));
        setMsg({ tone: 'warn', text: 'Dades llegides. Revisa els camps del formulari i aquests avisos:', items, mrz: mrzLines });
      } else {
        setMsg({
          tone: 'ok',
          text: 'Dades llegides correctament. Revisa-les als camps del formulari i corregeix el que calgui.',
          mrz: mrzLines,
        });
      }
    } catch {
      setMsg({ tone: 'warn', text: "Document desat, però no s'ha pogut llegir el text per autoreplenar." });
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // permet tornar a triar el mateix fitxer
    for (const file of files) onImage?.(file); // desa cada foto/fitxer com a document
    // OCR (autoreplenat) només amb la primera imatge, i només si està activat.
    const first = files[0];
    if (autoreplenar && first && first.type.startsWith('image/')) processFile(first);
  }

  const opts = optionsFrom(tipusDocumentPujatValues, TIPUS_DOCUMENT_PUJAT_LABELS);
  const list = docs ?? [];

  return (
    <div ref={rootRef} className="rounded-lg border border-dashed border-brand-300 bg-brand-50/40 p-3">
      {/* Càmera: força el dispositiu de captura al mòbil */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onFile} />
      {/* Pujada: galeria / fitxers (sense capture) */}
      <input
        ref={uploadRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={onFile}
      />

      <div className="flex flex-wrap items-center gap-2">
        <FileText className="h-4 w-4 text-brand-600" />
        <span className="text-sm font-medium text-slate-700">Documents d&apos;identitat</span>
        {list.length > 0 && <span className="text-xs text-slate-400">({list.length})</span>}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => cameraRef.current?.click()}>
            <ScanLine className="h-4 w-4" />
            {busy ? `Llegint… ${progress}%` : 'Fer foto'}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => uploadRef.current?.click()}>
            <Upload className="h-4 w-4" /> Pujar foto
          </Button>
        </div>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={autoreplenar}
          onChange={(e) => setAutoreplenar(e.target.checked)}
        />
        Autoreplenar el formulari amb la foto
        <span className="text-slate-400">(desmarca-ho per només desar la foto, sense tocar les dades)</span>
      </label>

      <p className="mt-1.5 text-xs text-slate-500">
        Per autoreplenar, fes la foto de la cara amb les línies <span className="font-mono">&laquo;&lt;&lt;&lt;&raquo;</span>:
        al <strong>DNI/NIE és el DARRERE</strong> (la cara sense foto) i al <strong>passaport la pàgina de la foto</strong>.
        No passa res si surt una mica girada. Pots afegir-ne més; totes es desen xifrades.
      </p>

      {msg && (
        <div
          className={`mt-2 text-xs ${msg.tone === 'ok' ? 'text-green-700' : 'text-amber-700'}`}
        >
          <p className="flex items-center gap-1.5 font-medium">
            {msg.tone === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {msg.text}
          </p>
          {msg.items && msg.items.length > 0 && (
            <ul className="mt-1 ml-5 list-disc space-y-0.5">
              {msg.items.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {msg.mrz && msg.mrz.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-medium text-slate-500 select-none">
                Veure la MRZ llegida (només per comparar)
              </summary>
              <p className="mt-1 text-[11px] text-slate-400">
                Això és només de referència, <strong>no s&apos;edita aquí</strong>. Si veus cap error,
                corregeix directament el camp al formulari (Nom, Cognom, Document…).
              </p>
              <pre className="mt-1 overflow-x-auto rounded border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[11px] leading-tight tracking-wider text-slate-700">
                {msg.mrz.join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}

      {list.length > 0 && (
        <ul className="mt-2 space-y-2">
          {list.map((d) => {
            const thumb = previews[d.id];
            return (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
              >
                {/* Miniatura o icona */}
                {thumb ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(thumb)}
                    className="shrink-0 relative"
                    title="Veure imatge"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb} alt={d.file.name} className="h-10 w-10 rounded object-cover border border-slate-200" style={{ filter: 'grayscale(100%)' }} />
                  </button>
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="min-w-0 flex-1 truncate text-slate-700">{d.file.name}</span>
                <Select
                  value={d.tipus}
                  onChange={(e) => onTipusDoc?.(d.id, e.target.value)}
                  className="h-8 w-44"
                >
                  {opts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                {thumb && (
                  <button
                    type="button"
                    className="p-2 touch-manipulation text-slate-400 hover:text-brand-600"
                    onClick={() => setLightbox(thumb)}
                    title="Veure imatge gran"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  className="p-2 touch-manipulation text-slate-400 hover:text-red-600"
                  onClick={() => onRemoveDoc?.(d.id)}
                  aria-label="Treure document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
          <li className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="h-3 w-3" /> Es desen en crear l&apos;estada.
          </li>
        </ul>
      )}

      {/* Lightbox */}
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
              style={{ filter: 'grayscale(100%)' }}
            />
            {/* Watermark overlay */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <span
                className="text-3xl font-bold tracking-widest text-black/35 select-none"
                style={{ transform: 'rotate(-30deg)', whiteSpace: 'nowrap' }}
              >
                HOSTAL COLL
              </span>
            </div>
          </div>
          <button
            type="button"
            className="absolute right-4 top-4 text-white/80 hover:text-white text-2xl font-bold"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
