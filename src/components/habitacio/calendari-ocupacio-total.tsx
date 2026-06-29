'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getJSON } from '@/lib/api';
import { addMonths, monthGridDays, sameMonth, toISODate } from '@/lib/dates';
import { cn } from '@/lib/utils';

// Colors per a les primeres 6 habitacions (en ordre per nom).
const ROOM_COLORS = [
  { bg: 'bg-slate-800',  light: 'bg-slate-200',  text: 'text-slate-900',  label: 'Negre' },
  { bg: 'bg-blue-500',   light: 'bg-blue-100',   text: 'text-blue-900',   label: 'Blava' },
  { bg: 'bg-slate-400',  light: 'bg-slate-100',  text: 'text-slate-700',  label: 'Grisa' },
  { bg: 'bg-red-500',    light: 'bg-red-100',    text: 'text-red-900',    label: 'Vermell' },
  { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-900', label: 'Lila' },
  { bg: 'bg-orange-400', light: 'bg-orange-100', text: 'text-orange-900', label: 'Taronja' },
];

interface Habitacio {
  id: string;
  nom: string;
}
interface Estada {
  id: string;
  habitacioId: string;
  titular: string;
  dataEntrada: string;
  dataSortida: string;
  estat: string;
}

const DOW = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

export function CalendariOcupacioTotal() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [habitacions, setHabitacions] = useState<Habitacio[]>([]);
  const [estades, setEstades] = useState<Estada[]>([]);

  const days = monthGridDays(anchor);

  const load = useCallback(async () => {
    const desde = toISODate(days[0]!);
    const fins = toISODate(days[days.length - 1]!);
    const res = await getJSON<{ habitacions: Habitacio[]; estades: Estada[] }>(
      `/api/habitacions/ocupacio-total?desde=${desde}&fins=${fins}`,
    );
    setHabitacions(res.habitacions);
    setEstades(res.estades);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  useEffect(() => {
    load();
  }, [load]);

  const colorFor = (habitacioId: string) => {
    const idx = habitacions.findIndex((h) => h.id === habitacioId);
    return ROOM_COLORS[idx] ?? ROOM_COLORS[5]!;
  };

  // Estades que ocupen la NIT del dia D en una habitació (entrada ≤ D < sortida).
  const estadesDelDia = (day: Date): Estada[] => {
    const iso = toISODate(day);
    return estades.filter((e) => e.dataEntrada <= iso && iso < e.dataSortida);
  };

  // Canvi: hi ha una sortida I una entrada el mateix dia en la mateixa habitació.
  const teCanvi = (day: Date, habitacioId: string): boolean => {
    const iso = toISODate(day);
    const surt = estades.some((e) => e.habitacioId === habitacioId && e.dataSortida === iso);
    const entra = estades.some((e) => e.habitacioId === habitacioId && e.dataEntrada === iso);
    return surt && entra;
  };

  const monthLabel = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(anchor);
  const todayIso = toISODate(new Date());

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      {/* Capçalera */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-brand-600" />
          <span className="font-serif text-lg font-semibold text-slate-900">
            Ocupació de totes les habitacions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(addMonths(anchor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Avui
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(addMonths(anchor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="mb-3 text-sm font-medium capitalize text-slate-600">{monthLabel}</p>

      {/* Llegenda */}
      <div className="mb-4 flex flex-wrap gap-2">
        {habitacions.slice(0, 6).map((h, i) => {
          const c = ROOM_COLORS[i]!;
          return (
            <span key={h.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className={cn('inline-block h-3 w-3 rounded-sm', c.bg)} />
              Hab. {h.nom}
            </span>
          );
        })}
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-slate-300" />
          Canvi d&apos;hostes
        </span>
      </div>

      {/* Capçalera dies de la setmana */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="px-1 text-center text-xs font-semibold uppercase text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Graella del mes */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const iso = toISODate(day);
          const isToday = iso === todayIso;
          const dim = !sameMonth(day, anchor);
          const ocupades = estadesDelDia(day);

          return (
            <div
              key={i}
              className={cn(
                'flex min-h-16 flex-col rounded-lg border p-1 sm:min-h-20',
                isToday ? 'border-brand-400 ring-1 ring-brand-200' : 'border-slate-200',
                dim ? 'bg-slate-50' : 'bg-white',
              )}
            >
              <div className="mb-1 text-right">
                <span
                  className={cn(
                    'text-xs font-bold',
                    dim ? 'text-slate-300' : isToday ? 'text-brand-700' : 'text-slate-500',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Pilules de les habitacions ocupades */}
              <div className="flex flex-col gap-0.5">
                {ocupades.map((e) => {
                  const c = colorFor(e.habitacioId);
                  const canvi = teCanvi(day, e.habitacioId);
                  const hab = habitacions.find((h) => h.id === e.habitacioId);
                  return (
                    <Link
                      key={e.id}
                      href={`/estancies/${e.id}`}
                      title={`Hab. ${hab?.nom ?? ''} · ${e.titular}${canvi ? ' · CANVI D\'HOSTES' : ''}`}
                      className={cn(
                        'block truncate rounded px-1 text-[10px] font-medium leading-tight',
                        c.light,
                        c.text,
                        canvi && 'border border-dashed border-current',
                      )}
                    >
                      {canvi && '⇄ '}
                      {hab?.nom ?? '?'}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
