'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LogIn, LogOut, Sparkles, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { getJSON, patchJSON } from '@/lib/api';
import { addDays, toISODate, weekDays } from '@/lib/dates';
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
  assignada: string | null;
}
interface CalData {
  entrades: Mov[];
  sortides: Mov[];
  tasques: Tasca[];
}

const DOW = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

export default function CalendariPage() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [data, setData] = useState<CalData | null>(null);
  const days = weekDays(anchor);

  const load = useCallback(async () => {
    const desde = toISODate(days[0]!);
    const fins = toISODate(days[6]!);
    const res = await getJSON<CalData>(`/api/calendari?desde=${desde}&fins=${fins}`);
    setData(res);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  useEffect(() => {
    load();
  }, [load]);

  async function marcarFeta(id: string) {
    await patchJSON(`/api/tasques-neteja/${id}`, { estat: 'FETA' });
    load();
  }

  const sameDay = (iso: string, day: Date) => toISODate(new Date(iso)) === toISODate(day);
  const monthLabel = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(
    days[0]!,
  );

  return (
    <div>
      <PageHeader
        title="Calendari"
        subtitle="Entrades, sortides i neteja per dia"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAnchor(addDays(anchor, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Avui
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(addDays(anchor, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <p className="mb-4 text-sm font-medium capitalize text-slate-600">{monthLabel}</p>

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day, i) => {
          const isToday = toISODate(day) === toISODate(new Date());
          const entrades = data?.entrades.filter((e) => sameDay(e.data, day)) ?? [];
          const sortides = data?.sortides.filter((e) => sameDay(e.data, day)) ?? [];
          const tasques = data?.tasques.filter((t) => sameDay(t.data, day)) ?? [];
          return (
            <div
              key={i}
              className={cn(
                'min-h-40 rounded-xl border bg-white p-2',
                isToday ? 'border-brand-400 ring-1 ring-brand-200' : 'border-slate-200',
              )}
            >
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="text-xs font-semibold uppercase text-slate-400">{DOW[i]}</span>
                <span className={cn('text-sm font-bold', isToday ? 'text-brand-700' : 'text-slate-700')}>
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {entrades.map((e) => (
                  <div key={e.id} className="rounded-md bg-green-50 px-2 py-1 text-xs text-green-800">
                    <LogIn className="mr-1 inline h-3 w-3" />
                    {e.titular}
                    {e.habitacio ? ` · H${e.habitacio}` : ''}
                  </div>
                ))}
                {sortides.map((e) => (
                  <div key={e.id} className="rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-800">
                    <LogOut className="mr-1 inline h-3 w-3" />
                    {e.titular}
                    {e.habitacio ? ` · H${e.habitacio}` : ''}
                  </div>
                ))}
                {tasques.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => t.estat === 'PENDENT' && marcarFeta(t.id)}
                    title={t.estat === 'PENDENT' ? 'Marcar com a feta' : 'Feta'}
                    className={cn(
                      'flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs',
                      t.estat === 'FETA'
                        ? 'bg-slate-100 text-slate-400 line-through'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100',
                    )}
                  >
                    {t.estat === 'FETA' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
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
        <Sparkles className="mr-1 inline h-3 w-3" /> Les tasques de neteja es generen
        automàticament en registrar una estada amb habitació (canvi complet el dia de sortida).
        Clica una tasca pendent per marcar-la com a feta.
      </p>
    </div>
  );
}
