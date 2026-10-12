'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Scale,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr } from '@/components/ui/table';
import { getJSON } from '@/lib/api';
import { useRestringit } from '@/components/layout/restringit-context';
import { addMonths, toISODate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { CascadaCaixa, COLORS_BALANC, MostraRatllada } from '@/components/balanc/cascada-caixa';
import { MesosFiancesChart } from '@/components/balanc/mesos-fiances-chart';
import { NavegadorPeriode } from '@/components/ui/navegador-periode';
import { Eur, HideAmountsButton, HideAmountsOnMount } from '@/components/finances/amounts-visibility';
import { METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';
import { periodeComparacio, rangDeEstat, rangPeriode, type EstatPeriode } from '@/lib/periode';
import type { FiancesObertes, MovDetall, MovGrup } from '@/lib/services/dashboard';

/** Data curta "dd/mm/aa" a partir d'un ISO string. */
function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

interface Breakdowns {
  ingressosPerMetode: Record<string, number>;
  despesesPerCategoria: { categoria: string; import: number }[];
  // Part de fiança de cada categoria (pagades) i de cada mètode (rebudes).
  fiancesPerCategoria?: { categoria: string; import: number }[];
  retencionsPerMetode?: Record<string, number>;
  ocupacio: number;
  adr: number;
  revpar: number;
  moviments?: MovDetall[];
}
interface Balanc extends Breakdowns {
  mes: string;
  ingressos: number;
  retencions: number;
  ingressosAmbRetencions: number;
  despeses: number;
  despesesFianca: number;
  personal: number;
  benefici: number;
}

interface SerieMes {
  any: number;
  mes: number;
  ingressos: number;
  retencions: number;
  ingressosAmbRetencions: number;
  despeses: number;
  despesesFianca: number;
  personal: number;
  benefici: number;
}

interface BalancSituacio {
  data: string;
  inclouCustodia: boolean;
  actiu: {
    noCorrent: { immobilitzatBrut: number };
    corrent: { deutors: number; tresoreriaOperativa: number; tresoreriaFiances: number };
    total: number;
  };
  patrimoniIPassiu: {
    patrimoniNet: number;
    passiuNoCorrent: number;
    passiuCorrent: { fiances: number };
    total: number;
  };
  detall: {
    nActius: number;
    nFacturesPendents: number;
    nDiposits: number;
    saldoInicial: number;
    totalCobraments: number;
    totalGastos: number;
    totalJornades: number;
  };
  quadra: boolean;
  mancances: string[];
}

// La pestanya "Situació" es manté al codi però NO es mostra. Posa-ho a true per tornar-la.
const MOSTRA_SITUACIO = false;
const MESOS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const marge = (benefici: number, ingressos: number) =>
  ingressos > 0 ? Math.round((benefici / ingressos) * 100) : 0;
/** Variació en % respecte del període anterior (null si no es pot calcular). */
const variacio = (cur: number, prev: number): number | null =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function metodeItems(perMetode: Record<string, number>) {
  return Object.entries(perMetode)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: METODE_COBRAMENT_LABELS[k as keyof typeof METODE_COBRAMENT_LABELS] ?? k, value: v }))
    .sort((a, b) => b.value - a.value);
}

/** Categories amb la part real i la de fiança (pagades) de cadascuna; el personal, com una més. */
function categoriesAmbFiances(d: Balanc) {
  const m = new Map<string, { label: string; real: number; fianca: number }>();
  const get = (label: string) => m.get(label) ?? m.set(label, { label, real: 0, fianca: 0 }).get(label)!;
  for (const c of d.despesesPerCategoria) get(c.categoria).real += c.import;
  for (const c of d.fiancesPerCategoria ?? []) get(c.categoria).fianca += c.import;
  if (d.personal > 0) get('Personal').real += d.personal;
  return [...m.values()];
}

/** Mètodes de cobrament amb la part real i la de fiances rebudes de cadascun. */
function metodesAmbFiances(d: Balanc) {
  const claus = new Set([...Object.keys(d.ingressosPerMetode), ...Object.keys(d.retencionsPerMetode ?? {})]);
  return [...claus].map((k) => ({
    label: METODE_COBRAMENT_LABELS[k as keyof typeof METODE_COBRAMENT_LABELS] ?? k,
    real: d.ingressosPerMetode[k] ?? 0,
    fianca: d.retencionsPerMetode?.[k] ?? 0,
  }));
}

/** Categories de despesa amb el personal com una més. */
function categoriesAmbPersonal(d: Balanc) {
  const cats = d.despesesPerCategoria.map((c) => ({ label: c.categoria, value: c.import }));
  if (d.personal > 0) cats.push({ label: 'Personal', value: d.personal });
  return cats.sort((a, b) => b.value - a.value);
}

// ─── Desglossament d'una casella (modal) ─────────────────────────────────────

interface Desglos { title: string; rows: { label: string; value: number }[]; total: number; moviments?: MovDetall[] }
type Metrica = 'ingressos' | 'despeses' | 'benefici' | 'rebudes' | 'pagades';
const MOV_GRUPS: Record<Metrica, MovGrup[]> = {
  ingressos: ['INGRES', 'FIANCA'],
  despeses: ['DESPESA', 'PERSONAL'],
  benefici: ['INGRES', 'FIANCA', 'DESPESA', 'PERSONAL'],
  rebudes: ['FIANCA_CUST'],
  pagades: ['FIANCA_PAGADA'],
};
function desglos(metric: Metrica, v: Balanc): Desglos {
  const moviments = (v.moviments ?? []).filter((m) => MOV_GRUPS[metric].includes(m.grup));
  const desp = r2(v.despeses + v.personal);
  // Fila de compensació: els ingressos poden incloure dipòsits retinguts que no
  // surten a `ingressosPerMetode` (que només són cobraments). Així el total quadra.
  const quadra = (rows: { label: string; value: number }[], total: number, label: string) => {
    const resta = r2(total - rows.reduce((a, m) => a + m.value, 0));
    return Math.abs(resta) >= 0.005 ? [...rows, { label, value: resta }] : rows;
  };
  switch (metric) {
    case 'ingressos':
      return { title: 'Ingressos · per mètode de cobrament', rows: quadra(metodeItems(v.ingressosPerMetode), v.ingressos, 'Fiances retingudes (ingrés)'), total: v.ingressos, moviments };
    case 'despeses':
      return { title: 'Despeses · per categoria', rows: categoriesAmbPersonal(v), total: desp, moviments };
    case 'benefici':
      return { title: 'Benefici = Ingressos − Despeses', rows: [{ label: 'Ingressos', value: v.ingressos }, { label: 'Despeses', value: -desp }], total: v.benefici, moviments };
    case 'rebudes':
      return { title: 'Fiances rebudes de clients', rows: [], total: v.retencions, moviments };
    case 'pagades':
      return { title: 'Fiances pagades (recuperables)', rows: [], total: v.despesesFianca, moviments };
  }
}

// ─── Caselles ────────────────────────────────────────────────────────────────

function Casella({
  label,
  marca,
  value,
  color,
  sota,
  onSelect,
}: {
  label: string;
  marca: React.ReactNode;
  value: number;
  color?: string;
  sota?: React.ReactNode;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title="Veure el desglossament"
      className="group min-w-0 border-t border-slate-100 px-5 pb-4 pt-3 text-left transition-colors first:border-t-0 hover:bg-slate-50/70 sm:border-l sm:border-t-0 sm:first:border-l-0"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        {marca}
        {label}
        <ChevronRight className="ml-auto h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className={cn('mt-0.5 block whitespace-nowrap text-[1.65rem] font-extrabold tracking-tight tabular-nums', color ?? 'text-slate-900')}>
        <Eur value={value} />
      </span>
      {sota && <span className="mt-0.5 block text-xs text-slate-500">{sota}</span>}
    </button>
  );
}

function Delta({ pct, etiqueta, invert }: { pct: number | null; etiqueta: string; invert?: boolean }) {
  if (pct === null) return null;
  const bo = invert ? pct <= 0 : pct >= 0;
  return (
    <>
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', bo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}%
      </span>{' '}
      vs {etiqueta}
    </>
  );
}

const Punt = ({ color }: { color: string }) => <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />;

// ─── Llistes de barres (categories / mètodes) ────────────────────────────────

function LlistaBarres({
  files,
  color,
  extra,
  buit,
}: {
  files: { label: string; value: number }[];
  color: string;
  extra?: { label: string; value: number; color: string };
  buit: string;
}) {
  const max = Math.max(1, ...files.map((f) => f.value), extra?.value ?? 0);
  const fila = (label: string, value: number, fons: string, destacat?: string) => (
    <div className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-sm">
      <span className={cn('truncate', destacat ? 'font-semibold' : 'text-slate-700')} style={destacat ? { color: destacat } : undefined}>
        {label}
      </span>
      <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: fons }} />
      </span>
      <span className="text-right font-semibold tabular-nums" style={destacat ? { color: destacat } : undefined}>
        <Eur value={value} />
      </span>
    </div>
  );
  return (
    <div className="space-y-2.5">
      {files.length === 0 ? <p className="text-sm text-slate-400">{buit}</p> : files.map((f) => <div key={f.label}>{fila(f.label, f.value, color)}</div>)}
      {extra && extra.value > 0 && (
        <div className="mt-1 border-t border-dashed border-slate-200 pt-3">
          {fila(extra.label, extra.value, `repeating-linear-gradient(135deg, ${extra.color} 0 4px, ${extra.color}29 4px 8px)`, extra.color)}
        </div>
      )}
    </div>
  );
}

/**
 * Barres amb la part real (color ple) i la part de fiança (ratllada) de cada
 * fila, un selector Tot / Sense fiances / Només fiances i, a sota, els totals
 * sense fiances, de fiances i amb fiances. Les fiances no canvien el benefici:
 * només es mostren al costat per saber on són.
 */
type ModeFiances = 'tot' | 'real' | 'fianca';
function LlistaBarresFiances({
  files,
  color,
  colorFianca,
  etiquetes,
  buit,
}: {
  files: { label: string; real: number; fianca: number }[];
  color: string;
  colorFianca: string;
  etiquetes: { real: string; fianca: string };
  buit: string;
}) {
  const [mode, setMode] = useState<ModeFiances>('tot');
  const ratllat = `repeating-linear-gradient(135deg, ${colorFianca} 0 4px, ${colorFianca}29 4px 8px)`;
  const val = (f: { real: number; fianca: number }) => (mode === 'real' ? f.real : mode === 'fianca' ? f.fianca : f.real + f.fianca);
  const visibles = files.filter((f) => val(f) > 0).sort((a, b) => val(b) - val(a));
  const max = Math.max(1, ...visibles.map(val));
  const totalReal = r2(files.reduce((a, f) => a + f.real, 0));
  const totalFianca = r2(files.reduce((a, f) => a + f.fianca, 0));
  const MODES: { m: ModeFiances; label: string }[] = [
    { m: 'tot', label: 'Tot' },
    { m: 'real', label: 'Sense fiances' },
    { m: 'fianca', label: 'Només fiances' },
  ];

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Què es mostra" className="inline-flex flex-wrap gap-0.5 rounded-full bg-slate-100 p-0.5">
        {MODES.map(({ m, label }) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {visibles.length === 0 ? (
          <p className="text-sm text-slate-400">{buit}</p>
        ) : (
          visibles.map((f) => {
            const r = mode === 'fianca' ? 0 : f.real;
            const fi = mode === 'real' ? 0 : f.fianca;
            return (
              <div key={f.label} className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate text-slate-700">{f.label}</span>
                <span className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                  {r > 0 && <span className="block h-full" style={{ width: `${Math.max(1.5, (r / max) * 100)}%`, background: color }} />}
                  {fi > 0 && <span className="block h-full" style={{ width: `${Math.max(1.5, (fi / max) * 100)}%`, background: ratllat }} />}
                </span>
                <span className="text-right tabular-nums">
                  <span className="block font-semibold"><Eur value={r2(r + fi)} /></span>
                  {mode === 'tot' && f.fianca > 0 && (
                    <span className="block text-[11px] text-slate-500">
                      {f.real > 0 ? <>real <Eur value={f.real} /> · </> : null}
                      <span style={{ color: colorFianca }}>{f.real > 0 ? <>fiança <Eur value={f.fianca} /></> : 'tot fiança'}</span>
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-1.5 border-t border-dashed border-slate-200 pt-3 text-sm tabular-nums">
        <div className={cn('flex items-baseline justify-between gap-3', mode === 'fianca' && 'opacity-45')}>
          <span className="flex items-center gap-2 text-slate-500">
            <span className="inline-block h-2 w-4 rounded-full" style={{ background: color }} />
            {etiquetes.real}
          </span>
          <span className="font-semibold"><Eur value={totalReal} /></span>
        </div>
        <div className={cn('flex items-baseline justify-between gap-3', mode === 'real' && 'opacity-45')}>
          <span className="flex items-center gap-2 text-slate-500">
            <span className="inline-block h-2 w-4 rounded-full" style={{ background: ratllat, outline: `1px solid ${colorFianca}` }} />
            {etiquetes.fianca}
          </span>
          <span className="font-semibold" style={{ color: colorFianca }}><Eur value={totalFianca} /></span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-slate-200 pt-2">
          <span className="font-serif text-lg font-semibold text-slate-800">Total amb fiances</span>
          <span className="text-lg font-bold"><Eur value={r2(totalReal + totalFianca)} /></span>
        </div>
      </div>
    </div>
  );
}

// ─── Fiances obertes ─────────────────────────────────────────────────────────

function FiancesObertesCard({ dades }: { dades: FiancesObertes }) {
  const [totes, setTotes] = useState(false);
  const files = totes ? dades.files : dades.files.slice(0, 8);
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Fiances obertes</CardTitle>
          <p className="mt-0.5 text-sm text-slate-500">El que has de tornar i el que t&apos;han de tornar, de qualsevol mes.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">
            Has de tornar <Eur value={dades.totalRebudes} />
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
            Per recuperar <Eur value={dades.totalPagades} />
          </span>
        </div>
      </CardHeader>
      <CardBody>
        {dades.files.length === 0 ? (
          <p className="text-sm text-slate-400">No hi ha cap fiança oberta.</p>
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Data</Th>
                  <Th>Concepte</Th>
                  <Th>Tipus</Th>
                  <Th className="text-right">Import</Th>
                </tr>
              </Thead>
              <tbody>
                {files.map((f) => (
                  <Tr key={f.id}>
                    <Td className="whitespace-nowrap text-slate-500">{dataCurta(f.data)}</Td>
                    <Td className="max-w-[28rem] truncate">
                      {f.href ? (
                        <a href={f.href} className="font-medium text-brand-700 hover:underline">{f.concepte}</a>
                      ) : (
                        f.concepte
                      )}
                    </Td>
                    <Td>
                      <span
                        className={cn(
                          'whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold',
                          f.tipus === 'REBUDA' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700',
                        )}
                      >
                        {f.tipus === 'REBUDA' ? 'Rebuda' : 'Pagada'}
                      </span>
                    </Td>
                    <Td className="text-right font-medium tabular-nums"><Eur value={f.import} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            {dades.files.length > 8 && (
              <button type="button" onClick={() => setTotes(!totes)} className="mt-3 text-sm font-medium text-brand-700 hover:underline">
                {totes ? 'Veure menys' : `Veure-les totes (${dades.files.length})`}
              </button>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Moviments del període ───────────────────────────────────────────────────

const MOV_FILTRE_GRUPS: Record<string, MovGrup[]> = {
  ingressos: ['INGRES', 'FIANCA'],
  despeses: ['DESPESA', 'PERSONAL'],
  fiances: ['FIANCA_CUST', 'FIANCA_PAGADA'],
  tot: ['INGRES', 'FIANCA', 'FIANCA_CUST', 'DESPESA', 'PERSONAL', 'FIANCA_PAGADA'],
};
function MovimentsCard({ moviments, ambFiances }: { moviments: MovDetall[]; ambFiances: boolean }) {
  const [filtre, setFiltre] = useState<'ingressos' | 'despeses' | 'fiances' | 'tot'>('tot');
  const filtrats = moviments.filter((m) => MOV_FILTRE_GRUPS[filtre]!.includes(m.grup));
  const total = r2(filtrats.reduce((a, m) => a + m.import, 0));
  const opcions = [
    { k: 'ingressos', l: 'Ingressos' },
    { k: 'despeses', l: 'Despeses' },
    ...(ambFiances ? [{ k: 'fiances', l: 'Fiances' }] : []),
    { k: 'tot', l: 'Tot' },
  ];
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Moviments</CardTitle>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
          {opcions.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setFiltre(t.k as typeof filtre)}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                filtre === t.k ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {t.l}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardBody>
        {filtrats.length === 0 ? (
          <p className="text-sm text-slate-400">Sense moviments en aquest període.</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Data</Th>
                <Th>Concepte</Th>
                <Th>Mètode</Th>
                <Th className="text-right">Import</Th>
              </tr>
            </Thead>
            <tbody>
              {filtrats.map((m) => {
                const fianca = m.grup === 'FIANCA_CUST' || m.grup === 'FIANCA_PAGADA';
                return (
                  <Tr key={m.id}>
                    <Td className="whitespace-nowrap text-slate-500">{dataCurta(m.data)}</Td>
                    <Td>
                      {m.href ? (
                        <a href={m.href} className="font-medium text-brand-700 hover:underline">{m.concepte}</a>
                      ) : (
                        m.concepte
                      )}
                      {m.pagada === false ? <span className="ml-1 text-xs text-amber-600">(pendent de pagar)</span> : null}
                    </Td>
                    <Td className="text-slate-500">
                      {m.metode ? METODE_COBRAMENT_LABELS[m.metode as keyof typeof METODE_COBRAMENT_LABELS] ?? m.metode : '—'}
                    </Td>
                    <Td
                      className={cn(
                        'text-right font-medium',
                        fianca ? (m.grup === 'FIANCA_CUST' ? 'text-teal-700' : 'text-amber-700') : m.import < 0 ? 'text-red-700' : 'text-green-700',
                      )}
                    >
                      <Eur value={m.import} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="mt-2 flex items-center justify-between border-t-2 border-slate-300 pt-2 text-sm font-bold">
          <span className="text-slate-900">Total ({filtrats.length})</span>
          <span className={cn(total < 0 ? 'text-red-700' : 'text-slate-900')}><Eur value={total} /></span>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Situació (amagada) ──────────────────────────────────────────────────────

function BsRow({ label, value, level = 0, strong, total }: { label: string; value: number; level?: number; strong?: boolean; total?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-1.5',
        total
          ? 'mt-1 border-t-2 border-slate-300 pt-2 text-base font-bold text-slate-900'
          : strong
            ? 'font-semibold text-slate-800'
            : 'text-sm text-slate-600',
        level === 1 && !strong && !total && 'pl-4',
      )}
    >
      <span>{label}</span>
      <span className={total ? 'text-brand-800' : ''}>
        <Eur value={value} />
      </span>
    </div>
  );
}

function SituacioView({ data }: { data: BalancSituacio }) {
  const activCorrent = data.actiu.corrent.deutors + data.actiu.corrent.tresoreriaOperativa + data.actiu.corrent.tresoreriaFiances;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actiu</CardTitle>
          </CardHeader>
          <CardBody>
            <BsRow label="Actiu no corrent" value={data.actiu.noCorrent.immobilitzatBrut} strong />
            <BsRow label={`Immobilitzat material (valor brut) · ${data.detall.nActius} actius`} value={data.actiu.noCorrent.immobilitzatBrut} level={1} />
            <BsRow label="Actiu corrent" value={activCorrent} strong />
            <BsRow label={`Deutors comercials · ${data.detall.nFacturesPendents} factures pendents`} value={data.actiu.corrent.deutors} level={1} />
            <BsRow label="Tresoreria general (caixa/banc)" value={data.actiu.corrent.tresoreriaOperativa} level={1} />
            <BsRow label="Tresoreria — efectiu de fiances en dipòsit" value={data.actiu.corrent.tresoreriaFiances} level={1} />
            <BsRow label="TOTAL ACTIU" value={data.actiu.total} total />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Patrimoni net i passiu</CardTitle>
          </CardHeader>
          <CardBody>
            <BsRow label="Patrimoni net" value={data.patrimoniIPassiu.patrimoniNet} strong />
            <BsRow label="Patrimoni net (figura de quadre)" value={data.patrimoniIPassiu.patrimoniNet} level={1} />
            <BsRow label="Passiu no corrent" value={data.patrimoniIPassiu.passiuNoCorrent} strong />
            <BsRow label="Passiu corrent" value={data.patrimoniIPassiu.passiuCorrent.fiances} strong />
            <BsRow label={`Fiances rebudes a retornar · ${data.detall.nDiposits} dipòsits`} value={data.patrimoniIPassiu.passiuCorrent.fiances} level={1} />
            <BsRow label="TOTAL PATRIMONI NET I PASSIU" value={data.patrimoniIPassiu.total} total />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            El balanç quadra: Actiu = Patrimoni net + Passiu (<Eur value={data.actiu.total} />)
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Balanç aproximat — no és un balanç fiscal
            </p>
            <p className="mt-1 text-xs text-amber-700">
              El patrimoni net es calcula com a diferència (Actiu − Passiu), de manera que sempre quadra.
              Per a un balanç de situació oficial falten dades que el PMS no registra:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
              {data.mancances.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Pàgina ──────────────────────────────────────────────────────────────────

/** Mesos (YYYY-MM) de la sèrie del gràfic segons el període triat. */
function rangSerie(estat: EstatPeriode, desde: string, fins: string): { desde: string; fins: string } {
  const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
  const [fy, fm] = fins.split('-').map(Number) as [number, number];
  if (estat.tipus === 'any') return { desde: `${fy}-01`, fins: `${fy}-12` };
  if (estat.tipus === 'per') {
    const [dy, dm] = desde.split('-').map(Number) as [number, number];
    const n = (fy - dy) * 12 + (fm - dm) + 1;
    if (n <= 24) return { desde: ym(dy, dm), fins: ym(fy, fm) };
  }
  // Mes, trimestre o rang llarg: els 12 mesos fins al final del període.
  const t = fy * 12 + (fm - 1) - 11;
  return { desde: ym(Math.floor(t / 12), (t % 12) + 1), fins: ym(fy, fm) };
}

export default function BalancPage() {
  const restringit = useRestringit(); // vista de propietat: amaga custòdia/personal
  const avui = toISODate(new Date());
  const [estat, setEstat] = useState<EstatPeriode>({ tipus: 'mes', off: 0 });
  const { desde, fins } = rangDeEstat(estat, avui);
  const comp = periodeComparacio(estat, avui);
  const etiquetaPeriode = estat.tipus === 'per' ? `${dataCurta(desde)} – ${dataCurta(fins)}` : rangPeriode(estat.tipus, estat.off, avui).etiqueta;

  const [dades, setDades] = useState<Balanc | null>(null);
  const [anterior, setAnterior] = useState<Balanc | null>(null);
  const [serie, setSerie] = useState<SerieMes[] | null>(null);
  const [obertes, setObertes] = useState<FiancesObertes | null>(null);
  const [breakdown, setBreakdown] = useState<Desglos | null>(null);

  useEffect(() => {
    let cancel = false;
    setDades(null);
    getJSON<Balanc>(`/api/balanc/rang?desde=${desde}&fins=${fins}`).then((r) => { if (!cancel) setDades(r); });
    if (comp) {
      getJSON<Balanc>(`/api/balanc/rang?desde=${comp.desde}&fins=${comp.fins}`)
        .then((r) => { if (!cancel) setAnterior(r); })
        .catch(() => { if (!cancel) setAnterior(null); });
    } else setAnterior(null);
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, fins, comp?.desde, comp?.fins]);

  const sr = rangSerie(estat, desde, fins);
  useEffect(() => {
    let cancel = false;
    getJSON<{ mesos: SerieMes[] }>(`/api/balanc/mesos?desde=${sr.desde}&fins=${sr.fins}`)
      .then((r) => { if (!cancel) setSerie(r.mesos); })
      .catch(() => { if (!cancel) setSerie(null); });
    return () => { cancel = true; };
  }, [sr.desde, sr.fins]);

  useEffect(() => {
    if (restringit) return;
    getJSON<FiancesObertes>('/api/balanc/fiances').then(setObertes).catch(() => setObertes(null));
  }, [restringit]);

  // ── Situació (amagada; es manté per si es torna a activar) ──
  const [veureSituacio, setVeureSituacio] = useState(false);
  const [anchor, setAnchor] = useState(() => new Date());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [situacio, setSituacio] = useState<BalancSituacio | null>(null);
  const [incloureCustodiaSituacio, setIncloureCustodiaSituacio] = useState(true);
  const [situacioPeriode, setSituacioPeriode] = useState<'mes' | 'trimestre' | 'any'>('mes');
  const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const situacioDesde =
    situacioPeriode === 'any'
      ? isoDay(new Date(year, 0, 1))
      : situacioPeriode === 'trimestre'
        ? isoDay(new Date(anchor.getFullYear(), Math.floor(anchor.getMonth() / 3) * 3, 1))
        : isoDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const situacioFins =
    situacioPeriode === 'any'
      ? isoDay(new Date(year, 11, 31))
      : situacioPeriode === 'trimestre'
        ? isoDay(new Date(anchor.getFullYear(), Math.floor(anchor.getMonth() / 3) * 3 + 3, 0))
        : isoDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
  const loadSituacio = useCallback(
    async () =>
      setSituacio(
        await getJSON<BalancSituacio>(
          `/api/balanc/situacio?desde=${situacioDesde}&fins=${situacioFins}&custodia=${!restringit && incloureCustodiaSituacio ? 'true' : 'false'}`,
        ),
      ),
    [situacioDesde, situacioFins, incloureCustodiaSituacio, restringit],
  );
  useEffect(() => {
    if (veureSituacio) loadSituacio();
  }, [veureSituacio, loadSituacio]);
  const mesLabel = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(anchor);

  const despesesTotals = dades ? r2(dades.despeses + dades.personal) : 0;
  const saldoFiances = dades ? r2(dades.retencions - dades.despesesFianca) : 0;
  const puntsSerie = (serie ?? []).map((s) => {
    const creuaAnys = (serie ?? []).some((x) => x.any !== serie![0]!.any);
    return {
      label: `${MESOS[s.mes - 1]}${creuaAnys ? ` ${String(s.any).slice(2)}` : ''}`,
      ingressos: s.ingressos,
      despeses: r2(s.despeses + s.personal),
      rebudes: restringit ? 0 : s.retencions,
      pagades: restringit ? 0 : s.despesesFianca,
    };
  });

  // PDF: només per a mesos i anys sencers (els que el generador sap fer).
  const pdfHref =
    estat.tipus === 'mes'
      ? `/api/balanc/pdf?mes=${desde.slice(0, 7)}`
      : estat.tipus === 'any'
        ? `/api/balanc/pdf?any=${desde.slice(0, 4)}`
        : null;

  function exporta() {
    if (veureSituacio && situacio) {
      const s = situacio;
      downloadCSV(`balanc-situacio-${s.data}.csv`, [
        [`Balanç de situació ${s.data}${s.inclouCustodia ? '' : ' sense custòdia'}`, ''],
        ['ACTIU', ''],
        ['  Immobilitzat material (valor brut)', s.actiu.noCorrent.immobilitzatBrut.toFixed(2)],
        ['  Deutors comercials', s.actiu.corrent.deutors.toFixed(2)],
        ['  Tresoreria general (caixa/banc)', s.actiu.corrent.tresoreriaOperativa.toFixed(2)],
        ['  Tresoreria - efectiu de fiances en dipòsit', s.actiu.corrent.tresoreriaFiances.toFixed(2)],
        ['TOTAL ACTIU', s.actiu.total.toFixed(2)],
        ['Patrimoni net (figura de quadre)', s.patrimoniIPassiu.patrimoniNet.toFixed(2)],
        ['Passiu corrent - Fiances a retornar', s.patrimoniIPassiu.passiuCorrent.fiances.toFixed(2)],
        ['TOTAL PATRIMONI NET I PASSIU', s.patrimoniIPassiu.total.toFixed(2)],
      ]);
      return;
    }
    if (!dades) return;
    const rows: (string | number)[][] = [
      [`Balanç ${etiquetaPeriode} (${dataCurta(desde)} – ${dataCurta(fins)})`, ''],
      ['Concepte', 'Import'],
      ['Ingressos', dades.ingressos.toFixed(2)],
      ['Despeses (personal inclòs)', despesesTotals.toFixed(2)],
      ['Benefici', dades.benefici.toFixed(2)],
      ['Marge %', marge(dades.benefici, dades.ingressos)],
      ...(restringit
        ? []
        : [
            [''],
            ['Fiances (no són ingrés ni despesa)', ''],
            ['Fiances rebudes de clients', dades.retencions.toFixed(2)],
            ['Fiances pagades (recuperables)', dades.despesesFianca.toFixed(2)],
            ['Saldo de fiances', saldoFiances.toFixed(2)],
            ['Moviment de caixa (benefici + rebudes − pagades)', r2(dades.benefici + saldoFiances).toFixed(2)],
          ]),
      [''],
      ['Ingressos per mètode', ''],
      ...metodeItems(dades.ingressosPerMetode).map((m) => [m.label, m.value.toFixed(2)]),
      [''],
      ['Despeses per categoria', ''],
      ...categoriesAmbPersonal(dades).map((d) => [d.label, d.value.toFixed(2)]),
    ];
    if (serie && serie.length > 0) {
      rows.push([''], ['Mes', 'Ingressos', 'Despeses', 'Benefici', ...(restringit ? [] : ['Fiances rebudes', 'Fiances pagades'])]);
      for (const s of serie)
        rows.push([
          `${MESOS[s.mes - 1]} ${s.any}`,
          s.ingressos.toFixed(2),
          (s.despeses + s.personal).toFixed(2),
          s.benefici.toFixed(2),
          ...(restringit ? [] : [s.retencions.toFixed(2), s.despesesFianca.toFixed(2)]),
        ]);
    }
    downloadCSV(`balanc-${desde}_${fins}.csv`, rows);
  }

  return (
    <div>
      <HideAmountsOnMount />
      <PageHeader
        title="Balanç"
        subtitle="Comptabilitat del hostal: ingressos, despeses, benefici i fiances"
        actions={
          <div className="flex items-center gap-2">
            {/* Pestanya "Situació" amagada (no eliminada): posa MOSTRA_SITUACIO=true per tornar-la. */}
            {MOSTRA_SITUACIO && (
              <button
                onClick={() => setVeureSituacio(!veureSituacio)}
                className={cn('rounded-lg border px-3 py-1.5 text-sm', veureSituacio ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}
              >
                <Scale className="mr-1 inline h-3.5 w-3.5" />
                Situació
              </button>
            )}
            <Button variant="outline" size="sm" onClick={exporta}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            {pdfHref && !veureSituacio && (
              <a
                href={pdfHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" /> PDF
              </a>
            )}
          </div>
        }
      />

      <FinancesNav />

      {veureSituacio ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Scale className="h-4 w-4 text-slate-400" />
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <button type="button" onClick={() => setSituacioPeriode('mes')} className={cn('px-3 py-1.5 text-sm', situacioPeriode === 'mes' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}>Mes</button>
              <button type="button" onClick={() => setSituacioPeriode('trimestre')} className={cn('border-l border-slate-300 px-3 py-1.5 text-sm', situacioPeriode === 'trimestre' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}>Trimestre</button>
              <button type="button" onClick={() => setSituacioPeriode('any')} className={cn('border-l border-slate-300 px-3 py-1.5 text-sm', situacioPeriode === 'any' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}>Any</button>
            </div>
            <Button variant="outline" size="sm" onClick={() => situacioPeriode === 'any' ? setYear(year - 1) : setAnchor(addMonths(anchor, situacioPeriode === 'trimestre' ? -3 : -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-24 text-center text-sm font-medium capitalize text-slate-600">
              {situacioPeriode === 'any'
                ? `${year}`
                : situacioPeriode === 'trimestre'
                  ? `T${Math.floor(anchor.getMonth() / 3) + 1} ${anchor.getFullYear()}`
                  : mesLabel}
            </span>
            <Button variant="outline" size="sm" onClick={() => situacioPeriode === 'any' ? setYear(year + 1) : setAnchor(addMonths(anchor, situacioPeriode === 'trimestre' ? 3 : 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!restringit && (
              <div className="ml-2 flex overflow-hidden rounded-lg border border-slate-300">
                <button type="button" onClick={() => setIncloureCustodiaSituacio(true)} className={cn('px-3 py-1.5 text-sm', incloureCustodiaSituacio ? 'bg-orange-500 text-white' : 'bg-white text-orange-600')}>
                  Amb fiança
                </button>
                <button type="button" onClick={() => setIncloureCustodiaSituacio(false)} className={cn('border-l border-slate-300 px-3 py-1.5 text-sm', !incloureCustodiaSituacio ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}>
                  Sense fiança
                </button>
              </div>
            )}
          </div>
          {situacio && <SituacioView data={situacio} />}
        </div>
      ) : (
        <div className="space-y-6">
          <NavegadorPeriode estat={estat} onChange={setEstat} avui={avui} extra={<HideAmountsButton />} />

          {dades ? (
            <>
              {/* Dos blocs que no es barregen: el resultat real i les fiances */}
              <div className={cn('grid gap-4', !restringit && '2xl:grid-cols-[1.4fr_1fr]')}>
                <section aria-label="Resultat de l'hostal" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Resultat de l&apos;hostal</span>
                    <span className="text-xs text-slate-400">sense fiances · és el que compta per a Hisenda</span>
                  </div>
                  <div className="grid sm:grid-cols-3">
                    <Casella
                      label="Ingressos"
                      marca={<Punt color={COLORS_BALANC.ingressos} />}
                      value={dades.ingressos}
                      sota={comp && anterior ? <Delta pct={variacio(dades.ingressos, anterior.ingressos)} etiqueta={comp.etiqueta} /> : null}
                      onSelect={() => setBreakdown(desglos('ingressos', dades))}
                    />
                    <Casella
                      label="Despeses"
                      marca={<Punt color={COLORS_BALANC.despeses} />}
                      value={despesesTotals}
                      sota={comp && anterior ? <Delta pct={variacio(despesesTotals, anterior.despeses + anterior.personal)} etiqueta={comp.etiqueta} invert /> : null}
                      onSelect={() => setBreakdown(desglos('despeses', dades))}
                    />
                    <Casella
                      label="Benefici"
                      marca={<Punt color={COLORS_BALANC.benefici} />}
                      value={dades.benefici}
                      color={dades.benefici >= 0 ? 'text-green-700' : 'text-red-700'}
                      sota={dades.ingressos > 0 ? `marge ${marge(dades.benefici, dades.ingressos)}% dels ingressos` : null}
                      onSelect={() => setBreakdown(desglos('benefici', dades))}
                    />
                  </div>
                </section>

                {!restringit && (
                  <section aria-label="Fiances" className="min-w-0 overflow-hidden rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-50/80 to-white">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Fiances</span>
                      <span className="text-xs text-slate-400">no són ingrés ni despesa</span>
                    </div>
                    <div className="grid sm:grid-cols-3">
                      <Casella label="Rebudes" marca={<MostraRatllada color={COLORS_BALANC.rebudes} />} value={dades.retencions} color="text-teal-700" onSelect={() => setBreakdown(desglos('rebudes', dades))} />
                      <Casella label="Pagades" marca={<MostraRatllada color={COLORS_BALANC.pagades} />} value={dades.despesesFianca} color="text-amber-700" onSelect={() => setBreakdown(desglos('pagades', dades))} />
                      <Casella
                        label="Saldo"
                        marca={null}
                        value={saldoFiances}
                        color={saldoFiances >= 0 ? 'text-green-700' : 'text-red-700'}
                        onSelect={() => setBreakdown({ title: 'Saldo de fiances', rows: [{ label: 'Rebudes de clients', value: dades.retencions }, { label: 'Pagades (recuperables)', value: -dades.despesesFianca }], total: saldoFiances })}
                      />
                    </div>
                  </section>
                )}
              </div>

              {!restringit && (
                <Card>
                  <CardBody>
                    <h3 className="font-serif text-xl font-semibold text-slate-900">Del benefici a la caixa</h3>
                    <p className="mb-2 text-sm text-slate-500">Com passes del benefici real als diners que t&apos;han entrat o sortit del banc i la caixa.</p>
                    <div className="overflow-x-auto">
                      <CascadaCaixa ingressos={dades.ingressos} despeses={despesesTotals} rebudes={dades.retencions} pagades={dades.despesesFianca} />
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          )}

          {puntsSerie.length > 0 && (
            <MesosFiancesChart
              titol={estat.tipus === 'any' ? `Mes a mes · ${desde.slice(0, 4)}` : 'Mes a mes'}
              punts={puntsSerie}
              ambFiances={!restringit}
            />
          )}

          {estat.tipus === 'any' && serie && serie.length > 0 && (
            <Card>
              <CardBody className="overflow-x-auto">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Mes</Th>
                      <Th className="text-right">Ingressos</Th>
                      <Th className="text-right">Despeses</Th>
                      <Th className="text-right">Benefici</Th>
                      {!restringit && <Th className="text-right">Fiances rebudes</Th>}
                      {!restringit && <Th className="text-right">Fiances pagades</Th>}
                    </tr>
                  </Thead>
                  <tbody>
                    {serie.map((m) => (
                      <Tr key={`${m.any}-${m.mes}`}>
                        <Td>{MESOS[m.mes - 1]}</Td>
                        <Td className="text-right tabular-nums"><Eur value={m.ingressos} /></Td>
                        <Td className="text-right tabular-nums text-red-700"><Eur value={m.despeses + m.personal} /></Td>
                        <Td className={cn('text-right font-medium tabular-nums', m.benefici >= 0 ? 'text-green-700' : 'text-red-700')}><Eur value={m.benefici} /></Td>
                        {!restringit && <Td className="text-right tabular-nums text-teal-700"><Eur value={m.retencions} /></Td>}
                        {!restringit && <Td className="text-right tabular-nums text-amber-700"><Eur value={m.despesesFianca} /></Td>}
                      </Tr>
                    ))}
                    <Tr className="bg-slate-50 font-semibold">
                      <Td>TOTAL</Td>
                      <Td className="text-right tabular-nums"><Eur value={r2(serie.reduce((a, m) => a + m.ingressos, 0))} /></Td>
                      <Td className="text-right tabular-nums"><Eur value={r2(serie.reduce((a, m) => a + m.despeses + m.personal, 0))} /></Td>
                      <Td className="text-right tabular-nums"><Eur value={r2(serie.reduce((a, m) => a + m.benefici, 0))} /></Td>
                      {!restringit && <Td className="text-right tabular-nums"><Eur value={r2(serie.reduce((a, m) => a + m.retencions, 0))} /></Td>}
                      {!restringit && <Td className="text-right tabular-nums"><Eur value={r2(serie.reduce((a, m) => a + m.despesesFianca, 0))} /></Td>}
                    </Tr>
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          )}

          {dades && (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>En què se&apos;n va</CardTitle>
                    <p className="mt-0.5 text-sm text-slate-500">Despeses per categoria.{restringit ? '' : ' Ratllat: la part que és fiança (no compta al benefici).'}</p>
                  </CardHeader>
                  <CardBody>
                    {restringit ? (
                      <LlistaBarres files={categoriesAmbPersonal(dades)} color={COLORS_BALANC.despeses} buit="Sense despeses en aquest període." />
                    ) : (
                      <LlistaBarresFiances
                        files={categoriesAmbFiances(dades)}
                        color={COLORS_BALANC.despeses}
                        colorFianca={COLORS_BALANC.pagades}
                        etiquetes={{ real: 'Despeses sense fiances', fianca: 'Fiances pagades' }}
                        buit="Sense despeses en aquest període."
                      />
                    )}
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Com t&apos;han pagat</CardTitle>
                    <p className="mt-0.5 text-sm text-slate-500">Ingressos per mètode.{restringit ? '' : ' Ratllat: la part que és fiança rebuda (s’ha de tornar).'}</p>
                  </CardHeader>
                  <CardBody>
                    {restringit ? (
                      <LlistaBarres files={metodeItems(dades.ingressosPerMetode)} color={COLORS_BALANC.ingressos} buit="Sense cobraments en aquest període." />
                    ) : (
                      <LlistaBarresFiances
                        files={metodesAmbFiances(dades)}
                        color={COLORS_BALANC.ingressos}
                        colorFianca={COLORS_BALANC.rebudes}
                        etiquetes={{ real: 'Ingressos sense fiances', fianca: 'Fiances rebudes' }}
                        buit="Sense cobraments en aquest període."
                      />
                    )}
                  </CardBody>
                </Card>
              </div>

              {!restringit && obertes && <FiancesObertesCard dades={obertes} />}

              <Card>
                <CardHeader>
                  <CardTitle>Indicadors de l&apos;hostal</CardTitle>
                </CardHeader>
                <CardBody className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-2xl font-extrabold tabular-nums text-slate-900">{dades.ocupacio}%</p>
                    <p className="text-sm text-slate-500">Ocupació</p>
                  </div>
                  <div className="sm:border-l sm:border-slate-100 sm:pl-5">
                    <p className="text-2xl font-extrabold tabular-nums text-slate-900"><Eur value={dades.adr} /></p>
                    <p className="text-sm text-slate-500">Preu mitjà per nit (ADR)</p>
                  </div>
                  <div className="sm:border-l sm:border-slate-100 sm:pl-5">
                    <p className="text-2xl font-extrabold tabular-nums text-slate-900"><Eur value={dades.revpar} /></p>
                    <p className="text-sm text-slate-500">Ingrés per habitació disponible (RevPAR)</p>
                  </div>
                </CardBody>
              </Card>

              <MovimentsCard moviments={dades.moviments ?? []} ambFiances={!restringit} />
            </>
          )}

          <p className="text-xs text-slate-400">
            Ingressos = cobraments + dipòsits retinguts. Les despeses inclouen el cost de personal.
            El <strong>Benefici</strong> és Ingressos − Despeses.
            {restringit ? '' : ' Les fiances rebudes (de clients, s\'han de tornar) i les pagades (recuperables) van a part i no canvien el benefici.'}{' '}
            Exporta-ho tot a CSV per a la gestoria.
          </p>
        </div>
      )}

      {/* Modal de desglossament d'una casella */}
      {breakdown && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-20"
          onClick={() => setBreakdown(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold text-slate-800">{breakdown.title}</h3>
              <button onClick={() => setBreakdown(null)} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label="Tancar">
                <X className="h-5 w-5" />
              </button>
            </div>
            {breakdown.rows.length > 0 && (
              <div>
                {breakdown.rows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
                    <span className="text-slate-600">{r.label}</span>
                    <span className={cn('font-medium', r.value < 0 ? 'text-red-600' : 'text-slate-800')}>
                      <Eur value={r.value} />
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t-2 border-slate-300 pt-2 font-bold">
              <span className="text-slate-900">Total</span>
              <span className="text-brand-800"><Eur value={breakdown.total} /></span>
            </div>

            {breakdown.moviments && breakdown.moviments.length > 0 ? (
              <div className="mt-3 border-t border-slate-100 pt-2">
                <p className="mb-1 text-xs font-medium text-slate-500">Moviments ({breakdown.moviments.length})</p>
                <div className="max-h-72 space-y-0.5 overflow-y-auto">
                  {breakdown.moviments.map((m) => {
                    const inner = (
                      <>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="text-slate-400">{dataCurta(m.data)}</span>{' '}
                          <span className="text-slate-600">{m.concepte}</span>
                          {m.metode ? <span className="text-slate-400"> · {METODE_COBRAMENT_LABELS[m.metode as keyof typeof METODE_COBRAMENT_LABELS] ?? m.metode}</span> : null}
                          {m.pagada === false ? <span className="text-amber-600"> · pendent de pagar</span> : null}
                        </span>
                        <span className={cn('shrink-0 font-medium', m.import < 0 ? 'text-red-600' : 'text-green-700')}>
                          <Eur value={m.import} />
                        </span>
                      </>
                    );
                    return m.href ? (
                      <a key={m.id} href={m.href} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-xs hover:bg-slate-50">{inner}</a>
                    ) : (
                      <div key={m.id} className="flex items-center justify-between gap-2 px-1 py-1 text-xs">{inner}</div>
                    );
                  })}
                </div>
              </div>
            ) : breakdown.rows.length === 0 ? (
              <p className="mt-3 text-sm italic text-slate-400">Sense moviments en aquest període.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
