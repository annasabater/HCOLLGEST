'use client';

import { formatEur } from '@/lib/utils';
import { useAmountsHidden } from '@/components/finances/amounts-visibility';

export interface PuntMes {
  label: string;
  barA: number; // ingressos
  barB: number; // despeses
  linia: number; // benefici
}

/**
 * Gràfica de barres agrupades (ingressos/despeses) amb la línia de benefici a
 * sobre, a l'estil dels gràfics financers clàssics. SVG pur, sense llibreries.
 */
export function BalancLineChart({
  titol,
  punts,
  nomA,
  nomB,
  nomLinia,
  colorA = '#22c55e',
  colorB = '#f87171',
  colorLinia = '#7A1F2B',
}: {
  titol: string;
  punts: PuntMes[];
  nomA: string;
  nomB: string;
  nomLinia: string;
  colorA?: string;
  colorB?: string;
  colorLinia?: string;
}) {
  const { hidden } = useAmountsHidden();
  const eur = (v: number) => (hidden ? '••••' : formatEur(v));

  const W = 760, H = 280, L = 58, R = 12, T = 16, B = 28;
  const iw = W - L - R;
  const ih = H - T - B;

  const maxV = Math.max(1, ...punts.map((p) => Math.max(p.barA, p.barB, p.linia)));
  const minV = Math.min(0, ...punts.map((p) => p.linia));
  const y = (v: number) => T + ((maxV - v) / (maxV - minV || 1)) * ih;
  const y0 = y(0);

  const n = Math.max(1, punts.length);
  const gw = iw / n;
  const bw = Math.min(24, gw * 0.3);

  // Línies de referència: màxim, meitat i zero (i mínim si hi ha negatius).
  const ticks = [maxV, maxV / 2, 0, ...(minV < 0 ? [minV] : [])];

  const centres = punts.map((_, i) => L + gw * i + gw / 2);
  const liniaPunts = punts.map((p, i) => `${centres[i]},${y(p.linia)}`).join(' ');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">{titol}</h3>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: colorA }} /> {nomA}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: colorB }} /> {nomB}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: colorLinia }} /> {nomLinia}
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={titol}>
        {/* Línies de referència + valors de l'eix */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} y1={y(t)} x2={W - R} y2={y(t)} stroke={t === 0 ? '#cbd5e1' : '#f1f5f9'} strokeWidth={1} />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">
              {hidden ? '••••' : formatEur(t)}
            </text>
          </g>
        ))}

        {/* Barres agrupades */}
        {punts.map((p, i) => {
          const xc = centres[i]!;
          return (
            <g key={i}>
              <rect
                x={xc - bw - 1.5}
                y={Math.min(y(p.barA), y0)}
                width={bw}
                height={Math.max(0.5, Math.abs(y0 - y(p.barA)))}
                rx={2}
                fill={colorA}
              >
                <title>{`${p.label}: ${nomA} ${eur(p.barA)}`}</title>
              </rect>
              <rect
                x={xc + 1.5}
                y={Math.min(y(p.barB), y0)}
                width={bw}
                height={Math.max(0.5, Math.abs(y0 - y(p.barB)))}
                rx={2}
                fill={colorB}
              >
                <title>{`${p.label}: ${nomB} ${eur(p.barB)}`}</title>
              </rect>
              <text x={xc} y={H - 8} textAnchor="middle" fontSize={9.5} fill="#94a3b8">
                {p.label}
              </text>
            </g>
          );
        })}

        {/* Línia de benefici + punts */}
        {punts.length > 1 && (
          <polyline points={liniaPunts} fill="none" stroke={colorLinia} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {punts.map((p, i) => (
          <circle key={i} cx={centres[i]} cy={y(p.linia)} r={3.2} fill="#fff" stroke={colorLinia} strokeWidth={2}>
            <title>{`${p.label}: ${nomLinia} ${eur(p.linia)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
