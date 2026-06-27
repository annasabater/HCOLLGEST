'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, ChevronDown, ChevronRight, Circle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/table';
import { formatDate, formatEur } from '@/lib/utils';
import { patchJSON } from '@/lib/api';

interface TascaRow {
  id: string;
  data: string;
  habitacio: string | null;
  tipus: string;
  estat: string;
  importCalculat: number;
}

function mesLabel(ym: string) {
  return new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(
    new Date(`${ym}-01T00:00:00`),
  );
}

function tipusLabel(tipus: string) {
  return tipus === 'CANVI_COMPLET' ? 'Sortida' : 'Manteniment';
}

export function TasquesNetejaSection({ tasques: initialTasques }: { tasques: TascaRow[] }) {
  const router = useRouter();
  const [tasques, setTasques] = useState<TascaRow[]>(initialTasques);
  const [toggling, setToggling] = useState<string | null>(null);
  const [mesSel, setMesSel] = useState<string>('');
  const [open, setOpen] = useState(true);
  const [diesOberts, setDiesOberts] = useState<Set<string>>(new Set());

  async function toggleEstat(t: TascaRow) {
    if (toggling) return;
    const nouEstat = t.estat === 'FETA' ? 'PENDENT' : 'FETA';
    setToggling(t.id);
    // Optimistic update
    setTasques((prev) => prev.map((r) => r.id === t.id ? { ...r, estat: nouEstat } : r));
    try {
      await patchJSON(`/api/tasques-neteja/${t.id}`, { estat: nouEstat });
      router.refresh();
    } catch {
      // Revert on error
      setTasques((prev) => prev.map((r) => r.id === t.id ? { ...r, estat: t.estat } : r));
    } finally {
      setToggling(null);
    }
  }

  const mesos = Array.from(new Set(tasques.map((t) => t.data.slice(0, 7)))).sort().reverse();
  const mesDef = mesos[0] ?? '';
  const mesActiu = mesSel || mesDef;

  const filtrades = mesActiu ? tasques.filter((t) => t.data.startsWith(mesActiu)) : tasques;
  const fetes = filtrades.filter((t) => t.estat === 'FETA');
  const totalFetes = fetes.reduce((a, t) => a + t.importCalculat, 0);
  const totalMes = filtrades.reduce((a, t) => a + t.importCalculat, 0);

  // Agrupem per dia
  const diesUnics = Array.from(new Set(filtrades.map((t) => t.data.slice(0, 10)))).sort().reverse();

  function toggleDia(d: string) {
    setDiesOberts((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  }

  // Per defecte el dia és obert si NO és a diesOberts (invertit: obert per defecte)
  function isDiaObert(d: string) { return !diesOberts.has(d); }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Home className="h-4 w-4 text-brand-600" />
        <span className="flex-1 text-sm font-semibold text-slate-800">Tasques de neteja</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {/* Selector de mes + resum */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-slate-600">Mes:</span>
              <select
                value={mesActiu}
                onChange={(e) => setMesSel(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm capitalize"
              >
                {mesos.map((m) => (
                  <option key={m} value={m}>{mesLabel(m)}</option>
                ))}
              </select>
            </label>
            <span>
              Realitzades: <strong>{fetes.length}</strong> tasques ·{' '}
              <strong className="text-brand-700">{formatEur(totalFetes)}</strong>
            </span>
            {totalMes !== totalFetes && (
              <span className="text-slate-500">(total incl. pendents: {formatEur(totalMes)})</span>
            )}
          </div>

          {filtrades.length === 0 ? (
            <EmptyState>Cap tasca en aquest mes.</EmptyState>
          ) : (
            <div className="space-y-1.5">
              {diesUnics.map((dia) => {
                const tasqDia = filtrades.filter((t) => t.data.slice(0, 10) === dia);
                const fetsDia = tasqDia.filter((t) => t.estat === 'FETA');
                const totalDia = tasqDia.reduce((a, t) => a + t.importCalculat, 0);
                const totalFetesDia = fetsDia.reduce((a, t) => a + t.importCalculat, 0);
                const totFet = fetsDia.length === tasqDia.length;
                const parcial = fetsDia.length > 0 && !totFet;
                const obert = isDiaObert(dia);

                return (
                  <div key={dia} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {/* Capçalera del dia — clicar per plegar/desplegar */}
                    <button
                      type="button"
                      onClick={() => toggleDia(dia)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${obert ? 'rotate-90' : ''}`} />
                      <span className="min-w-28 text-sm font-semibold text-slate-800">{formatDate(dia)}</span>
                      <span className="text-xs text-slate-500">
                        {tasqDia.length} tasca{tasqDia.length !== 1 ? 'es' : ''}
                      </span>
                      <div className="ml-auto flex items-center gap-3">
                        {totFet
                          ? <Badge tone="success">Tot fet</Badge>
                          : parcial
                            ? <Badge tone="warning">{fetsDia.length}/{tasqDia.length} fetes</Badge>
                            : <Badge tone="neutral">Pendent</Badge>}
                        <span className="text-sm font-semibold text-slate-700">
                          {formatEur(totFet ? totalFetesDia : totalDia)}
                        </span>
                      </div>
                    </button>

                    {/* Detall de les tasques d'aquest dia */}
                    {obert && (
                      <div className="border-t border-slate-100">
                        {tasqDia.map((t, i) => (
                          <div
                            key={t.id}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i > 0 ? 'border-t border-slate-50' : ''} ${t.estat === 'FETA' ? 'bg-white' : 'bg-slate-50/60'}`}
                          >
                            {/* Línia vertical de connexió (arbre) */}
                            <div className="ml-1 mr-2 flex flex-col items-center self-stretch">
                              <div className="w-px flex-1 bg-slate-200" />
                              <div className="h-2 w-2 shrink-0 rounded-full border-2 border-slate-300 bg-white" />
                              {i < tasqDia.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                            </div>

                            <span className={`min-w-24 text-xs font-medium ${t.habitacio ? (t.tipus === 'CANVI_COMPLET' ? 'text-brand-700' : 'text-slate-600') : 'text-slate-500'}`}>
                              {t.habitacio ? tipusLabel(t.tipus) : 'Zones comunes'}
                            </span>
                            <span className="flex-1 text-slate-700">
                              {t.habitacio ? `Hab. ${t.habitacio}` : ''}
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                disabled={toggling === t.id}
                                onClick={() => toggleEstat(t)}
                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                  t.estat === 'FETA'
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600'
                                    : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                                } disabled:opacity-50`}
                                title={t.estat === 'FETA' ? 'Marcar com a pendent' : 'Marcar com a feta'}
                              >
                                {t.estat === 'FETA'
                                  ? <CheckCircle2 className="h-3.5 w-3.5" />
                                  : <Circle className="h-3.5 w-3.5" />}
                                {t.estat === 'FETA' ? 'Feta' : 'Pendent'}
                              </button>
                              <span className={`w-16 text-right text-sm font-medium ${t.estat === 'FETA' ? 'text-slate-800' : 'text-slate-400'}`}>
                                {t.importCalculat > 0 ? formatEur(t.importCalculat) : '—'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {/* Total del dia */}
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                          <span>Total dia:</span>
                          <span className="font-semibold text-slate-700">{formatEur(totalFetesDia)}</span>
                          {totalFetesDia !== totalDia && (
                            <span className="text-slate-400">(incl. pendents: {formatEur(totalDia)})</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
