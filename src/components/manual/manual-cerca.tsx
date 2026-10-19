'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SeccioIndex } from '@/lib/manual/capitols';

const net = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Cercador del manual: busca a títols i textos de totes les seccions (sense accents). */
export function ManualCerca({
  seccions,
  capitols,
}: {
  seccions: SeccioIndex[];
  capitols: { slug: string; titol: string }[];
}) {
  const [q, setQ] = useState('');
  const titolCap = useMemo(() => new Map(capitols.map((c) => [c.slug, c.titol])), [capitols]);

  const resultats = useMemo(() => {
    const paraules = net(q).split(/\s+/).filter((p) => p.length > 1);
    if (paraules.length === 0) return [];
    return seccions
      .map((s) => {
        const t = net(s.titol);
        const tx = net(s.text);
        if (!paraules.every((p) => t.includes(p) || tx.includes(p))) return null;
        const punts = paraules.reduce((a, p) => a + (t.includes(p) ? 10 : 0) + (tx.includes(p) ? 1 : 0), 0);
        return { s, punts };
      })
      .filter((x): x is { s: SeccioIndex; punts: number } => x !== null)
      .sort((a, b) => b.punts - a.punts)
      .slice(0, 30);
  }, [q, seccions]);

  return (
    <div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          id="manual-cerca"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Què vols fer? Ex.: factura rectificativa, passaport, canviar d’habitació…"
          className="h-12 pl-10 text-base"
          aria-label="Cercar al manual"
        />
      </label>
      {q.trim().length > 1 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white">
          {resultats.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No hi ha cap apartat amb aquestes paraules. Prova-ho amb una altra paraula.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {resultats.map(({ s }) => (
                <li key={`${s.capitol}#${s.id}`}>
                  <Link href={`/manual/${s.capitol}#${s.id}`} className="block px-4 py-2.5 hover:bg-brand-50/50">
                    <span className="block text-sm font-medium text-slate-900">{s.titol}</span>
                    <span className="block text-xs text-slate-500">{titolCap.get(s.capitol)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
