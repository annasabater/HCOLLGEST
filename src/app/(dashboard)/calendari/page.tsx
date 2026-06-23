'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LogIn, LogOut, Sparkles, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { getJSON, patchJSON } from '@/lib/api';
import { addDays, addMonths, monthGridDays, sameMonth, toISODate, weekDays } from '@/lib/dates';
import { cn } from '@/lib/utils';

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
}
interface CalData {
  entrades: Mov[];
  sortides: Mov[];
  tasques: Tasca[];
}

const DOW = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
type Mode = 'mes' | 'setmana';

export default function CalendariPage() {
  const [mode, setMode] = useState<Mode>('mes');
  const [anchor, setAnchor] = useState(() => new Date());
  const [data, setData] = useState<CalData | null>(null);
  const [habitacions, setHabitacions] = useState<{ id: string; nom: string }[]>([]);
  const [habFiltre, setHabFiltre] = useState(''); // '' = totes; o el nom de l'habitació

  const days = mode === 'mes' ? monthGridDays(anchor) : weekDays(anchor);

  // Llista d'habitacions per al selector (general / habitació per habitació).
  useEffect(() => {
    getJSON<{ habitacions: { id: string; nom: string }[] }>('/api/habitacions')
      .then((r) => setHabitacions(r.habitacions))
      .catch(() => {});
  }, []);

  // Filtra els esdeveniments per l'habitació seleccionada (o tots si '').
  const matchHab = (h: string | null) => !habFiltre || h === habFiltre;

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

  async function marcarFeta(id: string) {
    await patchJSON(`/api/tasques-neteja/${id}`, { estat: 'FETA' });
    load();
  }

  const sameDay = (iso: string, day: Date) => toISODate(new Date(iso)) === toISODate(day);
  const nav = (dir: number) =>
    setAnchor(mode === 'mes' ? addMonths(anchor, dir) : addDays(anchor, dir * 7));
  const monthLabel = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(anchor);
  const compact = mode === 'mes';
  const todayIso = toISODate(new Date());

  return (
    <div>
      <PageHeader
        title="Calendari"
        subtitle={habFiltre ? `Habitació ${habFiltre}` : 'Entrades, sortides i neteja · totes les habitacions'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={habFiltre} onChange={(e) => setHabFiltre(e.target.value)} className="h-9 w-44">
              <option value="">Totes les habitacions</option>
              {habitacions.map((h) => (
                <option key={h.id} value={h.nom}>
                  Habitació {h.nom}
                </option>
              ))}
            </Select>
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
      <p className="mb-4 text-sm font-medium capitalize text-slate-600">{monthLabel}</p>

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
          const entrades = data?.entrades.filter((e) => sameDay(e.data, day) && matchHab(e.habitacio)) ?? [];
          const sortides = data?.sortides.filter((e) => sameDay(e.data, day) && matchHab(e.habitacio)) ?? [];
          const tasques = data?.tasques.filter((t) => sameDay(t.data, day) && matchHab(t.habitacio)) ?? [];
          return (
            <div
              key={i}
              className={cn(
                'rounded-xl border bg-white p-1.5',
                compact ? 'min-h-24' : 'min-h-40 p-2',
                isToday ? 'border-brand-400 ring-1 ring-brand-200' : 'border-slate-200',
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
                    onClick={() => t.estat === 'PENDENT' && marcarFeta(t.id)}
                    title={t.estat === 'PENDENT' ? 'Marcar com a feta' : 'Feta'}
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
                    {t.tipus === 'CANVI_COMPLET' ? 'Esbancar' : 'Polir'}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        <Sparkles className="mr-1 inline h-3 w-3" /> Les tasques de neteja es generen automàticament en
        registrar una estada amb habitació. Clica una tasca pendent per marcar-la com a feta.
      </p>
    </div>
  );
}
