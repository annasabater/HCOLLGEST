'use client';

import { useId } from 'react';
import { formatEur } from '@/lib/utils';
import { useAmountsHidden } from '@/components/finances/amounts-visibility';

/** Colors compartits amb el gràfic mes a mes. */
export const COLORS_BALANC = {
  ingressos: '#1F8A55',
  despeses: '#D0485A',
  benefici: '#7A1F2B',
  beneficiTotal: '#115E59',
  rebudes: '#0F766E',
  pagades: '#B45309',
};

/** Patró ratllat per a les fiances (no són ingrés ni despesa). */
export function PatroRatllat({ id, color }: { id: string; color: string }) {
  return (
    <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width={6} height={6} fill={color} opacity={0.16} />
      <rect width={3} height={6} fill={color} />
    </pattern>
  );
}

/** Treu els valors d'eix nuls i els que quedarien enganxats a un altre (< 16 px). */
export function separaTicks(vals: (number | null)[], y: (v: number) => number): number[] {
  const out: number[] = [];
  for (const v of vals) {
    if (v === null) continue;
    if (out.some((o) => Math.abs(y(o) - y(v)) < 16)) continue;
    out.push(v);
  }
  return out;
}

/** Mostra de llegenda ratllada (HTML). */
export function MostraRatllada({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-sm"
      style={{ background: `repeating-linear-gradient(135deg, ${color} 0 3px, ${color}29 3px 6px)` }}
    />
  );
}

/**
 * Cascada «del benefici a la caixa»: Ingressos − Despeses = Benefici real;
 * + fiances rebudes = Benefici total; − fiances pagades = moviment de caixa del període.
 */
export function CascadaCaixa({
  ingressos,
  despeses,
  rebudes,
  pagades,
}: {
  ingressos: number;
  despeses: number;
  rebudes: number;
  pagades: number;
}) {
  const { hidden } = useAmountsHidden();
  const uid = useId().replace(/:/g, '');
  const eur = (v: number) => (hidden ? '••••' : formatEur(v));
  const benefici = ingressos - despeses;
  const caixa = benefici + rebudes - pagades;

  type Pas = { l: string; a: number; b: number; color: string; ratllat?: boolean; signe?: boolean; v: number };
  const passos: Pas[] = [];
  passos.push({ l: 'Ingressos', a: 0, b: ingressos, v: ingressos, color: COLORS_BALANC.ingressos });
  passos.push({ l: 'Despeses', a: ingressos, b: benefici, v: -despeses, color: COLORS_BALANC.despeses, signe: true });
  passos.push({ l: 'Benefici real', a: 0, b: benefici, v: benefici, color: COLORS_BALANC.benefici });
  passos.push({ l: '+ Fiances rebudes', a: benefici, b: benefici + rebudes, v: rebudes, color: COLORS_BALANC.rebudes, ratllat: true, signe: true });
  // Benefici total = benefici real + fiances rebudes (el que tens abans de pagar fiances).
  passos.push({ l: 'Benefici total', a: 0, b: benefici + rebudes, v: benefici + rebudes, color: COLORS_BALANC.beneficiTotal });
  passos.push({ l: '− Fiances pagades', a: benefici + rebudes, b: caixa, v: -pagades, color: COLORS_BALANC.pagades, ratllat: true, signe: true });
  passos.push({ l: 'Moviment de caixa', a: 0, b: caixa, v: caixa, color: caixa >= 0 ? COLORS_BALANC.ingressos : COLORS_BALANC.despeses });

  const W = 900, H = 300, L = 70, R = 12, T = 26, B = 56;
  const valors = passos.flatMap((p) => [p.a, p.b]);
  const maxV = Math.max(1, ...valors);
  const minV = Math.min(0, ...valors);
  const y = (v: number) => T + ((maxV - v) / (maxV - minV || 1)) * (H - T - B);
  const n = passos.length;
  const slot = (W - L - R) / n;
  const bw = Math.min(110, slot * 0.62);
  const ticks = separaTicks([maxV, minV < 0 ? null : maxV / 2, 0, minV < 0 ? minV : null], y);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Del benefici a la caixa">
      <defs>
        <PatroRatllat id={`${uid}-r`} color={COLORS_BALANC.rebudes} />
        <PatroRatllat id={`${uid}-p`} color={COLORS_BALANC.pagades} />
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#cbd5e1' : '#f1f5f9'} />
          <text x={L - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">
            {hidden ? '••••' : formatEur(Math.round(t))}
          </text>
        </g>
      ))}
      {passos.map((p, i) => {
        const x = L + slot * i + (slot - bw) / 2;
        const top = y(Math.max(p.a, p.b));
        const bot = y(Math.min(p.a, p.b));
        const fill = p.ratllat ? `url(#${uid}-${p.color === COLORS_BALANC.rebudes ? 'r' : 'p'})` : p.color;
        const amunt = p.v >= 0;
        const next = passos[i + 1];
        return (
          <g key={p.l}>
            <rect x={x} y={top} width={bw} height={Math.max(1.5, bot - top)} rx={4} fill={fill}>
              <title>{`${p.l}: ${eur(p.v)}`}</title>
            </rect>
            {next && (
              <line
                x1={x + bw}
                x2={L + slot * (i + 1) + (slot - bw) / 2}
                y1={y(p.b)}
                y2={y(p.b)}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
            )}
            <text
              x={x + bw / 2}
              y={amunt ? top - 7 : bot + 15}
              textAnchor="middle"
              fontSize={11.5}
              fontWeight={700}
              fill="#1e293b"
            >
              {p.signe && p.v > 0 ? '+' : ''}
              {eur(p.v)}
            </text>
            <text x={L + slot * i + slot / 2} y={H - 10} textAnchor="middle" fontSize={11} fill="#64748b">
              {p.l}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
