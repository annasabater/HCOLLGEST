'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LogIn, LogOut, Sparkles, Check, Wrench, X, Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { CalendariHabitacio } from '@/components/habitacio/calendari-habitacio';
import { CalendariOcupacioTotal } from '@/components/habitacio/calendari-ocupacio-total';
import { getJSON, patchJSON } from '@/lib/api';
import { addDays, addMonths, monthGridDays, sameMonth, toISODate, weekDays } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { TIPUS_NETEJA_LABELS } from '@/lib/validation/enums';

interface Mov {
  id: string;
  data: string;
  titular: string;
  habitacio: string | null;
}
interface Tasca {
  id: string;
  data: string;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  estat: 'PENDENT' | 'FETA';
  habitacio: string | null;
  estanciaId?: string | null;
  assignada: string | null;
}

type TipusFiltre = 'entrades' | 'sortides' | 'neteja' | 'serveis';
interface ServeiEv {
  id: string;
  data: string;
  activitat: string;
  proveidor: string | null;
  import: number | null;
}
interface CalData {
  entrades: Mov[];
  sortides: Mov[];
  tasques: Tasca[];
  serveis: ServeiEv[];
}

const DOW = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
type Mode = 'mes' | 'setmana';

export default function CalendariPage() {
  const [mode, setMode] = useState<Mode>('mes');
  const [anchor, setAnchor] = useState(() => new Date());
  const [data, setData] = useState<CalData | null>(null);
  const [habitacions, setHabitacions] = useState<{ id: string; nom: string }[]>([]);
  const [treballadors, setTreballadors] = useState<{ id: string; nom: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null); // dia seleccionat (ISO)
  const [filtres, setFiltres] = useState<Set<TipusFiltre>>(new Set(['entrades', 'sortides', 'neteja', 'serveis']));
  const [filtreWorker, setFiltreWorker] = useState<string>(''); // '' = tots

  const days = mode === 'mes' ? monthGridDays(anchor) : weekDays(anchor);

  // Llista d'habitacions per a l'"Ocupació per habitació".
  useEffect(() => {
    getJSON<{ habitacions: { id: string; nom: string }[] }>('/api/habitacions')
      .then((r) => setHabitacions(r.habitacions))
      .catch(() => {});
    getJSON<{ treballadors: { id: string; nom: string }[] }>('/api/treballadors')
      .then((r) => setTreballadors(r.treballadors))
      .catch(() => {});
  }, []);

  function toggleFiltre(t: TipusFiltre) {
    setFiltres((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  const load = useCallback(async () => {
    const desde = toISODate(days[0]!);
    const fins = toISODate(days[days.length - 1]!);
    const res = await getJSON<CalData>(`/api/calendari?desde=${desde}&fins=${fins}`);
    setData(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, mode]);

  useEffect(() => {
    load();
  }, [load]);

  async function setEstatTasca(id: string, estat: 'PENDENT' | 'FETA') {
    // Si hi ha filtre de treballador actiu i marquem com a FETA, assignem la tasca
    const workerId = filtreWorker
      ? (treballadors.find((t) => t.nom === filtreWorker)?.id ?? null)
      : null;
    const patch: Record<string, unknown> = { estat };
    if (estat === 'FETA' && workerId) patch.assignadaA = workerId;
    if (estat === 'PENDENT') patch.assignadaA = null; // desassignar en revertir
    await patchJSON(`/api/tasques-neteja/${id}`, patch);
    load();
  }

  const sameDay = (iso: string, day: Date) => toISODate(new Date(iso)) === toISODate(day);
  const nav = (dir: number) =>
    setAnchor(mode === 'mes' ? addMonths(anchor, dir) : addDays(anchor, dir * 7));
  const monthLabel = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(anchor);
  const compact = mode === 'mes';
  const todayIso = toISODate(new Date());

  // Esdeveniments del dia seleccionat (per al panell de detall sota el calendari).
  const onSel = (iso: string) => selected != null && toISODate(new Date(iso)) === selected;
  const selEnt  = data && selected && filtres.has('entrades') ? data.entrades.filter((e) => onSel(e.data)) : [];
  const selSort = data && selected && filtres.has('sortides') ? data.sortides.filter((e) => onSel(e.data)) : [];
  const selTasq = data && selected && filtres.has('neteja')
    ? data.tasques.filter((t) => onSel(t.data) && (!filtreWorker || t.assignada === filtreWorker))
    : [];
  const selServ = data && selected && filtres.has('serveis') ? data.serveis.filter((s) => onSel(s.data)) : [];
  const selEmpty = !selEnt.length && !selSort.length && !selTasq.length && !selServ.length;
  const selLabel = selected
    ? new Intl.DateTimeFormat('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
        new Date(selected),
      )
    : '';

  return (
    <div>
      <PageHeader
        title="Calendari"
        subtitle="Entrades, sortides i neteja"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <button
                onClick={() => setMode('mes')}
                className={cn('px-3 py-1.5 text-sm', mode === 'mes' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}
              >
                Mes
              </button>
              <button
                onClick={() => setMode('setmana')}
                className={cn('px-3 py-1.5 text-sm', mode === 'setmana' ? 'bg-brand-700 text-white' : 'bg-white text-slate-600')}
              >
                Setmana
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Avui
            </Button>
            <Button variant="outline" size="sm" onClick={() => nav(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <p className="mb-3 text-sm font-medium capitalize text-slate-600">{monthLabel}</p>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([ ['entrades', 'Entrades', 'bg-green-100 text-green-800 border-green-300'],
            ['sortides', 'Sortides', 'bg-brand-100 text-brand-800 border-brand-300'],
            ['neteja',  'Neteja',   'bg-amber-100 text-amber-800 border-amber-300'],
            ['serveis', 'Serveis',  'bg-sky-100 text-sky-800 border-sky-300'],
        ] as [TipusFiltre, string, string][]).map(([key, label, color]) => (
          <button
            key={key}
            onClick={() => toggleFiltre(key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-opacity',
              filtres.has(key) ? color : 'border-slate-200 bg-white text-slate-400 opacity-50',
            )}
          >
            {label}
          </button>
        ))}
        {filtres.has('neteja') && treballadors.length > 0 && (
          <select
            value={filtreWorker}
            onChange={(e) => setFiltreWorker(e.target.value)}
            className="h-7 rounded-full border border-amber-300 bg-amber-50 px-3 text-xs text-amber-900"
          >
            <option value="">Tots el personal</option>
            {treballadors.map((t) => (
              <option key={t.id} value={t.nom}>{t.nom}</option>
            ))}
          </select>
        )}
      </div>

      {/* Avís: selecciona persona per registrar hores */}
      {filtres.has('neteja') && !filtreWorker && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <span>⚠</span>
          Selecciona un treballador al filtre per tal que les tasques marcades s&apos;assignin i es comptabilitzin al seu perfil de personal.
        </p>
      )}

      {/* Capçalera dies de la setmana */}
      <div className="mb-1 grid grid-cols-7 gap-2">
        {DOW.map((d) => (
          <div key={d} className="px-1 text-xs font-semibold uppercase text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const iso = toISODate(day);
          const isToday = iso === todayIso;
          const dim = mode === 'mes' && !sameMonth(day, anchor);
          const entrades = filtres.has('entrades') ? (data?.entrades.filter((e) => sameDay(e.data, day)) ?? []) : [];
          const sortides = filtres.has('sortides') ? (data?.sortides.filter((e) => sameDay(e.data, day)) ?? []) : [];
          const tasques = filtres.has('neteja')
            ? (data?.tasques.filter((t) => sameDay(t.data, day) && (!filtreWorker || t.assignada === filtreWorker)) ?? [])
            : [];
          const serveisDia = filtres.has('serveis') ? (data?.serveis.filter((s) => sameDay(s.data, day)) ?? []) : [];
          return (
            <div
              key={i}
              onClick={() => setSelected(iso)}
              className={cn(
                'cursor-pointer rounded-xl border bg-white p-1.5 transition hover:border-brand-300',
                compact ? 'min-h-24' : 'min-h-40 p-2',
                iso === selected
                  ? 'border-brand-500 ring-2 ring-brand-300'
                  : isToday
                    ? 'border-brand-400 ring-1 ring-brand-200'
                    : 'border-slate-200',
                dim && 'bg-slate-50',
              )}
            >
              <div className="mb-1 px-0.5 text-right">
                <span
                  className={cn(
                    'text-sm font-bold',
                    dim ? 'text-slate-300' : isToday ? 'text-brand-700' : 'text-slate-600',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {entrades.map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      'truncate rounded bg-green-50 px-1.5 py-0.5 text-green-800',
                      compact ? 'text-[10px]' : 'text-xs',
                    )}
                    title={`Entrada: ${e.titular}${e.habitacio ? ` · Hab. ${e.habitacio}` : ''}`}
                  >
                    <LogIn className="mr-0.5 inline h-3 w-3" />
                    {e.titular}
                    {e.habitacio ? ` H${e.habitacio}` : ''}
                  </div>
                ))}
                {sortides.map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      'truncate rounded bg-brand-50 px-1.5 py-0.5 text-brand-800',
                      compact ? 'text-[10px]' : 'text-xs',
                    )}
                    title={`Sortida: ${e.titular}${e.habitacio ? ` · Hab. ${e.habitacio}` : ''}`}
                  >
                    <LogOut className="mr-0.5 inline h-3 w-3" />
                    {e.titular}
                    {e.habitacio ? ` H${e.habitacio}` : ''}
                  </div>
                ))}
                {tasques.map((t) => (
                  <button
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEstatTasca(t.id, t.estat === 'FETA' ? 'PENDENT' : 'FETA');
                    }}
                    title={t.estat === 'FETA' ? 'Tornar a pendent' : 'Marcar com a feta'}
                    className={cn(
                      'flex w-full items-center gap-0.5 truncate rounded px-1.5 py-0.5 text-left',
                      compact ? 'text-[10px]' : 'text-xs',
                      t.estat === 'FETA'
                        ? 'bg-slate-100 text-slate-400 line-through'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100',
                    )}
                  >
                    {t.estat === 'FETA' ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                    {t.habitacio ? `H${t.habitacio} ` : ''}
                    {TIPUS_NETEJA_LABELS[t.tipus]}
                  </button>
                ))}
                {serveisDia.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-center gap-0.5 truncate rounded bg-sky-50 px-1.5 py-0.5 text-sky-800',
                      compact ? 'text-[10px]' : 'text-xs',
                    )}
                    title={`Servei: ${s.activitat}${s.proveidor ? ` · ${s.proveidor}` : ''}`}
                  >
                    <Wrench className="h-3 w-3 shrink-0" />
                    {s.activitat}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detall del dia seleccionat: entra a l'estada, la tasca o el servei */}
      {selected && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold capitalize text-slate-700">{selLabel}</h3>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Tancar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {selEmpty ? (
            <p className="text-sm text-slate-400">Cap moviment aquest dia.</p>
          ) : (
            <div className="space-y-1.5">
              {selEnt.map((e) => (
                <Link
                  key={`e${e.id}`}
                  href={`/estancies/${e.id}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-green-50/60 px-3 py-2 text-sm text-green-800 hover:bg-green-50"
                >
                  <LogIn className="h-4 w-4 shrink-0" /> Entrada · {e.titular}
                  {e.habitacio ? ` · Hab. ${e.habitacio}` : ''}
                </Link>
              ))}
              {selSort.map((e) => (
                <Link
                  key={`s${e.id}`}
                  href={`/estancies/${e.id}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-brand-50/60 px-3 py-2 text-sm text-brand-800 hover:bg-brand-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" /> Sortida · {e.titular}
                  {e.habitacio ? ` · Hab. ${e.habitacio}` : ''}
                </Link>
              ))}
              {selTasq.map((t) => (
                <div
                  key={`t${t.id}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-amber-50/60 px-3 py-2 text-sm text-amber-900"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <Link href={`/neteja?data=${selected}`} className="flex-1 hover:underline" title="Veure a Neteja">
                    Neteja{t.habitacio ? ` · Hab. ${t.habitacio}` : ''} · {TIPUS_NETEJA_LABELS[t.tipus]}
                    {t.assignada && <span className="ml-1 text-slate-400">· {t.assignada}</span>}
                    {t.estat === 'FETA' && <span className="ml-1 text-green-600">(feta)</span>}
                  </Link>
                  {t.estanciaId && (
                    <Link
                      href={`/estancies/${t.estanciaId}`}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      Veure estada
                    </Link>
                  )}
                  <button
                    onClick={() => setEstatTasca(t.id, t.estat === 'FETA' ? 'PENDENT' : 'FETA')}
                    className="inline-flex items-center gap-1 rounded border border-amber-300 px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-100"
                  >
                    {t.estat === 'FETA' ? (
                      <>
                        <Undo2 className="h-3 w-3" /> Pendent
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" /> Feta
                      </>
                    )}
                  </button>
                </div>
              ))}
              {selServ.map((s) => (
                <Link
                  key={`v${s.id}`}
                  href="/serveis"
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-sky-50/60 px-3 py-2 text-sm text-sky-800 hover:bg-sky-50"
                >
                  <Wrench className="h-4 w-4 shrink-0" /> {s.activitat}
                  {s.proveidor ? ` · ${s.proveidor}` : ''}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        <Sparkles className="mr-1 inline h-3 w-3" /> Clica un dia per veure’n entrades, sortides i
        neteja i entrar-hi. Les tasques de neteja es generen automàticament en registrar una estada.
      </p>

      {/* Ocupació de totes les habitacions simultàniament (6 colors) */}
      <div className="mt-8">
        <CalendariOcupacioTotal />
      </div>

      {/* Ocupació per habitació (vista habitació per habitació) */}
      {habitacions.length > 0 && (
        <div className="mt-8">
          <CalendariHabitacio habitacions={habitacions} />
        </div>
      )}
    </div>
  );
}
