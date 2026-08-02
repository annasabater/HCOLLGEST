'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  TrendingDown,
  PiggyBank,
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
import { addMonths } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { BalancChart } from '@/components/balanc/balanc-chart';
import { BalancLineChart } from '@/components/balanc/balanc-line-chart';
import { Donut } from '@/components/balanc/donut';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { TrimestreIvaCard } from '@/components/balanc/trimestre-iva-card';
import { Eur, HideAmountsButton, HideAmountsOnMount } from '@/components/finances/amounts-visibility';
import { METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';
import type { MovDetall, MovGrup } from '@/lib/services/dashboard';

/** Data curta "dd/mm/aa" a partir d'un ISO string. */
function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

interface Breakdowns {
  ingressosPerMetode: Record<string, number>;
  despesesPerCategoria: { categoria: string; import: number }[];
  ocupacio: number;
  adr: number;
  revpar: number;
  movimentsPerPersona?: {
    estanciaId: string | null;
    titular: string;
    ingressos: number;
    devolucions: number;
    fianca?: number;
    habitacio?: string | null;
    dataEntrada?: string | null;
    dataSortida?: string | null;
    datesPagament?: string[];
  }[];
  moviments?: MovDetall[];
}
interface CustodiaItem {
  id: string;
  import: number;
  data: string;
  estanciaId: string | null;
  titular: string;
  motiu: string | null;
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
  custodiaDetall: CustodiaItem[];
}
interface MesRow {
  mes: number;
  ingressos: number;
  retencions: number;
  ingressosAmbRetencions: number;
  despeses: number;
  despesesFianca: number;
  personal: number;
  benefici: number;
}
interface BalancAny extends Breakdowns {
  any: number;
  mesos: MesRow[];
  totals: Omit<MesRow, 'mes'>;
  anterior: { ingressos: number; despeses: number; personal: number; benefici: number };
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

type Mode = 'mes' | 'rang' | 'any' | 'situacio';
const MESOS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
const marge = (benefici: number, ingressos: number) =>
  ingressos > 0 ? Math.round((benefici / ingressos) * 100) : 0;
const variacio = (cur: number, prev: number) =>
  prev > 0 ? `${cur - prev >= 0 ? '+' : ''}${Math.round(((cur - prev) / prev) * 100)}%` : null;

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
    .map(([k, v]) => ({ label: METODE_COBRAMENT_LABELS[k as keyof typeof METODE_COBRAMENT_LABELS] ?? k, value: v }));
}

/** Afegeix el cost de personal com una categoria més de despeses (per al gràfic). */
function ambPersonal<T extends Breakdowns>(d: T, personal: number): Breakdowns {
  if (personal <= 0) return d;
  return {
    ...d,
    despesesPerCategoria: [...d.despesesPerCategoria, { categoria: 'Personal', import: personal }].sort(
      (a, b) => b.import - a.import,
    ),
  };
}

function Kpi({ label, value, icon: Icon, color, big, delta, deltaInvert, onSelect }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; color: string; big?: boolean; delta?: string | null; deltaInvert?: boolean; onSelect?: () => void }) {
  const down = delta?.startsWith('-');
  const deltaGood = deltaInvert ? down : !down;
  return (
    <Card
      className={cn(big ? 'ring-1 ring-brand-200' : '', onSelect && 'cursor-pointer transition-shadow hover:shadow-md')}
      onClick={onSelect}
      title={onSelect ? 'Veure el desglossament' : undefined}
    >
      <CardBody className="flex items-center gap-4">
        <div className="rounded-lg bg-slate-100 p-3">
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {delta && (
            <p className={cn('text-xs font-medium', deltaGood ? 'text-green-600' : 'text-red-600')}>
              {delta} vs any anterior
            </p>
          )}
        </div>
        {onSelect && <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />}
      </CardBody>
    </Card>
  );
}

// Construeix el desglossament exacte d'un KPI a partir de les dades del període.
interface VistaBalanc {
  ingressos: number; despeses: number; personal: number; benefici: number;
  ingressosAmbRetencions: number; despesesFianca: number; retencions: number;
  ingressosPerMetode: Record<string, number>;
  despesesPerCategoria: { categoria: string; import: number }[];
  moviments?: MovDetall[];
}
interface Desglos { title: string; rows: { label: string; value: number }[]; total: number; moviments?: MovDetall[] }
// Quins grups de moviments es mostren en clicar cada KPI.
const MOV_GRUPS: Record<string, MovGrup[]> = {
  ingressos: ['INGRES', 'FIANCA'],
  'ingressos-fianca': ['INGRES', 'FIANCA', 'FIANCA_CUST'],
  despeses: ['DESPESA', 'PERSONAL'],
  'despeses-fianca': ['DESPESA', 'PERSONAL', 'FIANCA_PAGADA'],
  benefici: ['INGRES', 'FIANCA', 'DESPESA', 'PERSONAL'],
  'benefici-fianca': ['INGRES', 'FIANCA', 'FIANCA_CUST', 'DESPESA', 'PERSONAL', 'FIANCA_PAGADA'],
};
function desglos(metric: string, v: VistaBalanc): Desglos {
  const grupsMov = MOV_GRUPS[metric] ?? [];
  const moviments = (v.moviments ?? []).filter((m) => grupsMov.includes(m.grup));
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const met = metodeItems(v.ingressosPerMetode).map((m) => ({ label: m.label, value: m.value }));
  const cat = v.despesesPerCategoria.map((d) => ({ label: d.categoria, value: d.import }));
  const desp = r2(v.despeses + v.personal);
  // Fila de compensació: els ingressos poden incloure dipòsits retinguts que no
  // surten a `ingressosPerMetode` (que només són cobraments). Així el total quadra.
  const balanc = (rows: { label: string; value: number }[], total: number, label: string) => {
    const resta = r2(total - rows.reduce((a, m) => a + m.value, 0));
    return Math.abs(resta) >= 0.005 ? [...rows, { label, value: resta }] : rows;
  };
  const base: { title: string; rows: { label: string; value: number }[]; total: number } = (() => {
    switch (metric) {
      case 'ingressos':
        return { title: 'Ingressos · per mètode de cobrament', rows: balanc(met, v.ingressos, 'Fiances retingudes (ingrés)'), total: v.ingressos };
      case 'despeses':
        return { title: 'Despeses · per categoria', rows: cat, total: desp };
      case 'benefici':
        return { title: 'Benefici = Ingressos − Despeses', rows: [{ label: 'Ingressos', value: v.ingressos }, { label: 'Despeses', value: -desp }], total: v.benefici };
      case 'ingressos-fianca':
        return { title: 'Ingressos + fiança', rows: balanc(met, v.ingressosAmbRetencions, 'Fiances (retingudes + custòdia)'), total: v.ingressosAmbRetencions };
      case 'despeses-fianca':
        return { title: 'Despeses + fiança', rows: [...cat, ...(v.despesesFianca ? [{ label: 'Fiances pagades', value: v.despesesFianca }] : [])], total: r2(desp + v.despesesFianca) };
      case 'benefici-fianca':
        return { title: 'Benefici + fiança', rows: [{ label: 'Benefici', value: v.benefici }, { label: 'Fiances netes', value: v.retencions }], total: r2(v.benefici + v.retencions) };
      default:
        return { title: 'Desglossament', rows: [], total: 0 };
    }
  })();
  return { ...base, moviments };
}

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

// Llista de moviments del període amb filtre: ingressos / +fiança / despeses / tot.
const MOV_FILTRE_GRUPS: Record<string, MovGrup[]> = {
  ingressos: ['INGRES', 'FIANCA'],
  'ingressos-fianca': ['INGRES', 'FIANCA', 'FIANCA_CUST'],
  despeses: ['DESPESA', 'PERSONAL', 'FIANCA_PAGADA'],
  tot: ['INGRES', 'FIANCA', 'FIANCA_CUST', 'DESPESA', 'PERSONAL', 'FIANCA_PAGADA'],
};
function MovimentsCard({ moviments }: { moviments: MovDetall[] }) {
  const [filtre, setFiltre] = useState<'ingressos' | 'ingressos-fianca' | 'despeses' | 'tot'>('tot');
  const filtrats = moviments.filter((m) => MOV_FILTRE_GRUPS[filtre]!.includes(m.grup));
  const total = Math.round((filtrats.reduce((a, m) => a + m.import, 0) + Number.EPSILON) * 100) / 100;
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Moviments</CardTitle>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
          {[
            { k: 'ingressos', l: 'Ingressos' },
            { k: 'ingressos-fianca', l: 'Ingressos + fiança' },
            { k: 'despeses', l: 'Despeses' },
            { k: 'tot', l: 'Tot' },
          ].map((t) => (
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
              {filtrats.map((m) => (
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
                  <Td className={cn('text-right font-medium', m.import < 0 ? 'text-red-700' : 'text-green-700')}>
                    <Eur value={m.import} />
                  </Td>
                </Tr>
              ))}
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

function BreakdownsSection({ data, despesesFianca = 0 }: { data: Breakdowns; despesesFianca?: number }) {
  const metodes = metodeItems(data.ingressosPerMetode);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Despeses per categoria</CardTitle>
          </CardHeader>
          <CardBody>
            <Donut items={data.despesesPerCategoria.map((d) => ({ label: d.categoria, value: d.import }))} />
            {despesesFianca > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200">
                <span className="flex items-center gap-1.5 text-amber-800">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                    Fiança
                  </span>
                  Fiances pagades (recuperable)
                </span>
                <span className="font-medium text-amber-800"><Eur value={despesesFianca} /></span>
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ingressos per mètode</CardTitle>
          </CardHeader>
          <CardBody>
            {metodes.length === 0 ? (
              <p className="text-sm text-slate-400">Sense cobraments en aquest període.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {metodes.map((m) => (
                  <li key={m.label} className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-700">{m.label}</span>
                    <span className="font-medium text-slate-900"><Eur value={m.value} /></span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Moviments del període, amb filtre (ingressos / +fiança / despeses / tot) */}
      <MovimentsCard moviments={data.moviments ?? []} />
    </div>
  );
}

export default function BalancPage() {
  const restringit = useRestringit(); // vista de propietat: amaga custòdia/personal
  const [mode, setMode] = useState<Mode>('mes');
  const [anchor, setAnchor] = useState(() => new Date());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState<Balanc | null>(null);
  const [any, setAny] = useState<BalancAny | null>(null);
  const [situacio, setSituacio] = useState<BalancSituacio | null>(null);
  const [incloureCustodiaSituacio, setIncloureCustodiaSituacio] = useState(true);
  // Període del balanç de situació: el tall és a FINAL de mes / trimestre / any.
  const [situacioPeriode, setSituacioPeriode] = useState<'mes' | 'trimestre' | 'any'>('mes');
  // Rang per DIES (de X dia de Y mes a Z dia de S mes). Per defecte, el trimestre actual.
  const iniciTrim = (() => { const n = new Date(); const q = Math.floor(n.getMonth() / 3); return { y: n.getFullYear(), m1: q * 3 + 1, m2: q * 3 + 3 }; })();
  const [desde, setDesde] = useState(() => `${iniciTrim.y}-${String(iniciTrim.m1).padStart(2, '0')}-01`);
  const [fins, setFins] = useState(() => {
    const ultim = new Date(iniciTrim.y, iniciTrim.m2, 0);
    return `${iniciTrim.y}-${String(iniciTrim.m2).padStart(2, '0')}-${String(ultim.getDate()).padStart(2, '0')}`;
  });
  const [rang, setRang] = useState<Balanc | null>(null);

  // Data de tall del balanç de situació = últim dia del període triat, però MAI en
  // el futur (un balanç no pot incloure moviments que encara no han passat): si el
  // final del període és posterior a avui, es talla a avui.
  // Període de la Situació (NOMÉS els moviments d'aquest període, com les altres
  // vistes): mes de l'anchor, trimestre de l'anchor o l'any sencer.
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

  const mesParam = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;
  const loadMes = useCallback(async () => setMes(await getJSON<Balanc>(`/api/balanc?mes=${mesParam}`)), [mesParam]);
  const loadRang = useCallback(async () => setRang(await getJSON<Balanc>(`/api/balanc/rang?desde=${desde}&fins=${fins}`)), [desde, fins]);
  const loadAny = useCallback(async () => setAny(await getJSON<BalancAny>(`/api/balanc/any?any=${year}`)), [year]);
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
    if (mode === 'mes') loadMes();
    else if (mode === 'rang') loadRang();
    else if (mode === 'any') loadAny();
    else loadSituacio();
  }, [mode, loadMes, loadRang, loadAny, loadSituacio]);

  // Sèrie mensual per a les gràfiques: a Mes, els últims 12 mesos fins al mes
  // triat; a Trimestre/rang, els mesos del rang seleccionat.
  const [serie, setSerie] = useState<SerieMes[] | null>(null);
  const [breakdown, setBreakdown] = useState<Desglos | null>(null);
  const serieDesde =
    mode === 'mes'
      ? (() => { const d = addMonths(anchor, -11); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })()
      : desde.slice(0, 7);
  const serieFins = mode === 'mes' ? mesParam : fins.slice(0, 7);
  useEffect(() => {
    if (mode !== 'mes' && mode !== 'rang') return;
    let cancel = false;
    getJSON<{ mesos: SerieMes[] }>(`/api/balanc/mesos?desde=${serieDesde}&fins=${serieFins}`)
      .then((r) => { if (!cancel) setSerie(r.mesos); })
      .catch(() => { if (!cancel) setSerie(null); });
    return () => { cancel = true; };
  }, [mode, serieDesde, serieFins]);

  // Etiquetes dels mesos de la sèrie (amb l'any abreujat si el rang creua anys).
  const seriePunts = (s: SerieMes[]) => {
    const creuaAnys = s.some((x) => x.any !== s[0]!.any);
    return s.map((x) => ({ ...x, label: `${MESOS[x.mes - 1]}${creuaAnys ? ` ${String(x.any).slice(2)}` : ''}` }));
  };

  const mesLabel = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(anchor);

  function exporta() {
    if (mode === 'mes' && mes) {
      const rows: (string | number)[][] = [
        [`Balanç ${mes.mes}`, ''],
        ['Concepte', 'Import'],
        ['Ingressos (sense retencions)', mes.ingressos.toFixed(2)],
        ['Retencions en custòdia', mes.retencions.toFixed(2)],
        ['Ingressos + retencions', mes.ingressosAmbRetencions.toFixed(2)],
        ['Despeses', (mes.despeses + mes.personal).toFixed(2)],
        ['Benefici', mes.benefici.toFixed(2)],
        ['Marge %', marge(mes.benefici, mes.ingressos)],
        [''],
        ['Ingressos per mètode', ''],
        ...metodeItems(mes.ingressosPerMetode).map((m) => [m.label, m.value.toFixed(2)]),
        [''],
        ['Despeses per categoria', ''],
        ...mes.despesesPerCategoria.map((d) => [d.categoria, d.import.toFixed(2)]),
      ];
      downloadCSV(`balanc-${mes.mes}.csv`, rows);
    } else if (mode === 'rang' && rang) {
      const rows: (string | number)[][] = [
        [`Balanç ${rang.mes}`, ''],
        ['Concepte', 'Import'],
        ['Ingressos (sense fiança)', rang.ingressos.toFixed(2)],
        ['Fiança en custòdia', rang.retencions.toFixed(2)],
        ['Ingressos + fiança', rang.ingressosAmbRetencions.toFixed(2)],
        ['Despeses', (rang.despeses + rang.personal).toFixed(2)],
        ['Benefici', rang.benefici.toFixed(2)],
        ['Marge %', marge(rang.benefici, rang.ingressos)],
        [''],
        ['Ingressos per mètode', ''],
        ...metodeItems(rang.ingressosPerMetode).map((m) => [m.label, m.value.toFixed(2)]),
        [''],
        ['Despeses per categoria', ''],
        ...rang.despesesPerCategoria.map((d) => [d.categoria, d.import.toFixed(2)]),
      ];
      downloadCSV(`balanc-rang-${rang.mes.replace(/[^\d-]+/g, '_')}.csv`, rows);
    } else if (mode === 'any' && any) {
      const rows: (string | number)[][] = [
        [`Balanç ${any.any}`, ''],
        ['Mes', 'Ingressos', 'Fiança', 'Ingressos+fiança', 'Despeses', 'Benefici'],
        ...any.mesos.map((m) => [
          MESOS[m.mes - 1]!,
          m.ingressos.toFixed(2),
          m.retencions.toFixed(2),
          m.ingressosAmbRetencions.toFixed(2),
          (m.despeses + m.personal).toFixed(2),
          m.benefici.toFixed(2),
        ]),
        ['TOTAL', any.totals.ingressos.toFixed(2), any.totals.retencions.toFixed(2), any.totals.ingressosAmbRetencions.toFixed(2), (any.totals.despeses + any.totals.personal).toFixed(2), any.totals.benefici.toFixed(2)],
        [''],
        ['Ingressos per mètode (any)', ''],
        ...metodeItems(any.ingressosPerMetode).map((m) => [m.label, m.value.toFixed(2)]),
        [''],
        ['Despeses per categoria (any)', ''],
        ...any.despesesPerCategoria.map((d) => [d.categoria, d.import.toFixed(2)]),
      ];
      downloadCSV(`balanc-${any.any}.csv`, rows);
    } else if (mode === 'situacio' && situacio) {
      const s = situacio;
      const rows: (string | number)[][] = [
        [`Balanç de situació ${s.data}${s.inclouCustodia ? '' : ' sense custòdia'}`, ''],
        ['ACTIU', ''],
        ['Actiu no corrent', ''],
        ['  Immobilitzat material (valor brut)', s.actiu.noCorrent.immobilitzatBrut.toFixed(2)],
        ['Actiu corrent', ''],
        ['  Deutors comercials', s.actiu.corrent.deutors.toFixed(2)],
        ['  Tresoreria general (caixa/banc)', s.actiu.corrent.tresoreriaOperativa.toFixed(2)],
        ['  Tresoreria - efectiu de fiances en dipòsit', s.actiu.corrent.tresoreriaFiances.toFixed(2)],
        ['TOTAL ACTIU', s.actiu.total.toFixed(2)],
        [''],
        ['PATRIMONI NET I PASSIU', ''],
        ['Patrimoni net (figura de quadre)', s.patrimoniIPassiu.patrimoniNet.toFixed(2)],
        ['Passiu no corrent', s.patrimoniIPassiu.passiuNoCorrent.toFixed(2)],
        ['Passiu corrent - Fiances a retornar', s.patrimoniIPassiu.passiuCorrent.fiances.toFixed(2)],
        ['TOTAL PATRIMONI NET I PASSIU', s.patrimoniIPassiu.total.toFixed(2)],
        [''],
        ['Dades no incloses (balanç aproximat)', ''],
        ...s.mancances.map((m) => [m, '']),
      ];
      downloadCSV(`balanc-situacio-${s.data}.csv`, rows);
    }
  }

  return (
    <div>
      <HideAmountsOnMount />
      <PageHeader
        title="Balanç"
        subtitle="Comptabilitat del hostal: ingressos, despeses, benefici i caixa"
        actions={
          <div className="flex items-center gap-2">
            <HideAmountsButton />
            {mode !== 'situacio' && (
              <div className="flex overflow-hidden rounded-lg border border-slate-300">
                <button onClick={() => setMode('mes')} className={cn('px-3 py-1.5 text-sm', mode === 'mes' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}>
                  Mes
                </button>
                <button onClick={() => setMode('rang')} className={cn('border-l border-slate-300 px-3 py-1.5 text-sm', mode === 'rang' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}>
                  Trimestre / rang
                </button>
                <button onClick={() => setMode('any')} className={cn('border-l border-slate-300 px-3 py-1.5 text-sm', mode === 'any' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}>
                  Any
                </button>
              </div>
            )}
            <button
              onClick={() => setMode(mode === 'situacio' ? 'mes' : 'situacio')}
              className={cn('rounded-lg border px-3 py-1.5 text-sm', mode === 'situacio' ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}
            >
              <Scale className="mr-1 inline h-3.5 w-3.5" />
              Situació
            </button>
            <Button variant="outline" size="sm" onClick={exporta}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            {mode !== 'rang' && (
              <a
                href={
                  mode === 'mes'
                    ? `/api/balanc/pdf?mes=${mesParam}`
                    : mode === 'any'
                      ? `/api/balanc/pdf?any=${year}`
                      : `/api/balanc/pdf?situacio=${situacioFins}&desde=${situacioDesde}&custodia=${incloureCustodiaSituacio ? 'true' : 'false'}`
                }
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

      {!restringit && <TrimestreIvaCard />}

      {mode === 'mes' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAnchor(addMonths(anchor, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Aquest mes
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(addMonths(anchor, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-sm font-medium capitalize text-slate-600">{mesLabel}</span>
          </div>
          {mes && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi label="Ingressos" value={<Eur value={mes.ingressos} />} icon={TrendingUp} color="text-green-600" big onSelect={() => setBreakdown(desglos('ingressos', mes))} />
                <Kpi label="Despeses" value={<Eur value={mes.despeses + mes.personal} />} icon={TrendingDown} color="text-red-600" onSelect={() => setBreakdown(desglos('despeses', mes))} />
                <Kpi label="Benefici" value={<Eur value={mes.benefici} />} icon={Wallet} color={mes.benefici >= 0 ? 'text-green-600' : 'text-red-600'} big onSelect={() => setBreakdown(desglos('benefici', mes))} />
                {!restringit && (
                  <>
                    <Kpi label="Ingressos + fiança" value={<Eur value={mes.ingressosAmbRetencions} />} icon={PiggyBank} color="text-brand-700" onSelect={() => setBreakdown(desglos('ingressos-fianca', mes))} />
                    <Kpi label="Despeses + fiança" value={<Eur value={mes.despeses + mes.personal + mes.despesesFianca} />} icon={TrendingDown} color="text-red-600" onSelect={() => setBreakdown(desglos('despeses-fianca', mes))} />
                    <Kpi
                      label="Benefici + fiança"
                      value={<Eur value={mes.benefici + mes.retencions} />}
                      icon={Wallet}
                      color={mes.benefici + mes.retencions >= 0 ? 'text-green-600' : 'text-red-600'}
                      big
                      onSelect={() => setBreakdown(desglos('benefici-fianca', mes))}
                    />
                  </>
                )}
              </div>


              {serie && serie.length > 0 && (
                <div className={`grid gap-4 ${restringit ? '' : 'lg:grid-cols-2'}`}>
                  <BalancLineChart
                    titol="Ingressos, despeses i benefici (últims 12 mesos)"
                    punts={seriePunts(serie).map((s) => ({ label: s.label, barA: s.ingressos, barB: s.despeses + s.personal, linia: s.benefici }))}
                    nomA="Ingressos"
                    nomB="Despeses"
                    nomLinia="Benefici"
                  />
                  {!restringit && (
                    <BalancLineChart
                      titol="Amb fiança (últims 12 mesos)"
                      punts={seriePunts(serie).map((s) => ({ label: s.label, barA: s.ingressosAmbRetencions, barB: s.despeses + s.personal + s.despesesFianca, linia: s.benefici + s.retencions }))}
                      nomA="Ingressos + fiança"
                      nomB="Despeses + fiança"
                      nomLinia="Benefici + fiança"
                      colorA="#f97316"
                      colorLinia="#c2410c"
                    />
                  )}
                </div>
              )}

              <BreakdownsSection data={ambPersonal(mes, mes.personal)} despesesFianca={mes.despesesFianca} />
            </>
          )}
        </div>
      ) : mode === 'rang' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600">De</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => e.target.value && setDesde(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <label className="text-sm text-slate-600">a</label>
            <input
              type="date"
              value={fins}
              onChange={(e) => e.target.value && setFins(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <span className="mx-1 text-slate-300">·</span>
            <span className="text-xs text-slate-400">Trimestre:</span>
            {[1, 2, 3, 4].map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                onClick={() => {
                  const y = Number(desde.slice(0, 4)) || new Date().getFullYear();
                  const m1 = (q - 1) * 3 + 1;
                  const m2 = (q - 1) * 3 + 3;
                  const ultim = new Date(y, m2, 0).getDate();
                  setDesde(`${y}-${String(m1).padStart(2, '0')}-01`);
                  setFins(`${y}-${String(m2).padStart(2, '0')}-${String(ultim).padStart(2, '0')}`);
                }}
              >
                T{q}
              </Button>
            ))}
          </div>
          {rang && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi label="Ingressos" value={<Eur value={rang.ingressos} />} icon={TrendingUp} color="text-green-600" big onSelect={() => setBreakdown(desglos('ingressos', rang))} />
                <Kpi label="Despeses" value={<Eur value={rang.despeses + rang.personal} />} icon={TrendingDown} color="text-red-600" onSelect={() => setBreakdown(desglos('despeses', rang))} />
                <Kpi label="Benefici" value={<Eur value={rang.benefici} />} icon={Wallet} color={rang.benefici >= 0 ? 'text-green-600' : 'text-red-600'} big onSelect={() => setBreakdown(desglos('benefici', rang))} />
                {!restringit && (
                  <>
                    <Kpi label="Ingressos + fiança" value={<Eur value={rang.ingressosAmbRetencions} />} icon={PiggyBank} color="text-brand-700" onSelect={() => setBreakdown(desglos('ingressos-fianca', rang))} />
                    <Kpi label="Despeses + fiança" value={<Eur value={rang.despeses + rang.personal + rang.despesesFianca} />} icon={TrendingDown} color="text-red-600" onSelect={() => setBreakdown(desglos('despeses-fianca', rang))} />
                    <Kpi label="Benefici + fiança" value={<Eur value={rang.benefici + rang.retencions} />} icon={Wallet} color={rang.benefici + rang.retencions >= 0 ? 'text-green-600' : 'text-red-600'} big onSelect={() => setBreakdown(desglos('benefici-fianca', rang))} />
                  </>
                )}
              </div>
              {serie && serie.length > 0 && (
                <div className={`grid gap-4 ${restringit ? '' : 'lg:grid-cols-2'}`}>
                  <BalancLineChart
                    titol="Ingressos, despeses i benefici (mesos del període)"
                    punts={seriePunts(serie).map((s) => ({ label: s.label, barA: s.ingressos, barB: s.despeses + s.personal, linia: s.benefici }))}
                    nomA="Ingressos"
                    nomB="Despeses"
                    nomLinia="Benefici"
                  />
                  {!restringit && (
                    <BalancLineChart
                      titol="Amb fiança (mesos del període)"
                      punts={seriePunts(serie).map((s) => ({ label: s.label, barA: s.ingressosAmbRetencions, barB: s.despeses + s.personal + s.despesesFianca, linia: s.benefici + s.retencions }))}
                      nomA="Ingressos + fiança"
                      nomB="Despeses + fiança"
                      nomLinia="Benefici + fiança"
                      colorA="#f97316"
                      colorLinia="#c2410c"
                    />
                  )}
                </div>
              )}

              <BreakdownsSection data={ambPersonal(rang, rang.personal)} despesesFianca={rang.despesesFianca} />
            </>
          )}
        </div>
      ) : mode === 'any' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setYear(year - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700">{year}</span>
            <Button variant="outline" size="sm" onClick={() => setYear(year + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {any && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi label="Ingressos" value={<Eur value={any.totals.ingressos} />} icon={TrendingUp} color="text-green-600" big delta={variacio(any.totals.ingressos, any.anterior.ingressos)} onSelect={() => setBreakdown(desglos('ingressos', { ...any.totals, ingressosPerMetode: any.ingressosPerMetode, despesesPerCategoria: any.despesesPerCategoria, moviments: any.moviments }))} />
                <Kpi label="Despeses" value={<Eur value={any.totals.despeses + any.totals.personal} />} icon={TrendingDown} color="text-red-600" delta={variacio(any.totals.despeses + any.totals.personal, any.anterior.despeses + any.anterior.personal)} deltaInvert onSelect={() => setBreakdown(desglos('despeses', { ...any.totals, ingressosPerMetode: any.ingressosPerMetode, despesesPerCategoria: any.despesesPerCategoria, moviments: any.moviments }))} />
                <Kpi label="Benefici" value={<Eur value={any.totals.benefici} />} icon={Wallet} color={any.totals.benefici >= 0 ? 'text-green-600' : 'text-red-600'} big delta={variacio(any.totals.benefici, any.anterior.benefici)} onSelect={() => setBreakdown(desglos('benefici', { ...any.totals, ingressosPerMetode: any.ingressosPerMetode, despesesPerCategoria: any.despesesPerCategoria, moviments: any.moviments }))} />
                {!restringit && (
                  <>
                    <Kpi label="Ingressos + fiança" value={<Eur value={any.totals.ingressosAmbRetencions} />} icon={PiggyBank} color="text-brand-700" onSelect={() => setBreakdown(desglos('ingressos-fianca', { ...any.totals, ingressosPerMetode: any.ingressosPerMetode, despesesPerCategoria: any.despesesPerCategoria, moviments: any.moviments }))} />
                    <Kpi label="Despeses + fiança" value={<Eur value={any.totals.despeses + any.totals.personal + any.totals.despesesFianca} />} icon={TrendingDown} color="text-red-600" onSelect={() => setBreakdown(desglos('despeses-fianca', { ...any.totals, ingressosPerMetode: any.ingressosPerMetode, despesesPerCategoria: any.despesesPerCategoria, moviments: any.moviments }))} />
                    <Kpi label="Benefici + fiança" value={<Eur value={any.totals.benefici + any.totals.retencions} />} icon={Wallet} color={any.totals.benefici + any.totals.retencions >= 0 ? 'text-green-600' : 'text-red-600'} big onSelect={() => setBreakdown(desglos('benefici-fianca', { ...any.totals, ingressosPerMetode: any.ingressosPerMetode, despesesPerCategoria: any.despesesPerCategoria, moviments: any.moviments }))} />
                  </>
                )}
              </div>

              <BalancChart mesos={any.mesos} />

              <Table>
                <Thead>
                  <tr>
                    <Th>Mes</Th>
                    <Th className="text-right">Ingressos</Th>
                    <Th className="text-right">Fiança</Th>
                    <Th className="text-right">Ing.+fiança</Th>
                    <Th className="text-right">Despeses</Th>
                    <Th className="text-right">Benefici</Th>
                  </tr>
                </Thead>
                <tbody>
                  {any.mesos.map((m) => (
                    <Tr key={m.mes}>
                      <Td>{MESOS[m.mes - 1]}</Td>
                      <Td className="text-right"><Eur value={m.ingressos} /></Td>
                      <Td className="text-right text-amber-700"><Eur value={m.retencions} /></Td>
                      <Td className="text-right font-medium"><Eur value={m.ingressosAmbRetencions} /></Td>
                      <Td className="text-right text-red-700"><Eur value={m.despeses + m.personal} /></Td>
                      <Td className={cn('text-right font-medium', m.benefici >= 0 ? 'text-green-700' : 'text-red-700')}>
                        <Eur value={m.benefici} />
                      </Td>
                    </Tr>
                  ))}
                  <Tr className="bg-slate-50 font-semibold">
                    <Td>TOTAL</Td>
                    <Td className="text-right"><Eur value={any.totals.ingressos} /></Td>
                    <Td className="text-right"><Eur value={any.totals.retencions} /></Td>
                    <Td className="text-right"><Eur value={any.totals.ingressosAmbRetencions} /></Td>
                    <Td className="text-right"><Eur value={any.totals.despeses + any.totals.personal} /></Td>
                    <Td className="text-right"><Eur value={any.totals.benefici} /></Td>
                  </Tr>
                </tbody>
              </Table>

              <BreakdownsSection data={ambPersonal(any, any.totals.personal)} despesesFianca={any.totals.despesesFianca} />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Scale className="h-4 w-4 text-slate-400" />
            {/* Període: el tall és a final de mes / trimestre / any */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => situacioPeriode === 'any' ? setYear(year + 1) : setAnchor(addMonths(anchor, situacioPeriode === 'trimestre' ? 3 : 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-xs text-slate-400">
              (del {situacioDesde.split('-').reverse().join('/')} al {situacioFins.split('-').reverse().join('/')})
            </span>
            {!restringit && (
              <div className="ml-2 flex overflow-hidden rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setIncloureCustodiaSituacio(true)}
                  className={cn('px-3 py-1.5 text-sm', incloureCustodiaSituacio ? 'bg-orange-500 text-white' : 'bg-white text-orange-600')}
                >
                  Amb fiança
                </button>
                <button
                  type="button"
                  onClick={() => setIncloureCustodiaSituacio(false)}
                  className={cn('border-l border-slate-300 px-3 py-1.5 text-sm', !incloureCustodiaSituacio ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}
                >
                  Sense fiança
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Balanç <strong>del període</strong>: només s&apos;hi compten els moviments del mes,
            trimestre o any triat (cobraments, devolucions, fiances rebudes, despeses i actius
            comprats dins del període). No és un acumulat històric.
          </p>
          {situacio && <SituacioView data={situacio} />}
        </div>
      )}

      {mode !== 'situacio' && (
        <p className="mt-4 text-xs text-slate-400">
          Ingressos = cobraments + dipòsits retinguts. Les despeses inclouen el cost de personal.
          El <strong>Benefici</strong> és Ingressos − Despeses (el real); el <strong>Benefici + fiança</strong>
          hi suma les fiances en custòdia (diners retornables). Exporta-ho tot a CSV per a la gestoria.
        </p>
      )}

      {/* Modal de desglossament d'un KPI */}
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
            {breakdown.rows.length === 0 ? (
              <p className="text-sm italic text-slate-400">Sense desglossament per a aquest període.</p>
            ) : (
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

            {breakdown.moviments && breakdown.moviments.length > 0 && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
