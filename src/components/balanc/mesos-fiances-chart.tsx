'use client';

import { useId, useState } from 'react';
import { formatEur, cn } from '@/lib/utils';
import { useAmountsHidden } from '@/components/finances/amounts-visibility';
import { COLORS_BALANC, MostraRatllada, PatroRatllat, separaTicks } from '@/components/balanc/cascada-caixa';

export interface PuntFiances {
  label: string;
  ingressos: number;
  despeses: number; // personal inclòs
  rebudes: number; // fiances rebudes (custòdia)
  pagades: number; // fiances pagades (recuperables)
}

type Vista = 'sense' | 'amb' | 'nomes';
const SUBTITOL: Record<Vista, string> = {
  sense: 'Ingressos, despeses i benefici real. Les fiances no hi són.',
  amb: 'La fiança surt ratllada a sobre de cada barra. La línia del benefici no canvia.',
  nomes: 'Només fiances: les que has rebut contra les que has pagat, i el saldo que portes.',
};

/**
 * Gràfic mes a mes amb tres vistes: sense fiances, amb fiances (ratllades a sobre
 * de cada barra, sense tocar el benefici) i només fiances (amb el saldo acumulat).
 */
export function MesosFiancesChart({ titol, punts, ambFiances = true }: { titol: string; punts: PuntFiances[]; ambFiances?: boolean }) {
  const { hidden } = useAmountsHidden();
  const uid = useId().replace(/:/g, '');
  const [vista, setVista] = useState<Vista>('sense');
  const v: Vista = ambFiances ? vista : 'sense';
  const eur = (x: number) => (hidden ? '••••' : formatEur(x));

  const W = 900, H = 300, L = 70, R = 70, T = 18, B = 30;
  let acum = 0;
  const files = punts.map((p) => {
    const benefici = p.ingressos - p.despeses;
    const caixa = benefici + p.rebudes - p.pagades;
    acum += p.rebudes - p.pagades;
    return { ...p, benefici, caixa, saldo: acum };
  });

  const valors = files.flatMap((f) =>
    v === 'sense'
      ? [f.ingressos, f.despeses, f.benefici]
      : v === 'amb'
        ? [f.ingressos + f.rebudes, f.despeses + f.pagades, f.benefici, f.caixa]
        : [f.rebudes, f.pagades, f.saldo],
  );
  const maxV = Math.max(1, ...valors);
  const minV = Math.min(0, ...valors);
  const y = (x: number) => T + ((maxV - x) / (maxV - minV || 1)) * (H - T - B);
  const y0 = y(0);
  const n = Math.max(1, files.length);
  const slot = (W - L - R) / n;
  const bw = Math.min(26, slot * 0.3);
  const cx = (i: number) => L + slot * i + slot / 2;
  const ticks = separaTicks([maxV, 0, maxV / 2, minV < 0 ? minV : null, minV < 0 ? minV / 2 : null], y);

  const barra = (x: number, de: number, a: number, fill: string, title: string, key: string) => (
    <rect key={key} x={x} y={Math.min(y(de), y(a))} width={bw} height={Math.max(0.5, Math.abs(y(a) - y(de)))} rx={2} fill={fill}>
      <title>{title}</title>
    </rect>
  );

  const linia = (vals: number[], color: string, nom: string, dash?: string) => {
    const pts = vals.map((val, i) => `${cx(i)},${y(val)}`).join(' ');
    const last = vals.length - 1;
    return (
      <g>
        {vals.length > 1 && <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray={dash} strokeLinejoin="round" />}
        {vals.map((val, i) => (
          <circle key={i} cx={cx(i)} cy={y(val)} r={i === last ? 4.5 : 3.2} fill="#fff" stroke={color} strokeWidth={2}>
            <title>{`${files[i]!.label}: ${nom} ${eur(val)}`}</title>
          </circle>
        ))}
        {last >= 0 && (
          <text x={cx(last) + 9} y={y(vals[last]!) + 4} fontSize={11} fontWeight={700} fill={color}>
            {eur(vals[last]!)}
          </text>
        )}
      </g>
    );
  };

  const llegenda: { k: string; m: React.ReactNode }[] =
    v === 'nomes'
      ? [
          { k: 'Rebudes', m: <MostraRatllada color={COLORS_BALANC.rebudes} /> },
          { k: 'Pagades', m: <MostraRatllada color={COLORS_BALANC.pagades} /> },
          { k: 'Saldo acumulat', m: <span className="inline-block w-4 border-t-2 border-dashed border-slate-800" /> },
        ]
      : [
          { k: 'Ingressos', m: <span className="inline-block h-3 w-3 rounded-sm" style={{ background: COLORS_BALANC.ingressos }} /> },
          ...(v === 'amb' ? [{ k: 'Fiances rebudes', m: <MostraRatllada color={COLORS_BALANC.rebudes} /> }] : []),
          { k: 'Despeses', m: <span className="inline-block h-3 w-3 rounded-sm" style={{ background: COLORS_BALANC.despeses }} /> },
          ...(v === 'amb' ? [{ k: 'Fiances pagades', m: <MostraRatllada color={COLORS_BALANC.pagades} /> }] : []),
          { k: 'Benefici real', m: <span className="inline-block w-4 border-t-2" style={{ borderColor: COLORS_BALANC.benefici }} /> },
          ...(v === 'amb' ? [{ k: 'Moviment de caixa', m: <span className="inline-block w-4 border-t-2 border-dashed border-slate-800" /> }] : []),
        ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-semibold text-slate-900">{titol}</h3>
          <p className="text-sm text-slate-500">{SUBTITOL[v]}</p>
        </div>
        {ambFiances && (
          <div role="group" aria-label="Vista del gràfic" className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
            {(
              [
                ['sense', 'Sense fiances'],
                ['amb', 'Amb fiances'],
                ['nomes', 'Només fiances'],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={v === k}
                onClick={() => setVista(k)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  v === k ? 'bg-brand-700 text-white' : 'text-slate-600 hover:text-brand-700',
                )}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {llegenda.map((x) => (
          <span key={x.k} className="flex items-center gap-1.5">
            {x.m} {x.k}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label={titol}>
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
          {files.map((f, i) => {
            const xa = cx(i) - bw - 1.5;
            const xb = cx(i) + 1.5;
            return (
              <g key={f.label}>
                {v === 'nomes' ? (
                  <>
                    {barra(xa, 0, f.rebudes, `url(#${uid}-r)`, `${f.label}: fiances rebudes ${eur(f.rebudes)}`, 'r')}
                    {barra(xb, 0, f.pagades, `url(#${uid}-p)`, `${f.label}: fiances pagades ${eur(f.pagades)}`, 'p')}
                  </>
                ) : (
                  <>
                    {barra(xa, 0, f.ingressos, COLORS_BALANC.ingressos, `${f.label}: ingressos ${eur(f.ingressos)}`, 'i')}
                    {barra(xb, 0, f.despeses, COLORS_BALANC.despeses, `${f.label}: despeses ${eur(f.despeses)}`, 'd')}
                    {v === 'amb' && f.rebudes > 0 &&
                      barra(xa, f.ingressos, f.ingressos + f.rebudes, `url(#${uid}-r)`, `${f.label}: fiances rebudes ${eur(f.rebudes)}`, 'ir')}
                    {v === 'amb' && f.pagades > 0 &&
                      barra(xb, f.despeses, f.despeses + f.pagades, `url(#${uid}-p)`, `${f.label}: fiances pagades ${eur(f.pagades)}`, 'dp')}
                  </>
                )}
                <text x={cx(i)} y={H - 9} textAnchor="middle" fontSize={10.5} fill="#64748b">
                  {f.label}
                </text>
              </g>
            );
          })}
          <line x1={L} x2={W - R} y1={y0} y2={y0} stroke="#cbd5e1" />
          {v === 'nomes'
            ? linia(files.map((f) => f.saldo), '#1e293b', 'saldo acumulat', '6 4')
            : linia(files.map((f) => f.benefici), COLORS_BALANC.benefici, 'benefici real')}
          {v === 'amb' && linia(files.map((f) => f.caixa), '#1e293b', 'moviment de caixa', '6 4')}
        </svg>
      </div>
    </div>
  );
}
