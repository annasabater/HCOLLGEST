'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getJSON } from '@/lib/api';

/** Dades d'un hoste reaprofitable (fitxa CRM). Les dates arriben com a ISO. */
export type HosteLite = {
  id: string;
  nom: string;
  cognom1: string;
  cognom2: string | null;
  sexe: string | null;
  dataNaixement: string | null;
  nacionalitat: string | null;
  tipusDocument: string | null;
  numDocument: string | null;
  numSuport: string | null;
  dataExpedicio: string | null;
  email: string | null;
  telefon: string | null;
  adreca: string | null;
  pais: string | null;
  provincia: string | null;
  municipi: string | null;
  localitat: string | null;
  codiPostal: string | null;
};

/**
 * Cercador d'hostes existents per reaprofitar la seva fitxa (nom, document,
 * email o telèfon). En seleccionar-ne un, crida onSelect amb les seves dades.
 */
export function HosteSearch({ onSelect }: { onSelect: (h: HosteLite) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<HosteLite[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await getJSON<{ huespedes: HosteLite[] }>(`/api/huespedes?q=${encodeURIComponent(term)}`);
        if (!cancel) {
          setResults(r.huespedes.slice(0, 8));
          setOpen(true);
        }
      } catch {
        if (!cancel) setResults([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  // Tanca el desplegable en clicar fora.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-8"
          placeholder="Reaprofitar un hoste existent (nom, document, email…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {q && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => {
              setQ('');
              setResults([]);
            }}
            aria-label="Esborrar cerca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && q.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">{loading ? 'Cercant…' : 'Cap coincidència'}</li>
          ) : (
            results.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    onSelect(h);
                    setOpen(false);
                    setQ('');
                    setResults([]);
                  }}
                >
                  <span className="font-medium text-slate-800">
                    {h.nom} {h.cognom1} {h.cognom2 ?? ''}
                  </span>
                  <span className="text-xs text-slate-500">{h.numDocument ?? ''}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
