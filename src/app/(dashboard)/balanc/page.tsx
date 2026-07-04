'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  TrendingDown,
  PiggyBank,
  Percent,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Scale,
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
import { Donut } from '@/components/balanc/donut';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Eur, HideAmountsButton, HideAmountsOnMount } from '@/components/finances/amounts-visibility';
import { METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';

interface Breakdowns {
  ingressosPerMetode: Record<string, number>;
  despesesPerCategoria: { categoria: string; import: number }[];
  ocupacio: number;
  adr: number;
  revpar: number;
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
  personal: number;
  benefici: number;
}
interface BalancAny extends Breakdowns {
  any: number;
  mesos: MesRow[];
  totals: Omit<MesRow, 'mes'>;
  anterior: { ingressos: number; despeses: number; personal: number; benefici: number };
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
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
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

function Kpi({ label, value, icon: Icon, color, big, delta, deltaInvert }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; color: string; big?: boolean; delta?: string | null; deltaInvert?: boolean }) {
  const down = delta?.startsWith('-');
  const deltaGood = deltaInvert ? down : !down;
  return (
    <Card className={big ? 'ring-1 ring-brand-200' : ''}>
      <CardBody className="flex items-center gap-4">
        <div className="rounded-lg bg-slate-100 p-3">
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <p className={`font-bold text-slate-900 ${big ? 'text-2xl' : 'text-xl'}`}>{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {delta && (
            <p className={cn('text-xs font-medium', deltaGood ? 'text-green-600' : 'text-red-600')}>
              {delta} vs any anterior
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
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

function BreakdownsSection({ data }: { data: Breakdowns }) {
  const metodes = metodeItems(data.ingressosPerMetode);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Despeses per categoria</CardTitle>
        </CardHeader>
        <CardBody>
          <Donut items={data.despesesPerCategoria.map((d) => ({ label: d.categoria, value: d.import }))} />
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
  );
}

export default function BalancPage() {
  const restringit = useRestringit(); // vista de propietat: amaga custòdia/personal
  const [mode, setMode] = useState<Mode>('mes');
  const [anchor, setAnchor] = useState(() => new Date());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState<Balanc | null>(null);
  const [any, setAny] = useState<BalancAny | null>(null);
  const [dataTall, setDataTall] = useState(todayISO);
  const [situacio, setSituacio] = useState<BalancSituacio | null>(null);
  const [incloureCustodiaSituacio, setIncloureCustodiaSituacio] = useState(true);
  // Rang de mesos (trimestre / de X mes a Y mes). Per defecte, el trimestre actual.
  const iniciTrim = (() => { const n = new Date(); const q = Math.floor(n.getMonth() / 3); return { y: n.getFullYear(), m1: q * 3 + 1, m2: q * 3 + 3 }; })();
  const [desde, setDesde] = useState(`${iniciTrim.y}-${String(iniciTrim.m1).padStart(2, '0')}`);
  const [fins, setFins] = useState(`${iniciTrim.y}-${String(iniciTrim.m2).padStart(2, '0')}`);
  const [rang, setRang] = useState<Balanc | null>(null);

  const mesParam = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;
  const loadMes = useCallback(async () => setMes(await getJSON<Balanc>(`/api/balanc?mes=${mesParam}`)), [mesParam]);
  const loadRang = useCallback(async () => setRang(await getJSON<Balanc>(`/api/balanc/rang?desde=${desde}&fins=${fins}`)), [desde, fins]);
  const loadAny = useCallback(async () => setAny(await getJSON<BalancAny>(`/api/balanc/any?any=${year}`)), [year]);
  const loadSituacio = useCallback(
    async () =>
      setSituacio(
        await getJSON<BalancSituacio>(
          `/api/balanc/situacio?data=${dataTall}&custodia=${!restringit && incloureCustodiaSituacio ? 'true' : 'false'}`,
        ),
      ),
    [dataTall, incloureCustodiaSituacio, restringit],
  );
  useEffect(() => {
    if (mode === 'mes') loadMes();
    else if (mode === 'rang') loadRang();
    else if (mode === 'any') loadAny();
    else loadSituacio();
  }, [mode, loadMes, loadRang, loadAny, loadSituacio]);

  const mesLabel = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(anchor);

  function exporta() {
    if (mode === 'mes' && mes) {
      const rows: (string | number)[][] = [
        [`Balanç ${mes.mes}`, ''],
        ['Concepte', 'Import'],
        ['Ingressos (sense retencions)', mes.ingressos.toFixed(2)],
        ['Retencions en custòdia', mes.retencions.toFixed(2)],
        ['Ingressos + retencions', mes.ingressosAmbRetencions.toFixed(2)],
        ['Despeses (inclou personal)', (mes.despeses + mes.personal).toFixed(2)],
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
        ['Despeses (inclou personal)', (rang.despeses + rang.personal).toFixed(2)],
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
        ['Mes', 'Ingressos', 'Fiança', 'Ingressos+fiança', 'Despeses (inclou personal)', 'Benefici'],
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
                      : `/api/balanc/pdf?situacio=${dataTall}&custodia=${incloureCustodiaSituacio ? 'true' : 'false'}`
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
                <Kpi label="Ingressos" value={<Eur value={mes.ingressos} />} icon={TrendingUp} color="text-green-600" big />
                <Kpi label="Despeses (sense personal)" value={<Eur value={mes.despeses} />} icon={TrendingDown} color="text-red-600" />
                <Kpi label="Benefici" value={<Eur value={mes.benefici} />} icon={Wallet} color={mes.benefici >= 0 ? 'text-green-600' : 'text-red-600'} big />
                {!restringit && (
                  <>
                    <Kpi label="Ingressos + fiança" value={<Eur value={mes.ingressosAmbRetencions} />} icon={PiggyBank} color="text-brand-700" />
                    <Kpi label="Despeses (amb personal)" value={<Eur value={mes.despeses + mes.personal} />} icon={TrendingDown} color="text-red-600" />
                    <Kpi
                      label="Benefici + fiança"
                      value={<Eur value={mes.benefici + mes.retencions} />}
                      icon={Wallet}
                      color={mes.benefici + mes.retencions >= 0 ? 'text-green-600' : 'text-red-600'}
                      big
                    />
                  </>
                )}
              </div>


              <BreakdownsSection data={ambPersonal(mes, mes.personal)} />
            </>
          )}
        </div>
      ) : mode === 'rang' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600">De</label>
            <input
              type="month"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <label className="text-sm text-slate-600">a</label>
            <input
              type="month"
              value={fins}
              onChange={(e) => setFins(e.target.value)}
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
                  setDesde(`${y}-${String((q - 1) * 3 + 1).padStart(2, '0')}`);
                  setFins(`${y}-${String((q - 1) * 3 + 3).padStart(2, '0')}`);
                }}
              >
                T{q}
              </Button>
            ))}
          </div>
          {rang && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi label="Ingressos" value={<Eur value={rang.ingressos} />} icon={TrendingUp} color="text-green-600" big />
                <Kpi label="Despeses (sense personal)" value={<Eur value={rang.despeses} />} icon={TrendingDown} color="text-red-600" />
                <Kpi label="Benefici" value={<Eur value={rang.benefici} />} icon={Wallet} color={rang.benefici >= 0 ? 'text-green-600' : 'text-red-600'} big />
                {!restringit && (
                  <>
                    <Kpi label="Ingressos + fiança" value={<Eur value={rang.ingressosAmbRetencions} />} icon={PiggyBank} color="text-brand-700" />
                    <Kpi label="Despeses (amb personal)" value={<Eur value={rang.despeses + rang.personal} />} icon={TrendingDown} color="text-red-600" />
                    <Kpi label="Benefici + fiança" value={<Eur value={rang.benefici + rang.retencions} />} icon={Wallet} color={rang.benefici + rang.retencions >= 0 ? 'text-green-600' : 'text-red-600'} big />
                  </>
                )}
              </div>
              <BreakdownsSection data={ambPersonal(rang, rang.personal)} />
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
                <Kpi label="Ingressos" value={<Eur value={any.totals.ingressos} />} icon={TrendingUp} color="text-green-600" big delta={variacio(any.totals.ingressos, any.anterior.ingressos)} />
                <Kpi label="Despeses (sense personal)" value={<Eur value={any.totals.despeses} />} icon={TrendingDown} color="text-red-600" />
                <Kpi label="Benefici" value={<Eur value={any.totals.benefici} />} icon={Wallet} color={any.totals.benefici >= 0 ? 'text-green-600' : 'text-red-600'} big delta={variacio(any.totals.benefici, any.anterior.benefici)} />
                {!restringit && (
                  <>
                    <Kpi label="Ingressos + fiança" value={<Eur value={any.totals.ingressosAmbRetencions} />} icon={PiggyBank} color="text-brand-700" />
                    <Kpi label="Despeses (amb personal)" value={<Eur value={any.totals.despeses + any.totals.personal} />} icon={TrendingDown} color="text-red-600" delta={variacio(any.totals.despeses + any.totals.personal, any.anterior.despeses + any.anterior.personal)} deltaInvert />
                    <Kpi label="Benefici + fiança" value={<Eur value={any.totals.benefici + any.totals.retencions} />} icon={Wallet} color={any.totals.benefici + any.totals.retencions >= 0 ? 'text-green-600' : 'text-red-600'} big />
                  </>
                )}
                <Kpi label="Marge" value={`${marge(any.totals.benefici, any.totals.ingressos)}%`} icon={Percent} color="text-brand-700" />
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

              <BreakdownsSection data={ambPersonal(any, any.totals.personal)} />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Scale className="h-4 w-4 text-slate-400" />
            <label className="text-sm text-slate-600" htmlFor="data-tall">
              A data de
            </label>
            <input
              id="data-tall"
              type="date"
              value={dataTall}
              onChange={(e) => setDataTall(e.target.value || todayISO())}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
            />
            <Button variant="outline" size="sm" onClick={() => setDataTall(todayISO())}>
              Avui
            </Button>
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
    </div>
  );
}
