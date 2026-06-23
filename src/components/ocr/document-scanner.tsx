'use client';

import { useRef, useState } from 'react';
import { ScanLine, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findMrzLines, parseMrz, mrzToViatger, type ViatgerOcr } from '@/lib/ocr/mrz';

const MRZ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';

/**
 * Escàner de DNI/passaport: OCR al NAVEGADOR (tesseract.js, sense credencials),
 * llegeix la zona MRZ i autoreplena el formulari (corregible). Es pot fer una
 * foto amb la càmera o pujar una imatge existent (galeria/fitxers). Si no troba
 * MRZ, avisa que cal que es vegin les línies "<<<" del document.
 */
export function DocumentScanner({ onExtract }: { onExtract: (v: ViatgerOcr) => void }) {
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
          text: 'No s’ha trobat la zona MRZ. Fes (o puja) una imatge nítida on es vegin les línies «<<<» del document.',
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
      setMsg({ tone: 'warn', text: 'No s’ha pogut processar la imatge. Torna-ho a provar.' });
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet re-escanejar el mateix fitxer
    if (file) processFile(file);
  }

  return (
    <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Càmera: força el dispositiu de captura al mòbil */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onFile}
        />
        {/* Pujada: galeria / fitxers (sense capture) */}
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => cameraRef.current?.click()}>
          <ScanLine className="h-4 w-4" />
          {busy ? `Llegint… ${progress}%` : 'Fer foto'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => uploadRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Pujar foto
        </Button>
        <span className="text-xs text-slate-500">
          DNI / passaport · autoreplena nom, cognoms, document, naixement, sexe i nacionalitat.
        </span>
      </div>
      {msg && (
        <p
          className={`mt-2 flex items-center gap-1.5 text-xs ${
            msg.tone === 'ok' ? 'text-green-700' : 'text-amber-700'
          }`}
        >
          {msg.tone === 'ok' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {msg.text}
        </p>
      )}
    </div>
  );
}
