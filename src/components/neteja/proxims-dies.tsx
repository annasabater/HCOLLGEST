'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getJSON } from '@/lib/api';
import { addDays, toISODate } from '@/lib/dates';
import { cn } from '@/lib/utils';

/** El mínim d'una tasca de neteja que necessita aquesta vista. */
export interface TascaDia {
  id: string;
  data: string;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  estat: 'PENDENT' | 'FETA';
  assignadaA: string | null;
  notes: string | null;
  habitacio: { nom: string } | null;
}

const MESOS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const DIES = ['dl', 'dt', 'dc', 'dj', 'dv', 'ds', 'dg'];
const nomHab = (t: TascaDia) => t.habitacio?.nom ?? '?';

function Xip({ t }: { t: TascaDia }) {
  return (
    <span
      title={[t.tipus === 'CANVI_COMPLET' ? 'Sortida (a fons)' : 'Repàs', t.estat === 'FETA' ? 'feta' : null, t.notes].filter(Boolean).join(' · ')}
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center px-1.5 text-xs font-bold',
        t.estat === 'FETA'
          ? 'bg-green-100 text-green-700'
          : t.tipus === 'CANVI_COMPLET'
            ? 'bg-brand-700 text-white'
            : 'border border-slate-300 text-slate-700',
      )}
    >
      {t.estat === 'FETA' ? '✓' : ''}
      {nomHab(t)}
    </span>
  );
}

const ordena = (ts: TascaDia[]) => [...ts].sort((a, b) => nomHab(a).localeCompare(nomHab(b), 'ca', { numeric: true }));

function perDia(ts: TascaDia[]) {
  const m = new Map<string, TascaDia[]>();
  for (const t of ts) {
    const iso = toISODate(new Date(t.data));
    m.set(iso, [...(m.get(iso) ?? []), t]);
  }
  return m;
}

/**
 * «Pròxims dies»: una tira fina amb els 7 dies següents i, amb «Veure tot el mes»,
 * el calendari del mes sencer (de dilluns a diumenge). Clicar un dia l'obre al full.
 */
export function ProximsDies({
  setmana,
  nomPersona,
  onObre,
}: {
  /** Tasques dels pròxims dies (ja carregades per la pàgina). */
  setmana: TascaDia[];
  nomPersona: (id: string | null) => string;
  /** Obre un dia al full de neteja (i la persona, si se'n coneix una). */
  onObre: (iso: string, personId: string | null) => void;
}) {
  const avui = toISODate(new Date());
  const [obert, setObert] = useState(false);
  const [mes, setMes] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }));
  const [tasquesMes, setTasquesMes] = useState<TascaDia[]>([]);

  // Calendari: de dilluns de la primera setmana a diumenge de l'última.
  const dies = useMemo(() => {
    const primer = new Date(mes.y, mes.m, 1, 12);
    const darrer = new Date(mes.y, mes.m + 1, 0, 12);
    const ini = addDays(primer, -((primer.getDay() + 6) % 7));
    const fi = addDays(darrer, 6 - ((darrer.getDay() + 6) % 7));
    const out: { iso: string; delMes: boolean }[] = [];
    for (let d = ini; d <= fi; d = addDays(d, 1)) out.push({ iso: toISODate(d), delMes: d.getMonth() === mes.m });
    return out;
  }, [mes]);

  const desde = dies[0]?.iso;
  const fins = dies[dies.length - 1]?.iso;
  useEffect(() => {
    if (!obert || !desde || !fins) return;
    let cancel = false;
    getJSON<{ tasques: TascaDia[] }>(`/api/tasques-neteja?desde=${desde}&fins=${fins}`)
      .then((r) => { if (!cancel) setTasquesMes(r.tasques); })
      .catch(() => { if (!cancel) setTasquesMes([]); });
    return () => { cancel = true; };
  }, [obert, desde, fins]);

  const dSetmana = useMemo(() => perDia(setmana), [setmana]);
  const dMes = useMemo(() => perDia(tasquesMes), [tasquesMes]);
  const primerId = (ts: TascaDia[]) => ts.find((t) => t.assignadaA)?.assignadaA ?? null;
  const mesActual = mes.y === new Date().getFullYear() && mes.m === new Date().getMonth();
  const canviaMes = (delta: number) => setMes((p) => { const d = new Date(p.y, p.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-2.5">
        {obert ? (
          <span className="flex items-center gap-1.5">
            <Button type="button" variant="outline" className="px-2.5" aria-label="Mes anterior" onClick={() => canviaMes(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <strong className="min-w-36 text-center font-serif text-base">{MESOS[mes.m]} {mes.y}</strong>
            <Button type="button" variant="outline" className="px-2.5" aria-label="Mes següent" onClick={() => canviaMes(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!mesActual && (
              <Button type="button" variant="outline" onClick={() => setMes({ y: new Date().getFullYear(), m: new Date().getMonth() })}>Avui</Button>
            )}
          </span>
        ) : (
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Pròxims dies</span>
        )}
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-brand-700" /> sortida</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 border border-slate-300" /> repàs</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-green-100" /> feta</span>
          <Button type="button" variant="outline" onClick={() => setObert((o) => !o)} aria-expanded={obert}>
            {obert ? <>Tancar el mes <ChevronUp className="h-4 w-4" /></> : <>Veure tot el {(MESOS[new Date().getMonth()] ?? '').toLowerCase()} <ChevronDown className="h-4 w-4" /></>}
          </Button>
        </span>
      </div>

      {!obert ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => toISODate(addDays(new Date(), i + 1))).map((iso, i) => {
              const ts = dSetmana.get(iso) ?? [];
              const buit = ts.length === 0;
              const dia = new Date(`${iso}T12:00:00`);
              const persones = new Map<string, TascaDia[]>();
              for (const t of ts) persones.set(t.assignadaA ?? '', [...(persones.get(t.assignadaA ?? '') ?? []), t]);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={buit}
                  onClick={() => onObre(iso, primerId(ts))}
                  title={buit ? undefined : `Obrir el ${iso.split('-').reverse().join('/')}`}
                  className={cn(
                    'flex min-h-16 flex-col gap-1.5 border-slate-100 px-3 py-2 text-left transition-colors [&:not(:last-child)]:border-r',
                    i === 0 && 'bg-brand-50/60',
                    buit ? 'cursor-default' : 'hover:bg-slate-50',
                  )}
                >
                  <span className="flex items-baseline gap-1.5">
                    <span className={cn('font-serif text-[15px] font-semibold', buit ? 'text-slate-300' : 'text-slate-900')}>
                      {DIES[(dia.getDay() + 6) % 7]} {dia.getDate()}
                    </span>
                    {i === 0 && <span className="text-[10px] font-bold tracking-wider text-brand-700">DEMÀ</span>}
                  </span>
                  {!buit && (
                    <span className="flex flex-wrap gap-1">
                      {[...persones.entries()].map(([k, grup]) => (
                        <span key={k || 'sense'} className="flex flex-wrap items-center gap-1">
                          {persones.size > 1 && (
                            <span className={cn('text-[10px] font-bold uppercase', k ? 'text-slate-500' : 'text-amber-700')}>{nomPersona(k || null)}</span>
                          )}
                          {ordena(grup).map((t) => <Xip key={t.id} t={t} />)}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {DIES.map((d) => <span key={d} className="px-3 py-2">{d}</span>)}
            </div>
            <div className="grid grid-cols-7">
              {dies.map(({ iso, delMes }) => {
                const ts = dMes.get(iso) ?? [];
                const esAvui = iso === avui;
                const passat = iso < avui;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => onObre(iso, primerId(ts))}
                    title={`Obrir el ${iso.split('-').reverse().join('/')}`}
                    className={cn(
                      'flex min-h-[4.5rem] flex-col gap-1.5 border-b border-r border-slate-100 px-2.5 py-2 text-left transition-colors hover:bg-slate-50',
                      !delMes && 'bg-slate-50/70',
                      esAvui && 'bg-brand-50 ring-2 ring-inset ring-brand-700',
                    )}
                  >
                    <span className={cn('font-serif text-sm font-semibold', !delMes ? 'text-slate-300' : esAvui ? 'text-brand-700' : passat ? 'text-slate-500' : 'text-slate-900')}>
                      {Number(iso.slice(8, 10))}
                    </span>
                    {delMes && ts.length > 0 && (
                      <span className="flex flex-wrap gap-1">{ordena(ts).map((t) => <Xip key={t.id} t={t} />)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {!obert && (
        <p className="border-t border-slate-100 px-5 py-1.5 text-xs text-slate-500">Passa el ratolí per sobre d&apos;una habitació per veure&apos;n la nota.</p>
      )}
    </Card>
  );
}
