'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EstadaHit {
  id: string;
  label: string;
  sub: string;
}

/**
 * Cercador per assignar el pressupost a una estada (per número de contracte).
 * Reutilitza el buscador global (/api/cerca) i n'agafa el grup "Estades".
 */
export function EstadaPicker({
  estanciaId,
  estanciaLabel,
  onSelect,
  onClear,
}: {
  estanciaId: string | null;
  estanciaLabel: string | null;
  onSelect: (id: string, label: string) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<EstadaHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cerca?q=${encodeURIComponent(q.trim())}`);
        const d = await res.json();
        const grup = (d.grups ?? []).find((g: { titol: string }) => g.titol === 'Estades');
        if (!cancel) setHits((grup?.hits as EstadaHit[]) ?? []);
      } catch {
        if (!cancel) setHits([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  if (estanciaId) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-sm text-slate-700">
          Enllaçat a <strong>{estanciaLabel ?? 'una estada'}</strong>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" /> Treure
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder="Cerca l’estada pel número de contracte…"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-sm text-slate-400">Cercant…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">Cap estada trobada.</p>
          ) : (
            hits.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  onSelect(h.id, h.label);
                  setOpen(false);
                  setQ('');
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{h.label}</span>
                <span className="text-slate-400">{h.sub}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
