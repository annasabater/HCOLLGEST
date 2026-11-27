'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Smartphone, X } from 'lucide-react';
import { ApiError, postJSON, putJSON } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TargetaEstada, TriaEstada } from './tria-estada';
import {
  ACCIONS_RECORDATORI,
  ACCIO_RECORDATORI_LABELS,
  type AccioRecordatori,
  dataCurta,
  diaMadrid,
  DIES_ABANS_PROPOSATS,
  seguentData,
  sumaDies,
  textHora,
  TIPUS_RECORDATORI,
  TIPUS_RECORDATORI_LABELS,
  type TipusRecordatori,
  type UnitatRepeticio,
} from '@/lib/recordatoris';
import type { EstadaRecordatori, RecordatoriVista } from '@/lib/services/recordatoris';

const dcm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
/** Què passarà aquell dia, segons l'acció triada. */
const AJUDA_ACCIO: Record<AccioRecordatori, (data: string) => string> = {
  PRORROGA: (d) =>
    `Va a la pròrroga: a «Estades en curs» surt «Ho dirà el ${dcm(d)}» i aquell dia el tauler et pregunta Allarga / Marxa.`,
  COBRAMENT: () => 'Aquell dia el tauler et recorda que ha de pagar, amb l’enllaç per registrar el pagament.',
  SORTIDA: () => 'Aquell dia el tauler t’obre el missatge de sortida per WhatsApp, en el seu idioma.',
  FACTURA: () => 'Aquell dia el tauler et porta a l’estada per fer-li la factura.',
  ALTRES: () => 'Surt amb l’habitació i els hostes; el marques «Fet» quan ho hagis fet.',
};

type Repeticio = 'CAP' | 'MES' | 'SEMESTRE' | 'ANY' | 'PERSONALITZAT';
const REPETICIONS: { r: Repeticio; label: string; cada?: number; unitat?: UnitatRepeticio }[] = [
  { r: 'CAP', label: 'Un sol cop' },
  { r: 'MES', label: 'Cada mes', cada: 1, unitat: 'MESOS' },
  { r: 'SEMESTRE', label: 'Cada 6 mesos', cada: 6, unitat: 'MESOS' },
  { r: 'ANY', label: 'Cada any', cada: 1, unitat: 'ANYS' },
  { r: 'PERSONALITZAT', label: 'Cada…' },
];

function repeticioDe(v: RecordatoriVista | null): Repeticio {
  // Un recordatori nou comença com «Un sol cop» (decisió de l'Anna).
  if (!v?.repeticioCada || !v.repeticioUnitat) return 'CAP';
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
  estadaInicial,
  onTanca,
  onDesat,
}: {
  inicial: RecordatoriVista | null;
  mobilActiu: boolean;
  calendariConnectat: boolean;
  /** Nou recordatori ja lligat a aquesta estada (des de la fitxa de l'estada). */
  estadaInicial?: EstadaRecordatori | null;
  onTanca: () => void;
  onDesat: () => void;
}) {
  const avui = diaMadrid();
  const [titol, setTitol] = useState(inicial?.titol ?? '');
  const [notes, setNotes] = useState(inicial?.notes ?? '');
  const [tipus, setTipus] = useState<TipusRecordatori>((inicial?.tipus as TipusRecordatori) ?? 'ASSEGURANCA');
  // Un recordatori nou comença amb la data d'avui.
  const [data, setData] = useState(inicial?.data ?? avui);
  const [hora, setHora] = useState<string>(inicial?.hora ?? '');
  const [rep, setRep] = useState<Repeticio>(repeticioDe(inicial));
  const [cada, setCada] = useState(String(inicial?.repeticioCada ?? 2));
  const [unitat, setUnitat] = useState<UnitatRepeticio>((inicial?.repeticioUnitat as UnitatRepeticio) ?? 'ANYS');
  // Lligat a una estada: un d'estada nou avisa el mateix dia (es pot canviar).
  const estadaDe = inicial?.estada ?? estadaInicial ?? null;
  const [lligat, setLligat] = useState(!!estadaDe);
  const [estada, setEstada] = useState<EstadaRecordatori | null>(estadaDe);
  const [triant, setTriant] = useState(false);
  const [accio, setAccio] = useState<AccioRecordatori>(inicial?.accio ?? 'PRORROGA');
  const [importCobrar, setImportCobrar] = useState(inicial?.import != null ? String(inicial.import).replace('.', ',') : '');
  const [dies, setDies] = useState<number[]>(inicial?.diesAbans ?? (estadaDe ? [0] : [30, 7]));
  // Títol proposat per l'acció (es posa sol si encara no n'has escrit cap altre).
  const titolsAccio = Object.values(ACCIO_RECORDATORI_LABELS) as string[];
  const triaAccio = (a: AccioRecordatori) => {
    setAccio(a);
    if (!titol.trim() || titolsAccio.includes(titol.trim())) setTitol(a === 'ALTRES' ? '' : ACCIO_RECORDATORI_LABELS[a]);
    if (a === 'PRORROGA') setRep('CAP');
  };
  useEffect(() => {
    // Un nou que neix lligat (des de la fitxa) ja porta el títol de l'acció.
    if (!inicial && estadaInicial && !titol) setTitol(ACCIO_RECORDATORI_LABELS.PRORROGA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const esProrroga = lligat && accio === 'PRORROGA';
  const [altres, setAltres] = useState('');
  const [whatsapp, setWhatsapp] = useState(inicial?.whatsapp ?? true);
  const [calendari, setCalendari] = useState(inicial?.calendari ?? true);
  const [fix, setFix] = useState(inicial?.fix ?? false);
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
    const repeteix = rep !== 'CAP' && !esProrroga;
    const ambEstada = lligat && estada;
    const body = {
      titol,
      notes: notes || null,
      tipus: ambEstada ? 'ALTRES' : tipus,
      data,
      hora: hora || null,
      repeticioCada: !repeteix ? null : rep === 'PERSONALITZAT' ? Number(cada) : p.cada,
      repeticioUnitat: !repeteix ? null : rep === 'PERSONALITZAT' ? unitat : p.unitat,
      diesAbans: dies,
      whatsapp,
      calendari,
      fix: repeteix && fix,
      estanciaId: ambEstada ? estada.id : null,
      accio: ambEstada ? accio : null,
      import: ambEstada && accio === 'COBRAMENT' && importCobrar.trim() ? Number(importCobrar.trim().replace(',', '.')) : null,
    };
    if (lligat && !estada) {
      setErr('Tria l’estada (o marca «No, és general»).');
      setBusy(false);
      return;
    }
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

        {/* Lligat a una estada: surt amb l'habitació i els hostes, i el tauler proposa l'acció. */}
        <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-bold text-slate-800">Va lligat a una estada?</legend>
          <div role="radiogroup" aria-label="Lligat a una estada" className="flex flex-wrap gap-2">
            <button type="button" role="radio" aria-checked={!lligat} onClick={() => setLligat(false)} className={pill(!lligat)}>
              No, és general
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={lligat}
              onClick={() => {
                setLligat(true);
                if (!estada) setTriant(true);
                if (!inicial) {
                  setDies([0]);
                  if (!titol.trim()) setTitol(ACCIO_RECORDATORI_LABELS[accio]);
                }
              }}
              className={pill(lligat)}
            >
              Sí, d’una estada
            </button>
          </div>
          {lligat && (
            <>
              {estada && !triant ? (
                <TargetaEstada
                  e={estada}
                  accio={
                    <button type="button" onClick={() => setTriant(true)} className="h-9 shrink-0 border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Canviar
                    </button>
                  }
                />
              ) : (
                <TriaEstada
                  onTria={(e) => {
                    setEstada(e);
                    setTriant(false);
                  }}
                />
              )}
              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-800">Què és?</span>
                <div className="flex flex-wrap gap-2">
                  {ACCIONS_RECORDATORI.map((a) => (
                    <button key={a} type="button" aria-pressed={accio === a} onClick={() => triaAccio(a)} className={pill(accio === a)}>
                      {ACCIO_RECORDATORI_LABELS[a]}
                    </button>
                  ))}
                </div>
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">{AJUDA_ACCIO[accio](data)}</p>
                {accio === 'COBRAMENT' && (
                  <label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
                    Quant?
                    <span className="relative">
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        value={importCobrar}
                        onChange={(e) => setImportCobrar(e.target.value.replace(/[^\d.,]/g, ''))}
                        className="h-11 w-36 pr-8 text-right text-base font-bold"
                        aria-label="Import que ha de pagar"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">€</span>
                    </span>
                    <span className="text-xs font-normal text-slate-500">(opcional)</span>
                  </label>
                )}
              </div>
            </>
          )}
        </fieldset>

        {!lligat && (
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
        )}

        <div className="space-y-2">
          <label htmlFor="rec-data" className="text-sm font-bold text-slate-800">Quan és?</label>
          <div className="flex flex-wrap items-center gap-2">
            <Input id="rec-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 w-48 text-base font-bold" />
            {(lligat && estada?.sortida
              ? [
                  { l: 'una setmana abans de sortir', d: sumaDies(estada.sortida, -7) },
                  { l: '3 dies abans', d: sumaDies(estada.sortida, -3) },
                  { l: 'el dia abans', d: sumaDies(estada.sortida, -1) },
                ].filter((x) => x.d >= avui)
              : [
                  { l: 'd’aquí a 1 mes', d: seguentData(avui, 1, 'MESOS') },
                  { l: '6 mesos', d: seguentData(avui, 6, 'MESOS') },
                  { l: '1 any', d: seguentData(avui, 1, 'ANYS') },
                ]
            ).map((x) => (
              <button key={x.l} type="button" onClick={() => setData(x.d)} className="h-9 rounded-full bg-stone-100 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-200">
                {x.l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="rec-hora" className="text-sm font-bold text-slate-800">A quina hora t’aviso?</label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={hora === ''} onClick={() => setHora('')} className={pill(hora === '')}>
              Amb el resum del matí
            </button>
            {['08:00', '14:00', '20:00', '21:00'].map((h) => (
              <button key={h} type="button" aria-pressed={hora === h} onClick={() => setHora(h)} className={pill(hora === h)}>
                {h.replace(/^0/, '')}
              </button>
            ))}
            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
              o a les
              <Input
                id="rec-hora"
                type="time"
                step={60}
                aria-label="Una altra hora (hores i minuts)"
                value={hora}
                onChange={(e) => setHora(e.target.value.slice(0, 5))}
                className="h-11 w-32 rounded-full text-center text-base font-bold"
              />
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {hora
              ? `Els dies d’avís t’arribarà ${textHora(hora)} (pot arribar fins a un minut més tard).`
              : 'Els dies d’avís sortirà al resum de cada matí, cap a les 9.'}
          </p>
        </div>

        {esProrroga ? (
          <p className="text-sm text-slate-600">
            <span className="font-bold text-slate-800">Es repeteix?</span> Un sol cop (va lligat a la pròrroga d’aquesta sortida).
          </p>
        ) : (
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
            <>
              <p className="text-xs text-slate-500">
                En desar-lo ja queda tota la sèrie: passat el dia, es programa sol el següent (no cal marcar «Fet»).
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <input type="checkbox" checked={fix} onChange={(e) => setFix(e.target.checked)} className="h-5 w-5 accent-brand-700" />
                <span className="text-sm font-bold text-slate-900">
                  És un fix <span className="font-normal text-slate-600">(llum, aigua, lloguer, assegurances…): surt a la pestanya «Fixes»</span>
                </span>
              </label>
            </>
          )}
        </div>
        )}

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
                  ? `${hora ? textHora(hora).replace(/^a/, 'A') : 'Al resum del matí'}${diesAvis.length ? `: ${diesAvis.filter((d) => d >= avui).map((d) => dataCurta(d).slice(0, 5)).join(', ')}` : ''}`
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
                  ? `Esdeveniment el ${dataCurta(data).slice(0, 5)} ${textHora(hora || '09:00')}, amb els avisos dels dies triats`
                  : 'Google Calendar encara no està connectat (Configuració → Google Calendar).'}
              </span>
            </span>
            <input type="checkbox" checked={calendari} onChange={(e) => setCalendari(e.target.checked)} className="h-6 w-6 accent-blue-700" />
          </label>
          <p className="text-xs text-slate-500">
            {rep !== 'CAP' && !esProrroga
              ? 'Al tauler surt des del primer dia d’avís fins al mateix dia (o fins que el marquis «Fet»).'
              : 'Al tauler surt sempre, des del primer dia d’avís fins que el marquis «Fet».'}
          </p>
          {lligat && (
            <p className="text-xs text-slate-500">
              Al mòbil, al WhatsApp i al Calendar només hi surt «Hab. {estada?.habitacio ?? '…'} · {titol.trim() || '…'}», sense els noms.
            </p>
          )}
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
