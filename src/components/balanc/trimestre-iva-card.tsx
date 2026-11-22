'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getJSON } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Eur } from '@/components/finances/amounts-visibility';

interface Desat { periode: string; etiqueta: string; totalTotal: number; updatedAt: string }

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

/**
 * Llibre d'IVA (ingressos) en una sola fila: l'any i els 4 trimestres com a
 * pestanyes (✓ i total si ja està desat) i el botó per obrir el llibre imprimible
 * i EDITABLE del trimestre triat. De moment només ingressos.
 */
export function TrimestreIvaCard() {
  const avui = new Date();
  const anyActual = avui.getFullYear();
  const trimActual = Math.floor(avui.getMonth() / 3) + 1;
  const [any, setAny] = useState(anyActual);
  const [trim, setTrim] = useState(trimActual);
  const [desats, setDesats] = useState<Desat[]>([]);

  useEffect(() => {
    getJSON<{ desats: Desat[] }>('/api/llibre-iva').then((r) => setDesats(r.desats)).catch(() => {});
  }, []);

  const desat = (t: number) => desats.find((d) => d.periode === `${any}-${t}`);
  const esFutur = (t: number) => any > anyActual || (any === anyActual && t > trimActual);
  const enCurs = (t: number) => any === anyActual && t === trimActual;

  // Dates del trimestre triat (fins avui si és l'actual).
  const inici = new Date(any, (trim - 1) * 3, 1);
  const fi = enCurs(trim) ? avui : new Date(any, trim * 3, 0);

  function canviaAny(nou: number) {
    setAny(nou);
    setTrim(nou === anyActual ? trimActual : 4);
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
      <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-700">
        Llibre d&apos;IVA
        <button
          type="button"
          aria-label="Any anterior"
          onClick={() => canviaAny(any - 1)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="tabular-nums">{any}</span>
        <button
          type="button"
          aria-label="Any següent"
          disabled={any >= anyActual}
          onClick={() => canviaAny(any + 1)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </span>

      <div role="group" aria-label="Trimestre" className="inline-flex overflow-hidden rounded-lg border border-slate-200">
        {[1, 2, 3, 4].map((t) => {
          const d = desat(t);
          const actiu = t === trim;
          const futur = esFutur(t);
          return (
            <button
              key={t}
              type="button"
              disabled={futur}
              aria-pressed={actiu}
              onClick={() => setTrim(t)}
              title={d ? `Desat el ${new Date(d.updatedAt).toLocaleDateString('ca-ES')}` : undefined}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 transition-colors [&:not(:first-child)]:border-l [&:not(:first-child)]:border-slate-200',
                actiu ? 'bg-brand-700 font-semibold text-white' : 'bg-white text-slate-700 hover:bg-brand-50',
                futur && 'cursor-default text-slate-300 hover:bg-white',
              )}
            >
              {t}T
              {d && <span className={actiu ? 'text-white' : 'text-green-700'}>✓</span>}
              {d ? (
                <Eur value={d.totalTotal} className={cn('text-xs', actiu ? 'text-white/85' : 'text-slate-400')} />
              ) : enCurs(t) ? (
                <span className={cn('text-xs', actiu ? 'text-white/85' : 'text-slate-400')}>en curs</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <span className="text-xs text-slate-500">{fmt(inici)} – {fmt(fi)}</span>

      <a href={`/imprimir/trimestre-ingressos/${any}-${trim}`} target="_blank" rel="noreferrer" className="ml-auto">
        <Button size="sm" variant="outline" className="border-brand-700 text-brand-700 hover:bg-brand-50">
          <FileText className="h-4 w-4" /> Obrir / editar / imprimir
        </Button>
      </a>
    </div>
  );
}
