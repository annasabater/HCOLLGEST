'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Coins,
  Wallet,
  TrendingDown,
  UserCog,
  PiggyBank,
  Percent,
  BedDouble,
  Moon,
  Download,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr } from '@/components/ui/table';
import { getJSON } from '@/lib/api';
import { addMonths } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { BalancChart } from '@/components/balanc/balanc-chart';
import { Donut } from '@/components/balanc/donut';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Eur, HideAmountsButton } from '@/components/finances/amounts-visibility';
import { METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';

interface Breakdowns {
  ingressosPerMetode: Record<string, number>;
  despesesPerCategoria: { categoria: string; import: number }[];
  ocupacio: number;
  adr: number;
  revpar: number;
}
interface Balanc extends Breakdowns {
  mes: string;
  ingressos: number;
  retencions: number;
  ingressosAmbRetencions: number;
  despeses: number;
  personal: number;
  benefici: number;
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

type Mode = 'mes' | 'any';
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
  const [mode, setMode] = useState<Mode>('mes');
  const [anchor, setAnchor] = useState(() => new Date());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState<Balanc | null>(null);
  const [any, setAny] = useState<BalancAny | null>(null);

  const mesParam = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;
  const loadMes = useCallback(async () => setMes(await getJSON<Balanc>(`/api/balanc?mes=${mesParam}`)), [mesParam]);
  const loadAny = useCallback(async () => setAny(await getJSON<BalancAny>(`/api/balanc/any?any=${year}`)), [year]);
  useEffect(() => {
    if (mode === 'mes') loadMes();
    else loadAny();
  }, [mode, loadMes, loadAny]);

  const mesLabel = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(anchor);

  function exporta() {
    if (mode === 'mes' && mes) {
      const rows: (string | number)[][] = [
        [`Balanç ${mes.mes}`, ''],
        ['Concepte', 'Import'],
        ['Ingressos (sense retencions)', mes.ingressos.toFixed(2)],
        ['Retencions en custòdia', mes.retencions.toFixed(2)],
        ['Ingressos + retencions', mes.ingressosAmbRetencions.toFixed(2)],
        ['Despeses', mes.despeses.toFixed(2)],
        ['Personal', mes.personal.toFixed(2)],
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
    } else if (mode === 'any' && any) {
      const rows: (string | number)[][] = [
        [`Balanç ${any.any}`, ''],
        ['Mes', 'Ingressos', 'Retencions', 'Ingressos+ret', 'Despeses', 'Personal', 'Benefici'],
        ...any.mesos.map((m) => [
          MESOS[m.mes - 1]!,
          m.ingressos.toFixed(2),
          m.retencions.toFixed(2),
          m.ingressosAmbRetencions.toFixed(2),
          m.despeses.toFixed(2),
          m.personal.toFixed(2),
          m.benefici.toFixed(2),
        ]),
        ['TOTAL', any.totals.ingressos.toFixed(2), any.totals.retencions.toFixed(2), any.totals.ingressosAmbRetencions.toFixed(2), any.totals.despeses.toFixed(2), any.totals.personal.toFixed(2), any.totals.benefici.toFixed(2)],
        [''],
        ['Ingressos per mètode (any)', ''],
        ...metodeItems(any.ingressosPerMetode).map((m) => [m.label, m.value.toFixed(2)]),
        [''],
        ['Despeses per categoria (any)', ''],
        ...any.despesesPerCategoria.map((d) => [d.categoria, d.import.toFixed(2)]),
      ];
      downloadCSV(`balanc-${any.any}.csv`, rows);
    }
  }

  return (
    <div>
      <PageHeader
        title="Balanç"
        subtitle="Comptabilitat del hostal: ingressos, despeses, benefici i caixa"
        actions={
          <div className="flex items-center gap-2">
            <HideAmountsButton />
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <button onClick={() => setMode('mes')} className={cn('px-3 py-1.5 text-sm', mode === 'mes' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}>
                Mes
              </button>
              <button onClick={() => setMode('any')} className={cn('px-3 py-1.5 text-sm', mode === 'any' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}>
                Any
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={exporta}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <a
              href={mode === 'mes' ? `/api/balanc/pdf?mes=${mesParam}` : `/api/balanc/pdf?any=${year}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" /> PDF
            </a>
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Ingressos" value={<Eur value={mes.ingressos} />} icon={TrendingUp} color="text-green-600" big />
                <Kpi label="Despeses" value={<Eur value={mes.despeses} />} icon={TrendingDown} color="text-red-600" />
                <Kpi label="Personal" value={<Eur value={mes.personal} />} icon={UserCog} color="text-slate-600" />
                <Kpi label="Benefici" value={<Eur value={mes.benefici} />} icon={Wallet} color={mes.benefici >= 0 ? 'text-green-600' : 'text-red-600'} big />
                <Kpi label="Marge" value={`${marge(mes.benefici, mes.ingressos)}%`} icon={Percent} color="text-brand-700" />
                <Kpi label="Ingressos + retencions" value={<Eur value={mes.ingressosAmbRetencions} />} icon={PiggyBank} color="text-brand-700" />
                <Kpi label="Dipòsits en custòdia" value={<Eur value={mes.retencions} />} icon={Coins} color="text-amber-600" />
                <Kpi label="Ocupació" value={`${mes.ocupacio}%`} icon={BedDouble} color="text-brand-700" />
                <Kpi label="ADR (preu mitjà/nit)" value={<Eur value={mes.adr} />} icon={Moon} color="text-slate-600" />
                <Kpi label="RevPAR" value={<Eur value={mes.revpar} />} icon={Percent} color="text-slate-600" />
              </div>
              <BreakdownsSection data={mes} />
            </>
          )}
        </div>
      ) : (
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Kpi label="Ingressos (any)" value={<Eur value={any.totals.ingressos} />} icon={TrendingUp} color="text-green-600" big delta={variacio(any.totals.ingressos, any.anterior.ingressos)} />
                <Kpi label="Despeses (any)" value={<Eur value={any.totals.despeses} />} icon={TrendingDown} color="text-red-600" delta={variacio(any.totals.despeses, any.anterior.despeses)} deltaInvert />
                <Kpi label="Personal (any)" value={<Eur value={any.totals.personal} />} icon={UserCog} color="text-slate-600" />
                <Kpi label="Benefici (any)" value={<Eur value={any.totals.benefici} />} icon={Wallet} color={any.totals.benefici >= 0 ? 'text-green-600' : 'text-red-600'} big delta={variacio(any.totals.benefici, any.anterior.benefici)} />
                <Kpi label="Marge" value={`${marge(any.totals.benefici, any.totals.ingressos)}%`} icon={Percent} color="text-brand-700" />
                <Kpi label="Ocupació (any)" value={`${any.ocupacio}%`} icon={BedDouble} color="text-brand-700" />
                <Kpi label="ADR (preu mitjà/nit)" value={<Eur value={any.adr} />} icon={Moon} color="text-slate-600" />
                <Kpi label="RevPAR (any)" value={<Eur value={any.revpar} />} icon={Percent} color="text-slate-600" />
              </div>

              <BalancChart mesos={any.mesos} />

              <Table>
                <Thead>
                  <tr>
                    <Th>Mes</Th>
                    <Th className="text-right">Ingressos</Th>
                    <Th className="text-right">Retencions</Th>
                    <Th className="text-right">Ing.+ret.</Th>
                    <Th className="text-right">Despeses</Th>
                    <Th className="text-right">Personal</Th>
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
                      <Td className="text-right text-red-700"><Eur value={m.despeses} /></Td>
                      <Td className="text-right"><Eur value={m.personal} /></Td>
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
                    <Td className="text-right"><Eur value={any.totals.despeses} /></Td>
                    <Td className="text-right"><Eur value={any.totals.personal} /></Td>
                    <Td className="text-right"><Eur value={any.totals.benefici} /></Td>
                  </Tr>
                </tbody>
              </Table>

              <BreakdownsSection data={any} />
            </>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Ingressos = cobraments + dipòsits retinguts. Les retencions en custòdia no són ingrés. El
        benefici és ingressos − despeses − personal. Exporta-ho tot a CSV per a la gestoria.
      </p>
    </div>
  );
}
