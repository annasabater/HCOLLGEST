'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { getJSON } from '@/lib/api';
import { addMonths, monthGridDays, sameMonth, toISODate } from '@/lib/dates';
import { cn } from '@/lib/utils';

type Estat = 'RESERVA' | 'EN_CURS' | 'FINALITZADA' | 'CANCELLADA';

interface Estada {
  id: string;
  titular: string;
  viatgers: string[];
  dataEntrada: string;
  dataSortida: string;
  sortidaProbable: string | null;
  estat: Estat;
}

const DOW = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

// Colors de cada cel·la segons l'estat de l'estada que ocupa la nit.
const ESTAT_CELL: Record<Estat, string> = {
  RESERVA: 'bg-amber-100 text-amber-900 hover:bg-amber-200',
  EN_CURS: 'bg-brand-500 text-white hover:bg-brand-600',
  FINALITZADA: 'bg-slate-100 text-slate-500 hover:bg-slate-200',
  CANCELLADA: '',
};
const ESTAT_LABEL: Record<Estat, string> = {
  RESERVA: 'Reservada',
  EN_CURS: 'Ocupada',
  FINALITZADA: 'Finalitzada',
  CANCELLADA: 'Cancel·lada',
};

export function CalendariHabitacio({ habitacions }: { habitacions: { id: string; nom: string }[] }) {
  const [habitacioId, setHabitacioId] = useState(habitacions[0]?.id ?? '');
  const [anchor, setAnchor] = useState(() => new Date());
  const [estades, setEstades] = useState<Estada[]>([]);

  const days = monthGridDays(anchor);

  const load = useCallback(async () => {
    if (!habitacioId) {
      setEstades([]);
      return;
    }
    const desde = toISODate(days[0]!);
    const fins = toISODate(days[days.length - 1]!);
    const res = await getJSON<{ estades: Estada[] }>(
      `/api/habitacions/ocupacio?habitacioId=${habitacioId}&desde=${desde}&fins=${fins}`,
    );
    setEstades(res.estades);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitacioId, anchor]);

  useEffect(() => {
    load();
  }, [load]);

  // L'estada ocupa la NIT del dia D si dataEntrada <= D < dataSortida (la sortida allibera).
  // Poden coincidir-hi diverses estades (2 contractes que paguen per separat a la
  // mateixa habitació): es retornen totes perquè es vegin tots els hostes.
  const estadesDelDia = (day: Date): Estada[] => {
    const iso = toISODate(day);
    return estades.filter((e) => toISODate(new Date(e.dataEntrada)) <= iso && iso < toISODate(new Date(e.dataSortida)));
  };

  const monthLabel = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(anchor);
  const todayIso = toISODate(new Date());

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand-600" />
          <span className="font-serif text-lg font-semibold text-slate-900">Ocupació per habitació</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(addMonths(anchor, -1))} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold capitalize text-slate-700">{monthLabel}</span>
          <Button variant="outline" size="sm" onClick={() => setAnchor(addMonths(anchor, 1))} aria-label="Mes següent">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Avui
          </Button>
          <Select
            className="ml-2 min-w-40"
            value={habitacioId}
            onChange={(e) => setHabitacioId(e.target.value)}
          >
            {habitacions.map((h) => (
              <option key={h.id} value={h.id}>
                Habitació {h.nom}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Llegenda */}
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand-500" /> Ocupada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-200" /> Reservada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-slate-200" /> Finalitzada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-brand-300" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(122,31,43,.16) 0 5px, transparent 5px 10px)' }} /> Probablement lliure
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-slate-200 bg-white" /> Lliure
        </span>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1.5">
        {DOW.map((d) => (
          <div key={d} className="px-1 text-xs font-semibold uppercase text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const iso = toISODate(day);
          const isToday = iso === todayIso;
          const dim = !sameMonth(day, anchor);
          const dayEst0 = estadesDelDia(day);
          const esProbable = (st: Estada) => !!st.sortidaProbable && iso >= st.sortidaProbable;
          // Primer les que hi són segur; les «probablement lliures» al final.
          const dayEst = [...dayEst0.filter((st) => !esProbable(st)), ...dayEst0.filter(esProbable)];
          const e = dayEst[0];
          const nomesProbable = !!e && dayEst.every(esProbable);
          const cell = e ? ESTAT_CELL[e.estat] : '';
          // Tots els hostes del dia (de tots els contractes que hi coincideixen).
          const noms = dayEst.flatMap((st) => (st.viatgers.length > 0 ? st.viatgers : [st.titular]));
          const content = (
            <>
              <div className="text-right">
                <span
                  className={cn(
                    'text-xs font-bold',
                    dim ? 'text-slate-300' : isToday ? 'text-brand-700' : 'text-slate-500',
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              {noms.map((nom, idx) => (
                <span key={idx} className="mt-0.5 block truncate text-[10px] font-medium leading-tight">
                  {nom}
                </span>
              ))}
            </>
          );
          const base = cn(
            'flex min-h-16 flex-col rounded-lg border p-1.5',
            isToday ? 'border-brand-400 ring-1 ring-brand-200' : 'border-slate-200',
            dim && !e ? 'bg-slate-50' : nomesProbable ? 'border-dashed border-brand-300 bg-white text-brand-800' : e ? cell : 'bg-white',
          );
          return e ? (
            <Link
              key={i}
              href={`/estancies/${e.id}`}
              className={base}
              style={nomesProbable ? { backgroundImage: 'repeating-linear-gradient(135deg, rgba(122,31,43,.16) 0 5px, transparent 5px 10px)' } : undefined}
              title={`${nomesProbable ? 'Probablement lliure (marxarà abans)' : ESTAT_LABEL[e.estat]}: ${dayEst.map((st) => st.titular).join(' · ')}`}
            >
              {content}
            </Link>
          ) : (
            <div key={i} className={base}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
