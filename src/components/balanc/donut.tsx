'use client';

import { Eur } from '@/components/finances/amounts-visibility';

const COLORS = [
  '#7a1f2b',
  '#c96875',
  '#e0a3aa',
  '#b0414f',
  '#9c3540',
  '#5c1620',
  '#d4a373',
  '#6b8e9e',
  '#8a8a8a',
  '#c9b458',
  '#5a7d5a',
  '#a0522d',
];

/** Donut (CSS conic-gradient) amb llegenda. Mostra els imports i el %. */
export function Donut({ items }: { items: { label: string; value: number }[] }) {
  const total = items.reduce((a, x) => a + x.value, 0);
  if (total <= 0) {
    return <p className="text-sm text-slate-400">Sense dades en aquest període.</p>;
  }

  let acc = 0;
  const stops = items
    .map((it, i) => {
      const from = (acc / total) * 100;
      acc += it.value;
      const to = (acc / total) * 100;
      return `${COLORS[i % COLORS.length]} ${from}% ${to}%`;
    })
    .join(', ');

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="relative h-40 w-40 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
      >
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white text-center">
          <span className="text-[10px] uppercase text-slate-400">Total</span>
          <span className="text-sm font-bold text-slate-800"><Eur value={total} /></span>
        </div>
      </div>
      <ul className="flex-1 space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1 text-slate-700">{it.label}</span>
            <span className="font-medium text-slate-800"><Eur value={it.value} /></span>
            <span className="w-10 text-right text-xs text-slate-400">
              {Math.round((it.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
