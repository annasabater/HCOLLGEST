'use client';

import { useRef, useState, useEffect } from 'react';
import { ScanLine, Upload, CheckCircle2, AlertTriangle, FileText, Trash2, Lock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { optionsFrom, tipusDocumentPujatValues, TIPUS_DOCUMENT_PUJAT_LABELS } from '@/lib/validation/enums';
import { findMrzLines, parseMrz, mrzToViatger, parseDniReverso, type ViatgerOcr } from '@/lib/ocr/mrz';

// Alfabet de la MRZ (lletres, dígits i el separador '<'): restringir-lo fa la
// lectura molt més fiable, ja que la MRZ només conté aquests caràcters.
const MRZ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';

export interface PendingDoc {
  id: string;
  file: File;
  tipus: string;
}

/**
 * Captura de documents d'identitat en un sol bloc: fer foto o pujar (DNI,
 * passaport, carnet de conduir…). Cada document:
 *  - si és DNI/passaport, es llegeix la zona MRZ al NAVEGADOR (tesseract.js, sense
 *    credencials) i s'autoreplena el formulari (corregible);
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
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn'; text: string; items?: string[]; mrz?: string[] } | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Si està desactivat, la foto NOMÉS es desa (no llegeix ni autoreplena el formulari).
  const [autoreplenar, setAutoreplenar] = useState(true);

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

  // OCR 100% AL NAVEGADOR (tesseract.js): la imatge NO s'envia a cap servidor
  // (ni al nostre, ni a cap tercer). Es llegeix la zona MRZ localment i, amb els
  // dígits de control, s'autoreplena el formulari. La foto s'emmagatzema a part
  // (xifrada) només si l'usuari la desa; aquest OCR no la transmet enlloc.
  async function processFile(file: File) {
    setBusy(true);
    setProgress(5);
    setMsg(null);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });

      // 1a passada: zona MRZ amb alfabet restringit (la lectura més fiable).
      await worker.setParameters({ tessedit_char_whitelist: MRZ_CHARS });
      const passMrz = await worker.recognize(file);
      const mrzLines = findMrzLines(passMrz.data.text);
      const mrz = parseMrz(mrzLines);

      // 2a passada: text lliure NOMÉS per llegir l'adreça del revers (no la
      // identitat: el nom/número surten de la MRZ, validats). Així no s'inventa res.
      await worker.setParameters({ tessedit_char_whitelist: '' });
      const passFull = await worker.recognize(file);
      const revers = parseDniReverso(passFull.data.text);
      await worker.terminate();
      setProgress(100);

      const mrzForDisplay = mrzLines.length > 0 ? mrzLines : undefined;

      if (mrz && mrz.valid) {
        // Dígits de control OK → dades fiables.
        const base = mrzToViatger(mrz);
        const result: ViatgerOcr = revers
          ? { ...base, adreca: revers.adreca, codiPostal: revers.codiPostal, localitat: revers.localitat, provinciaNom: revers.provinciaNom }
          : base;
        onExtract(result);
        setMsg({
          tone: 'ok',
          text: 'Dades llegides i validades (MRZ). Compara-les amb el document i corregeix els accents si cal (la MRZ no en porta).',
          mrz: mrzForDisplay,
        });
      } else if (revers && (revers.adreca || revers.codiPostal || revers.localitat)) {
        // No hi ha MRZ vàlida però sí adreça del revers: l'aprofitem.
        onExtract(revers);
        setMsg({
          tone: 'warn',
          text: 'Adreça llegida del revers. La identitat (MRZ) no s\'ha pogut validar: revisa-la o escaneja la cara amb les línies «<<<».',
          mrz: mrzForDisplay,
        });
      } else if (mrz && !mrz.valid) {
        setMsg({
          tone: 'warn',
          text: "S'ha detectat la MRZ però els dígits de control no quadren (lectura poc nítida). No s'ha autoreplenat res per no posar dades incorrectes; fes una foto més nítida o omple-ho a mà.",
          mrz: mrzForDisplay,
        });
      } else {
        setMsg({
          tone: 'warn',
          text: "No s'ha detectat la zona MRZ (les línies «<<<»). Al DNI/NIE és al REVERS i al passaport a la pàgina de la foto. Escaneja aquesta cara o omple-ho a mà.",
        });
      }
    } catch {
      setMsg({ tone: 'warn', text: "No s'ha pogut llegir el document al navegador. Torna-ho a provar o omple-ho a mà." });
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
    <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/40 p-3">
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
        DNI (anvers i revers), passaport, NIE o carnet de conduir. S&apos;autoreplenen totes les dades
        disponibles i totes les fotos es desen xifrades, en pots afegir diverses.
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
            <div className="mt-2">
              <p className="text-[11px] font-medium text-slate-500">
                MRZ llegida (compara-la amb el document; si veus un error, corregeix el camp al formulari):
              </p>
              <pre className="mt-1 overflow-x-auto rounded border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[11px] leading-tight tracking-wider text-slate-700">
                {msg.mrz.join('\n')}
              </pre>
            </div>
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
                    className="text-slate-400 hover:text-brand-600"
                    onClick={() => setLightbox(thumb)}
                    title="Veure imatge gran"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  className="text-slate-400 hover:text-red-600"
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
