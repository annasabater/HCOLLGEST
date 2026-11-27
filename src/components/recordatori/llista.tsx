'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { ApiError, delJSON, patchJSON } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { dataCurta, textDiesAbans, textHora, textRepeticio } from '@/lib/recordatoris';
import type { RecordatoriVista } from '@/lib/services/recordatoris';
import { LiniaEstada, RecordatoriTarja } from './tarja';
import { RecordatoriFormulari } from './formulari';

const MESOS_LLARGS = ['GENER', 'FEBRER', 'MARÇ', 'ABRIL', 'MAIG', 'JUNY', 'JULIOL', 'AGOST', 'SETEMBRE', 'OCTUBRE', 'NOVEMBRE', 'DESEMBRE'];
const DIES_SETMANA = ['DG', 'DL', 'DT', 'DC', 'DJ', 'DV', 'DS'];
const diaSetmana = (dia: string) => DIES_SETMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()];

export function RecordatorisLlista({
  avui,
  pendents,
  fets,
  canWrite,
  mobilActiu,
  calendariConnectat,
}: {
  avui: string;
  pendents: RecordatoriVista[];
  fets: RecordatoriVista[];
  canWrite: boolean;
  mobilActiu: boolean;
  calendariConnectat: boolean;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<'pendents' | 'fixes' | 'fets'>('pendents');
  const fixes = pendents.filter((r) => r.fix);
  const [form, setForm] = useState<{ obert: boolean; r: RecordatoriVista | null }>({ obert: false, r: null });
  const [esborra, setEsborra] = useState<RecordatoriVista | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cerca, setCerca] = useState('');

  const q = cerca.trim().toLowerCase();
  const coincideix = (r: RecordatoriVista) =>
    !q ||
    `${r.titol} ${r.notes ?? ''} ${r.estada ? `hab ${r.estada.habitacio ?? ''} ${r.estada.noms.join(' ')}` : ''}`
      .toLowerCase()
      .includes(q);
  const ara = pendents.filter((r) => r.tocaAra);
  const properament = pendents.filter((r) => !r.tocaAra);
  // Agrupats per mes (amb l'any només si no és el d'aquest any).
  const perMes = new Map<string, RecordatoriVista[]>();
  for (const r of properament.filter(coincideix)) {
    const m = r.data.slice(0, 7);
    perMes.set(m, [...(perMes.get(m) ?? []), r]);
  }
  const titolMes = (m: string) => {
    const nom = MESOS_LLARGS[Number(m.slice(5, 7)) - 1];
    return m.slice(0, 4) === avui.slice(0, 4) ? nom : `${nom} ${m.slice(0, 4)}`;
  };

  async function desfes(id: string) {
    setErr(null);
    try {
      await patchJSON(`/api/recordatoris/${id}`, { accio: 'DESFES' });
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut desfer');
    }
  }
  async function elimina() {
    if (!esborra) return;
    setErr(null);
    try {
      await delJSON(`/api/recordatoris/${esborra.id}`);
      setEsborra(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut esborrar');
    }
  }

  const Fila = ({ r, fet }: { r: RecordatoriVista; fet?: boolean }) => {
    const vencut = !fet && r.data < avui;
    return (
      // Totes les files amb la mateixa vora esquerra (blava només als fixos): així el
      // text queda alineat tant si és fix com si no. Mides com la resta de llistes.
      <div className={cn('flex flex-wrap items-center gap-4 border-t border-l-4 border-t-slate-100 py-3 pl-3', r.fix ? 'border-l-blue-600' : 'border-l-transparent')}>
        <div className={cn('w-11 shrink-0 text-center leading-none', vencut ? 'text-red-700' : r.fix ? 'text-blue-700' : 'text-brand-700')}>
          <div className="ui-page-title font-serif text-xl font-semibold tabular-nums">{Number(r.data.slice(8, 10))}</div>
          <div className="mt-1 text-[10px] font-bold tracking-[0.12em] text-slate-500">{diaSetmana(r.data)}</div>
        </div>
        <div className="min-w-0 flex-[1_1_14rem]">
          <p className={cn('text-[15px] font-bold text-slate-900', fet && 'text-slate-500 line-through decoration-slate-300')}>
            {r.titol}
            {r.fix && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 align-middle text-[11px] font-bold text-blue-800">FIX</span>}
            {!r.whatsapp && !(r.calendari && calendariConnectat) && (
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 align-middle text-[11px] font-bold text-slate-600" title="No t'arriba al mòbil ni al Calendar">NOMÉS TAULER</span>
            )}
          </p>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {fet && r.fetAt ? `Fet el ${dataCurta(r.fetAt.slice(0, 10))}` : `Avisa ${textDiesAbans(r.diesAbans)}${r.hora ? ` ${textHora(r.hora)}` : ''}`} ·{textRepeticio(r.repeticioCada, r.repeticioUnitat).toLowerCase()}
            {r.notes ? ` · ${r.notes}` : ''}
          </p>
          {r.estada && (
            <div className="mt-1">
              <LiniaEstada r={r} avui={avui} />
            </div>
          )}
        </div>
        {canWrite && (
          <div className="flex gap-1">
            {fet ? (
              <button type="button" onClick={() => desfes(r.id)} className="inline-flex h-10 items-center gap-1 border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" /> Desfer
              </button>
            ) : (
              <button type="button" onClick={() => setForm({ obert: true, r })} aria-label={`Editar ${r.titol}`} className="grid h-10 w-10 place-items-center border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => setEsborra(r)} aria-label={`Esborrar ${r.titol}`} className="grid h-10 w-10 place-items-center border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recordatoris"
        subtitle={
          <>
            <strong className="text-slate-900">{ara.length}</strong> toquen ara · <strong className="text-slate-900">{properament.length}</strong> programats ·{' '}
            <span className={mobilActiu ? 'text-emerald-700' : 'text-slate-500'}>
              {mobilActiu ? `avisos al mòbil${calendariConnectat ? ' i Google Calendar' : ''} actius ✓` : 'avisos al mòbil per activar (a Configuració)'}
            </span>
          </>
        }
        actions={
          canWrite ? (
            <Button onClick={() => setForm({ obert: true, r: null })}>
              <Plus className="h-4 w-4" /> Nou recordatori
            </Button>
          ) : null
        }
      />

      {err && <p className="text-sm text-red-600">{err}</p>}

      {ara.length > 0 && (
        <section aria-label="Ara toca" className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-slate-900">Ara toca</h2>
          {ara.map((r) => (
            <RecordatoriTarja key={r.id} r={r} avui={avui} canWrite={canWrite} avisos={{ mobilActiu, calendariConnectat }} />
          ))}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5">
          <div role="tablist" aria-label="Quins recordatoris" className="flex">
            {(['pendents', 'fixes', 'fets'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                onClick={() => setVista(v)}
                className={cn(
                  '-mb-px border-b-2 px-4 py-3.5 text-sm font-bold transition-colors',
                  vista === v ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900',
                )}
              >
                {v === 'pendents' ? 'Pendents' : v === 'fixes' ? 'Fixes' : 'Fets'}
                {v !== 'fets' && <span className="ml-1.5 font-medium text-slate-400">{v === 'pendents' ? properament.length : fixes.length}</span>}
              </button>
            ))}
          </div>
          <label className="flex h-9 w-56 items-center gap-2 border border-slate-200 px-3 text-sm text-slate-500">
            <Search className="h-4 w-4 shrink-0" />
            <input
              aria-label="Cerca un recordatori"
              placeholder="Cerca…"
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none"
            />
          </label>
        </div>
        <div className="px-5">
        {vista === 'pendents' ? (
          properament.length === 0 ? (
            <p className="border-t border-slate-100 py-6 text-sm text-slate-500">
              {pendents.length === 0 ? 'Encara no hi ha cap recordatori. Crea’n un amb «Nou recordatori».' : 'Tots els pendents ja toquen ara (a dalt).'}
            </p>
          ) : perMes.size === 0 ? (
            <p className="py-6 text-sm text-slate-500">Cap recordatori coincideix amb la cerca.</p>
          ) : (
            [...perMes.entries()].map(([mes, llista]) => (
              <div key={mes}>
                <p className="pb-1 pt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{titolMes(mes)}</p>
                {llista.map((r) => <Fila key={r.id} r={r} />)}
              </div>
            ))
          )
        ) : vista === 'fixes' ? (
          fixes.length === 0 ? (
            <p className="border-t border-slate-100 py-6 text-sm text-slate-500">
              Encara no n’hi ha cap. En un recordatori que es repeteix, marca «És un fix».
            </p>
          ) : (
            fixes.filter(coincideix).map((r) => <Fila key={r.id} r={r} />)
          )
        ) : fets.length === 0 ? (
          <p className="border-t border-slate-100 py-6 text-sm text-slate-500">Encara no n’has marcat cap com a fet.</p>
        ) : (
          fets.filter(coincideix).map((r) => <Fila key={r.id} r={r} fet />)
        )}
        <p className="border-t border-slate-100 py-4 text-xs text-slate-500">
          Els que es repeteixen es programen sols: passat el dia, surt el següent (no cal marcar «Fet»).
        </p>
        </div>
      </section>

      {form.obert && (
        <RecordatoriFormulari
          inicial={form.r}
          mobilActiu={mobilActiu}
          calendariConnectat={calendariConnectat}
          onTanca={() => setForm({ obert: false, r: null })}
          onDesat={() => {
            setForm({ obert: false, r: null });
            router.refresh();
          }}
        />
      )}
      <ConfirmDialog
        open={!!esborra}
        title="Esborrar el recordatori"
        message={esborra ? `S’esborrarà «${esborra.titol}» i no t’avisarà més.` : ''}
        confirmLabel="Esborrar"
        onConfirm={elimina}
        onCancel={() => setEsborra(null)}
      />
    </div>
  );
}
