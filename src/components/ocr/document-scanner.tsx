'use client';

import { useRef, useState } from 'react';
import { ScanLine, Upload, CheckCircle2, AlertTriangle, FileText, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { optionsFrom, tipusDocumentPujatValues, TIPUS_DOCUMENT_PUJAT_LABELS } from '@/lib/validation/enums';
import { findMrzLines, parseMrz, mrzToViatger, type ViatgerOcr } from '@/lib/ocr/mrz';

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
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  async function processFile(file: File) {
    setBusy(true);
    setProgress(0);
    setMsg(null);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      await worker.setParameters({ tessedit_char_whitelist: MRZ_CHARS });
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const mrz = parseMrz(findMrzLines(data.text));
      if (!mrz) {
        setMsg({
          tone: 'warn',
          text: 'Document desat. No s’ha trobat la zona MRZ per autoreplenar: si és un DNI/passaport, fes una foto nítida on es vegin les línies «<<<».',
        });
        return;
      }
      const v = mrzToViatger(mrz);
      onExtract(v);
      setMsg({
        tone: v.valid ? 'ok' : 'warn',
        text: v.valid
          ? 'Document llegit i validat. Revisa els accents (la MRZ no en porta).'
          : 'Document llegit, però algun dígit de control no quadra: revisa les dades.',
      });
    } catch {
      setMsg({ tone: 'warn', text: 'Document desat, però no s’ha pogut llegir el text per autoreplenar.' });
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // permet tornar a triar el mateix fitxer
    for (const file of files) onImage?.(file); // desa cada foto/fitxer com a document
    // OCR (autoreplenat) només amb la primera imatge.
    const first = files[0];
    if (first && first.type.startsWith('image/')) processFile(first);
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
        <span className="text-sm font-medium text-slate-700">Documents d’identitat</span>
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

      <p className="mt-1.5 text-xs text-slate-500">
        DNI / passaport: autoreplena nom, cognoms, document, naixement, sexe i nacionalitat. Cada foto
        es desa xifrada, en blanc i negre i amb marca d’aigua. Pots afegir-ne diversos (DNI anvers i
        revers, carnet de conduir…).
      </p>

      {msg && (
        <p
          className={`mt-2 flex items-center gap-1.5 text-xs ${
            msg.tone === 'ok' ? 'text-green-700' : 'text-amber-700'
          }`}
        >
          {msg.tone === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {msg.text}
        </p>
      )}

      {list.length > 0 && (
        <ul className="mt-2 space-y-2">
          {list.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
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
              <button
                type="button"
                className="text-slate-400 hover:text-red-600"
                onClick={() => onRemoveDoc?.(d.id)}
                aria-label="Treure document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          <li className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lock className="h-3 w-3" /> Es desen en crear l’estada.
          </li>
        </ul>
      )}
    </div>
  );
}
