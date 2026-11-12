'use client';

import { useState } from 'react';
import { CalendarDays, Smartphone, X } from 'lucide-react';
import { ApiError, postJSON, putJSON } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  dataCurta,
  diaMadrid,
  DIES_ABANS_PROPOSATS,
  seguentData,
  sumaDies,
  TIPUS_RECORDATORI,
  TIPUS_RECORDATORI_LABELS,
  type TipusRecordatori,
  type UnitatRepeticio,
} from '@/lib/recordatoris';
import type { RecordatoriVista } from '@/lib/services/recordatoris';

type Repeticio = 'CAP' | 'MES' | 'SEMESTRE' | 'ANY' | 'PERSONALITZAT';
const REPETICIONS: { r: Repeticio; label: string; cada?: number; unitat?: UnitatRepeticio }[] = [
  { r: 'CAP', label: 'Un sol cop' },
  { r: 'MES', label: 'Cada mes', cada: 1, unitat: 'MESOS' },
  { r: 'SEMESTRE', label: 'Cada 6 mesos', cada: 6, unitat: 'MESOS' },
  { r: 'ANY', label: 'Cada any', cada: 1, unitat: 'ANYS' },
  { r: 'PERSONALITZAT', label: 'Cada…' },
];

function repeticioDe(v: RecordatoriVista | null): Repeticio {
  if (!v?.repeticioCada || !v.repeticioUnitat) return v ? 'CAP' : 'ANY';
  const p = REPETICIONS.find((x) => x.cada === v.repeticioCada && x.unitat === v.repeticioUnitat);
  return p?.r ?? 'PERSONALITZAT';
}

const labelDies = (d: number) => (d === 0 ? 'El mateix dia' : d === 1 ? '1 dia' : d === 7 ? '1 setmana' : d === 30 ? '1 mes' : `${d} dies`);

const pill = (actiu: boolean) =>
  cn(
    'h-11 rounded-full border-[1.5px] px-4 text-sm transition-colors',
    actiu ? 'border-brand-700 bg-brand-700 font-bold text-white' : 'border-stone-200 bg-white font-semibold text-stone-700 hover:bg-stone-50',
  );

export function RecordatoriFormulari({
  inicial,
  mobilActiu,
  calendariConnectat,
  onTanca,
  onDesat,
}: {
  inicial: RecordatoriVista | null;
  mobilActiu: boolean;
  calendariConnectat: boolean;
  onTanca: () => void;
  onDesat: () => void;
}) {
  const avui = diaMadrid();
  const [titol, setTitol] = useState(inicial?.titol ?? '');
  const [notes, setNotes] = useState(inicial?.notes ?? '');
  const [tipus, setTipus] = useState<TipusRecordatori>((inicial?.tipus as TipusRecordatori) ?? 'ASSEGURANCA');
  const [data, setData] = useState(inicial?.data ?? seguentData(avui, 1, 'ANYS'));
  const [rep, setRep] = useState<Repeticio>(repeticioDe(inicial));
  const [cada, setCada] = useState(String(inicial?.repeticioCada ?? 2));
  const [unitat, setUnitat] = useState<UnitatRepeticio>((inicial?.repeticioUnitat as UnitatRepeticio) ?? 'ANYS');
  const [dies, setDies] = useState<number[]>(inicial?.diesAbans ?? [30, 7]);
  const [altres, setAltres] = useState('');
  const [whatsapp, setWhatsapp] = useState(inicial?.whatsapp ?? true);
  const [calendari, setCalendari] = useState(inicial?.calendari ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleDia = (d: number) => setDies((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
  const afegeixAltres = () => {
    const n = Number(altres);
    if (Number.isInteger(n) && n >= 0 && n <= 365 && !dies.includes(n)) setDies((s) => [...s, n]);
    setAltres('');
  };
  const diesAvis = [...new Set(dies)]
    .sort((a, b) => b - a)
    .map((d) => sumaDies(data, -d));
  const proposats: number[] = [...DIES_ABANS_PROPOSATS, ...dies.filter((d) => !(DIES_ABANS_PROPOSATS as readonly number[]).includes(d))];

  async function desa() {
    setBusy(true);
    setErr(null);
    const p = REPETICIONS.find((x) => x.r === rep)!;
    const body = {
      titol,
      notes: notes || null,
      tipus,
      data,
      repeticioCada: rep === 'CAP' ? null : rep === 'PERSONALITZAT' ? Number(cada) : p.cada,
      repeticioUnitat: rep === 'CAP' ? null : rep === 'PERSONALITZAT' ? unitat : p.unitat,
      diesAbans: dies,
      whatsapp,
      calendari,
    };
    try {
      if (inicial) await putJSON(`/api/recordatoris/${inicial.id}`, body);
      else await postJSON('/api/recordatoris', body);
      onDesat();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut desar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-6" onClick={onTanca}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rec-form-titol"
        className="w-full max-w-2xl space-y-6 rounded-3xl bg-white p-5 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="rec-form-titol" className="font-serif text-2xl font-semibold text-slate-900">
            {inicial ? 'Editar recordatori' : 'Nou recordatori'}
          </h2>
          <button type="button" onClick={onTanca} aria-label="Tancar" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label htmlFor="rec-titol" className="text-sm font-bold text-slate-800">Què t’he de recordar?</label>
          <Input id="rec-titol" value={titol} onChange={(e) => setTitol(e.target.value)} placeholder="Renovar l’assegurança de l’hostal" className="h-12 text-base font-semibold" autoFocus />
          <Input aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (opcional): companyia, pòlissa, telèfon…" />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-bold text-slate-800">Tipus</span>
          <div className="flex flex-wrap gap-2">
            {TIPUS_RECORDATORI.map((t) => (
              <button key={t} type="button" aria-pressed={tipus === t} onClick={() => setTipus(t)} className={pill(tipus === t)}>
                {TIPUS_RECORDATORI_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="rec-data" className="text-sm font-bold text-slate-800">Quan és?</label>
          <div className="flex flex-wrap items-center gap-2">
            <Input id="rec-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 w-48 text-base font-bold" />
            {[
              { l: 'd’aquí a 1 mes', d: seguentData(avui, 1, 'MESOS') },
              { l: '6 mesos', d: seguentData(avui, 6, 'MESOS') },
              { l: '1 any', d: seguentData(avui, 1, 'ANYS') },
            ].map((x) => (
              <button key={x.l} type="button" onClick={() => setData(x.d)} className="h-9 rounded-full bg-stone-100 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-200">
                {x.l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-stone-50 p-4">
          <span className="text-sm font-bold text-slate-800">Es repeteix?</span>
          <div className="flex flex-wrap gap-2">
            {REPETICIONS.map((x) => (
              <button key={x.r} type="button" aria-pressed={rep === x.r} onClick={() => setRep(x.r)} className={pill(rep === x.r)}>
                {x.label}
              </button>
            ))}
          </div>
          {rep === 'PERSONALITZAT' && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <span>Cada</span>
              <Input aria-label="Cada quant" type="number" min={1} max={120} value={cada} onChange={(e) => setCada(e.target.value)} className="h-11 w-20 text-center text-base font-bold" />
              <select
                aria-label="Unitat"
                value={unitat}
                onChange={(e) => setUnitat(e.target.value as UnitatRepeticio)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"
              >
                <option value="SETMANES">setmanes</option>
                <option value="MESOS">mesos</option>
                <option value="ANYS">anys</option>
              </select>
              <span className="text-xs text-slate-500">p. ex. cada 2 anys el certificat, cada 3 mesos l’IVA</span>
            </div>
          )}
          {rep !== 'CAP' && (
            <p className="text-xs text-slate-500">Quan el marquis «Fet», es programa sol el següent.</p>
          )}
        </div>

        <div className="space-y-3">
          <span className="text-sm font-bold text-slate-800">Avisa’m abans</span>
          <div className="flex flex-wrap gap-2">
            {proposats.map((d) => (
              <button key={d} type="button" aria-pressed={dies.includes(d)} onClick={() => toggleDia(d)} className={pill(dies.includes(d))}>
                {labelDies(d)}
              </button>
            ))}
            <span className="inline-flex items-center gap-1">
              <Input
                aria-label="Altres dies abans"
                type="number"
                min={0}
                max={365}
                placeholder="dies"
                value={altres}
                onChange={(e) => setAltres(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); afegeixAltres(); } }}
                className="h-11 w-20 rounded-full text-center"
              />
              <button type="button" onClick={afegeixAltres} className="h-11 rounded-full border-[1.5px] border-dashed border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                + afegir
              </button>
            </span>
          </div>
          {diesAvis.length > 0 && data && (
            <div className="flex items-center px-1 pt-3" aria-label="Dies que t'avisarà">
              {diesAvis.map((d, i) => (
                <div key={d} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn('h-3.5 w-3.5 rounded-full', d === data ? 'h-5 w-5 border-4 border-brand-100 bg-brand-700' : 'bg-emerald-700')} />
                    <span className={cn('whitespace-nowrap text-xs font-bold', d === data && 'text-brand-700')}>{dataCurta(d).slice(0, 5)}</span>
                  </div>
                  {i < diesAvis.length - 1 && <span className="mx-1.5 mb-5 h-[3px] flex-1 rounded bg-stone-200" />}
                </div>
              ))}
              {!diesAvis.includes(data) && (
                <>
                  <span className="mx-1.5 mb-5 h-[3px] w-10 rounded bg-stone-200" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="h-5 w-5 rounded-full border-4 border-brand-100 bg-brand-700" />
                    <span className="text-xs font-extrabold text-brand-700">{dataCurta(data).slice(0, 5)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-bold text-slate-800">On t’ho he de recordar?</span>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
              <Smartphone className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-slate-900">Notificació al mòbil</span>
              <span className="block text-xs text-slate-600">
                {mobilActiu
                  ? `Al resum del matí${diesAvis.length ? `: ${diesAvis.filter((d) => d >= avui).map((d) => dataCurta(d).slice(0, 5)).join(', ')}` : ''}`
                  : 'Encara no hi ha cap mòbil activat (Configuració → Notificacions al mòbil).'}
              </span>
            </span>
            <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} className="h-6 w-6 accent-brand-700" />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-slate-900">Al Google Calendar</span>
              <span className="block text-xs text-slate-600">
                {calendariConnectat
                  ? `Esdeveniment el ${dataCurta(data).slice(0, 5)} a les 9:00, amb els avisos dels dies triats`
                  : 'Google Calendar encara no està connectat (Configuració → Google Calendar).'}
              </span>
            </span>
            <input type="checkbox" checked={calendari} onChange={(e) => setCalendari(e.target.checked)} className="h-6 w-6 accent-blue-700" />
          </label>
          <p className="text-xs text-slate-500">Al tauler surt sempre, des del primer dia d’avís fins que el marquis «Fet».</p>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onTanca} className="h-12 rounded-full border-[1.5px] border-stone-300 bg-white px-5 text-sm font-bold text-stone-700 hover:bg-stone-50">
            Cancel·la
          </button>
          <button
            type="button"
            onClick={desa}
            disabled={busy || !titol.trim() || !data}
            className="h-12 rounded-full bg-brand-700 px-6 text-sm font-bold text-white shadow-[0_6px_18px_rgba(122,31,43,0.25)] hover:bg-brand-800 disabled:opacity-60"
          >
            {busy ? 'Desant…' : 'Desa el recordatori'}
          </button>
        </div>
      </div>
    </div>
  );
}
