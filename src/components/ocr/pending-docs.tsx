'use client';

import { useRef } from 'react';
import { Camera, Upload, Trash2, FileText, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { optionsFrom, tipusDocumentPujatValues, TIPUS_DOCUMENT_PUJAT_LABELS } from '@/lib/validation/enums';

export interface PendingDoc {
  id: string;
  file: File;
  tipus: string;
}

/**
 * Documents d'identitat pendents de desar per a un viatger del formulari de nova
 * estada. Permet fer foto o pujar diversos fitxers (DNI anvers/revers, carnet de
 * conduir…). Es desen després de crear l'estada (xifrats, en B/N + marca d'aigua).
 */
export function PendingDocs({
  docs,
  onAdd,
  onRemove,
  onTipus,
}: {
  docs: PendingDoc[];
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
  onTipus: (id: string, tipus: string) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) for (const f of Array.from(files)) onAdd(f);
    e.target.value = ''; // permet tornar a triar el mateix fitxer
  }

  const opts = optionsFrom(tipusDocumentPujatValues, TIPUS_DOCUMENT_PUJAT_LABELS);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:col-span-2 lg:col-span-3">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={onFile} />
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
        <span className="text-xs text-slate-400">({docs.length})</span>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4" /> Fer foto
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => uploadRef.current?.click()}>
            <Upload className="h-4 w-4" /> Pujar
          </Button>
        </div>
      </div>

      {docs.length > 0 && (
        <ul className="mt-2 space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-slate-700">{d.file.name}</span>
              <Select value={d.tipus} onChange={(e) => onTipus(d.id, e.target.value)} className="h-8 w-44">
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                className="text-slate-400 hover:text-red-600"
                onClick={() => onRemove(d.id)}
                aria-label="Treure document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5" /> Es desen xifrats, en blanc i negre i amb marca d’aigua. Pots
        afegir-ne diversos (DNI anvers i revers, carnet de conduir…).
      </p>
    </div>
  );
}
