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
 * En triar/treure, DESA l'enllaç a l'instant (PATCH …/estada), així no cal
 * recordar de clicar "Desar" perquè quedi enllaçat.
 */
export function EstadaPicker({
  pressupostId,
  estanciaId,
  estanciaLabel,
  onSelect,
  onClear,
}: {
  pressupostId: string;
  estanciaId: string | null;
  estanciaLabel: string | null;
  onSelect: (id: string, label: string) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<EstadaHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  // Persisteix l'enllaç a l'instant. Retorna true si ha anat bé.
  async function desaEnllac(id: string | null): Promise<{ ok: boolean; label: string | null }> {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/pressupostos/${pressupostId}/estada`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estanciaId: id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No s’ha pogut desar l’enllaç');
      return { ok: true, label: d.label ?? null };
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No s’ha pogut desar l’enllaç');
      return { ok: false, label: null };
    } finally {
      setSaving(false);
    }
  }

  async function tria(h: EstadaHit) {
    const r = await desaEnllac(h.id);
    if (r.ok) {
      onSelect(h.id, r.label ?? h.label);
      setOpen(false);
      setQ('');
    }
  }

  async function treu() {
    const r = await desaEnllac(null);
    if (r.ok) onClear();
  }

  if (estanciaId) {
    return (
      <div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-700">
            Enllaçat a <strong>{estanciaLabel ?? 'una estada'}</strong>
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={treu} disabled={saving}>
            <X className="h-4 w-4" /> {saving ? 'Desant…' : 'Treure'}
          </Button>
        </div>
        {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
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
        disabled={saving}
      />
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
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
                disabled={saving}
                onClick={() => tria(h)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
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
