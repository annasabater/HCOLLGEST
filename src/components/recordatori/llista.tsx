'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarDays, MessageCircle, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { ApiError, delJSON, patchJSON } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { dataCurta, textDiesAbans, textRepeticio } from '@/lib/recordatoris';
import type { RecordatoriVista } from '@/lib/services/recordatoris';
import { DataTile, RecordatoriTarja } from './tarja';
import { RecordatoriFormulari } from './formulari';

export function RecordatorisLlista({
  avui,
  pendents,
  fets,
  canWrite,
  whatsappActiu,
}: {
  avui: string;
  pendents: RecordatoriVista[];
  fets: RecordatoriVista[];
  canWrite: boolean;
  whatsappActiu: boolean;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<'pendents' | 'fets'>('pendents');
  const [form, setForm] = useState<{ obert: boolean; r: RecordatoriVista | null }>({ obert: false, r: null });
  const [esborra, setEsborra] = useState<RecordatoriVista | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const ara = pendents.filter((r) => r.tocaAra);
  const properament = pendents.filter((r) => !r.tocaAra);
  const perAny = new Map<string, RecordatoriVista[]>();
  for (const r of properament) {
    const a = r.data.slice(0, 4);
    perAny.set(a, [...(perAny.get(a) ?? []), r]);
  }

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

  const Fila = ({ r, fet }: { r: RecordatoriVista; fet?: boolean }) => (
    <div className="flex flex-wrap items-center gap-4 border-t border-stone-100 py-3.5">
      <DataTile data={r.data} petit vencut={!fet && r.data < avui} />
      <div className="min-w-0 flex-[1_1_14rem]">
        <p className={cn('font-bold text-slate-900', fet && 'text-slate-500 line-through decoration-slate-300')}>{r.titol}</p>
        <p className="text-sm text-slate-600">
          {fet && r.fetAt ? `Fet el ${dataCurta(r.fetAt.slice(0, 10))}` : `Avisa ${textDiesAbans(r.diesAbans)}`} · {textRepeticio(r.repeticioCada, r.repeticioUnitat).toLowerCase()}
          {r.notes ? ` · ${r.notes}` : ''}
        </p>
      </div>
      {r.whatsapp ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </span>
      ) : (
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">Només tauler</span>
      )}
      {canWrite && (
        <div className="flex gap-1">
          {fet ? (
            <button type="button" onClick={() => desfes(r.id)} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100">
              <RotateCcw className="h-4 w-4" /> Desfer
            </button>
          ) : (
            <button type="button" onClick={() => setForm({ obert: true, r })} aria-label={`Editar ${r.titol}`} className="rounded-full p-2.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800">
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={() => setEsborra(r)} aria-label={`Esborrar ${r.titol}`} className="rounded-full p-2.5 text-stone-400 hover:bg-red-50 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-serif text-4xl font-semibold text-brand-700 sm:text-5xl">Recordatoris</h1>
          <p className="max-w-xl text-sm text-slate-600">
            El que no se t’ha de passar: assegurances, revisions, contractes. Surt al tauler i t’arriba al WhatsApp.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => setForm({ obert: true, r: null })}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-700 px-5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(122,31,43,0.25)] hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" /> Nou recordatori
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-800"><Bell className="h-5 w-5" /></span>
          <span><span className="block text-2xl font-extrabold leading-tight">{ara.length}</span><span className="text-sm text-slate-600">toquen ara</span></span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><CalendarDays className="h-5 w-5" /></span>
          <span><span className="block text-2xl font-extrabold leading-tight">{properament.length}</span><span className="text-sm text-slate-600">programats</span></span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', whatsappActiu ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-500')}>
            <MessageCircle className="h-5 w-5" />
          </span>
          <span>
            <span className={cn('block font-bold', whatsappActiu ? 'text-emerald-800' : 'text-stone-700')}>
              {whatsappActiu ? 'WhatsApp connectat' : 'WhatsApp no connectat'}
            </span>
            <span className="text-sm text-slate-600">{whatsappActiu ? 'resum cada matí' : 'es connecta a Configuració'}</span>
          </span>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {ara.length > 0 && (
        <section aria-label="Ara toca" className="space-y-3">
          <h2 className="font-serif text-3xl font-semibold text-slate-900">Ara toca</h2>
          {ara.map((r) => <RecordatoriTarja key={r.id} r={r} avui={avui} canWrite={canWrite} />)}
        </section>
      )}

      <section className="rounded-3xl bg-white px-5 pb-2 pt-5 shadow-sm sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <h2 className="font-serif text-3xl font-semibold text-slate-900">{vista === 'pendents' ? 'Properament' : 'Fets'}</h2>
          <div role="tablist" aria-label="Quins recordatoris" className="flex gap-1 rounded-full bg-stone-100 p-1">
            {(['pendents', 'fets'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                onClick={() => setVista(v)}
                className={cn('h-9 rounded-full px-4 text-sm font-bold', vista === v ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-600')}
              >
                {v === 'pendents' ? 'Pendents' : 'Fets'}
              </button>
            ))}
          </div>
        </div>

        {vista === 'pendents' ? (
          properament.length === 0 ? (
            <p className="border-t border-stone-100 py-6 text-sm text-slate-500">
              {pendents.length === 0 ? 'Encara no hi ha cap recordatori. Crea’n un amb «Nou recordatori».' : 'Tots els pendents ja toquen ara (a dalt).'}
            </p>
          ) : (
            [...perAny.entries()].map(([any, llista]) => (
              <div key={any}>
                <p className="pb-1 pt-3 text-xs font-extrabold uppercase tracking-[0.14em] text-stone-500">{any}</p>
                {llista.map((r) => <Fila key={r.id} r={r} />)}
              </div>
            ))
          )
        ) : fets.length === 0 ? (
          <p className="border-t border-stone-100 py-6 text-sm text-slate-500">Encara no n’has marcat cap com a fet.</p>
        ) : (
          fets.map((r) => <Fila key={r.id} r={r} fet />)
        )}
        <p className="border-t border-stone-100 py-4 text-xs text-slate-500">
          Quan marques «Fet» un recordatori que es repeteix, es programa sol el següent.
        </p>
      </section>

      {form.obert && (
        <RecordatoriFormulari
          inicial={form.r}
          whatsappActiu={whatsappActiu}
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
