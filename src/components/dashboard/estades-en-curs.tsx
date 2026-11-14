'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BedDouble, ChevronDown, ChevronUp, ExternalLink, MessageCircle, Pencil, Plus, X } from 'lucide-react';
import { ApiError, delJSON, postJSON } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { diaMadrid } from '@/lib/recordatoris';
import { diesEntreDies, sumaDiesDia } from '@/lib/prorroga';
import type { MissatgeProrroga } from '@/lib/plantilles';
import type { EstadaEnCurs, EventProrroga } from '@/lib/services/prorrogues';
import { MissatgeProrrogaComposer, sortidaRecomanada, type InfoEnviat } from './missatge-prorroga';

const dc = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const diaDe = (iso: string) => diaMadrid(new Date(iso));
const horaDe = (iso: string) =>
  new Intl.DateTimeFormat('ca-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

/** Cada pas de la línia del temps: text i color. */
const PAS: Record<string, { t: string; dot: string }> = {
  PREGUNTAT: { t: 'Preguntat si vol allargar', dot: 'bg-blue-600' },
  NO_CONTESTA: { t: 'No contesta: enviat l’avís', dot: 'bg-orange-600' },
  RECORDATORI: { t: 'Recordatori de sortida enviat', dot: 'bg-emerald-600' },
  APLACAT: { t: 'Aplaçat', dot: 'bg-amber-500' },
  SI: { t: 'Ha dit que sí: allarga', dot: 'bg-green-700' },
  NO: { t: 'Ha dit que no: marxa', dot: 'bg-red-700' },
  NOTA: { t: 'Nota', dot: 'bg-stone-400' },
  AMPLIAT: { t: 'Ha allargat', dot: 'bg-violet-600' },
};
const pas = (tipus: string) => PAS[tipus] ?? { t: tipus, dot: 'bg-stone-400' };

const ACCIO_MISSATGE: Record<MissatgeProrroga, string> = {
  pregunta: 'PREGUNTAT',
  noContesta: 'NO_CONTESTA',
  sortidaGrup: 'RECORDATORI',
  sortidaUna: 'RECORDATORI',
};

function Situacio({ e }: { e: EstadaEnCurs }) {
  const s = {
    PER_PREGUNTAR: { t: 'Per preguntar', c: 'bg-stone-100 text-stone-600' },
    TOCA: { t: 'Toca preguntar', c: 'bg-amber-50 text-amber-900' },
    ESPERANT: { t: 'Esperant resposta', c: 'bg-blue-50 text-blue-800' },
    APLACAT: {
      t: `Aplaçat fins al ${e.aplacatFins ? dc(e.aplacatFins) : ''}`,
      c: 'bg-amber-50 text-amber-900',
    },
    ALLARGA: { t: 'Allarga', c: 'bg-green-50 text-green-800' },
    MARXA: { t: 'Marxa', c: 'bg-red-50 text-red-800' },
  }[e.situacio];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold',
        s.c,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.t}
    </span>
  );
}

/** Línia del temps petita: entrada → sortida, avui, quan es proposa preguntar i els passos fets. */
function Pista({ e, avui }: { e: EstadaEnCurs; avui: string }) {
  const pos = (d: string) =>
    e.nits <= 0 ? 100 : Math.max(0, Math.min(100, (diesEntreDies(e.entrada, d) / e.nits) * 100));
  const decidit = e.situacio === 'ALLARGA' || e.situacio === 'MARXA';
  const prop = pos(e.dataProposada);
  return (
    <div className="relative h-6 min-w-0" aria-hidden="true">
      <div className="absolute inset-x-0 top-[11px] h-[3px] rounded bg-stone-200" />
      <div
        className="absolute left-0 top-[11px] h-[3px] rounded bg-brand-700/35"
        style={{ width: `${pos(avui)}%` }}
      />
      {!decidit && (
        <div
          className="absolute top-2 h-2.5 rounded border border-dashed border-amber-600 bg-amber-50"
          style={{ left: `${prop}%`, width: `${Math.max(2, 100 - prop)}%` }}
        />
      )}
      <div className="absolute left-0 top-[3px] h-[19px] w-1 rounded bg-slate-800" />
      <div className="absolute right-0 top-[3px] h-[19px] w-1 rounded bg-slate-800" />
      {e.ampliacions.map((d) => (
        <div
          key={d}
          title={`Ampliació des del ${dc(d)}`}
          className="absolute top-[5px] h-[15px] w-1 -translate-x-1/2 rounded bg-violet-600"
          style={{ left: `${pos(d)}%` }}
        />
      ))}
      <div
        className="absolute -bottom-0.5 -top-0.5 w-0.5 -translate-x-1/2 bg-brand-700"
        style={{ left: `${pos(avui)}%` }}
      />
      {e.events.map((x) => (
        <div
          key={x.id}
          title={`${dc(diaDe(x.data))} · ${pas(x.tipus).t}`}
          className={cn(
            'absolute top-[5px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white',
            pas(x.tipus).dot,
          )}
          style={{ left: `${pos(diaDe(x.data))}%` }}
        />
      ))}
    </div>
  );
}

interface Item {
  key: string;
  dia: string;
  t: string;
  m?: string | null;
  dot: string;
  futur?: boolean;
  event?: EventProrroga;
  /** Es pot canviar el dia (preguntar / recordatori de sortida). */
  edita?: QuinDia;
  triat?: boolean;
}

type QuinDia = 'preguntar' | 'recordatori';

/** Selector de dia en línia: «Desa», «Com abans» (si l'havies triat) i «Cancel·la». */
function TriaDia({
  inicial,
  min,
  max,
  triat,
  busy,
  onDesa,
  onTanca,
  text = 'Desa',
}: {
  inicial: string;
  min: string;
  max: string;
  triat?: boolean;
  busy: boolean;
  onDesa: (dia: string | null) => void;
  onTanca: () => void;
  text?: string;
}) {
  const [dia, setDia] = useState(inicial < min ? min : inicial > max ? max : inicial);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <Input
        type="date"
        value={dia}
        min={min}
        max={max}
        onChange={(ev) => setDia(ev.target.value)}
        className="h-8 w-40"
        aria-label="Dia"
      />
      <Button size="sm" disabled={busy || !dia} onClick={() => onDesa(dia)}>
        {text}
      </Button>
      {triat && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDesa(null)}>
          Com abans
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onTanca}>
        Cancel·la
      </Button>
    </div>
  );
}

function Historial({
  e,
  avui,
  onTreu,
  onDia,
  busy,
}: {
  e: EstadaEnCurs;
  avui: string;
  onTreu: (x: EventProrroga) => void;
  onDia: (quin: QuinDia, dia: string | null) => Promise<boolean>;
  busy: boolean;
}) {
  const [editant, setEditant] = useState<QuinDia | null>(null);
  const desa = async (quin: QuinDia, dia: string | null) => {
    if (await onDia(quin, dia)) setEditant(null);
  };
  // Es pot triar des d'avui (o l'entrada del tram) fins a la sortida.
  const minDia = avui;
  const maxDia = e.sortida;
  const decidit = e.situacio === 'ALLARGA' || e.situacio === 'MARXA';
  const items: Item[] = [
    {
      key: 'entrada',
      dia: e.entrada,
      t: 'Entrada',
      m: `${e.nits} nits · ${e.numViatgers} ${e.numViatgers === 1 ? 'persona' : 'persones'}`,
      dot: 'bg-slate-800',
    },
    ...e.events.map((x) => ({
      key: x.id,
      dia: diaDe(x.data),
      t: pas(x.tipus).t,
      m: x.detall,
      dot: pas(x.tipus).dot,
      event: x,
    })),
  ];
  if (!decidit && !e.events.some((x) => x.tipus === 'PREGUNTAT')) {
    items.push({
      key: 'proposta',
      dia: e.dataProposada,
      t:
        avui >= e.dataProposada
          ? e.preguntarTriat
            ? 'Toca preguntar-li (dia triat)'
            : 'Et proposo preguntar-li ja'
          : e.preguntarTriat
            ? `Preguntar-li el ${dc(e.dataProposada)} (dia triat)`
            : `Et proposaré preguntar-li el ${dc(e.dataProposada)}`,
      m: 'Ho pots fer abans o després, quan vulguis',
      dot: 'bg-white ring-2 ring-amber-500',
      futur: true,
      edita: 'preguntar',
      triat: e.preguntarTriat,
    });
  }
  if (e.recordatoriPendent && e.situacio !== 'ALLARGA') {
    const dia = e.recordatoriDia < avui ? avui : e.recordatoriDia;
    items.push({
      key: 'recordatori',
      dia,
      t: e.recordatoriEnviat ? 'Un altre recordatori de sortida' : 'Recordatori de sortida',
      m: e.recordatoriTriat
        ? `${diesEntreDies(e.recordatoriDia, e.sortida) === 1 ? 'El dia abans' : `${diesEntreDies(e.recordatoriDia, e.sortida)} dies abans`} (dia triat)`
        : 'El dia abans de marxar',
      dot: 'bg-white ring-2 ring-stone-300',
      futur: true,
      edita: 'recordatori',
      triat: e.recordatoriTriat,
    });
  }
  items.push({ key: 'sortida', dia: e.sortida, t: 'Sortida', dot: 'bg-slate-800', futur: true });
  items.sort((a, b) => a.dia.localeCompare(b.dia) || Number(!!a.futur) - Number(!!b.futur));

  return (
    <ol className="grid">
      {items.map((i, n) => (
        <li key={i.key} className="relative grid grid-cols-[16px_minmax(0,1fr)] gap-3 pb-3.5">
          {n < items.length - 1 && (
            <span className="absolute bottom-0 left-[7px] top-[18px] w-0.5 bg-stone-200" />
          )}
          <span
            className={cn(
              'relative mt-0.5 h-4 w-4 rounded-full border-[3px] border-white shadow-[0_0_0_1px_#e7e5e4]',
              i.dot,
            )}
          />
          <div className="min-w-0">
            <p className="text-xs tabular-nums text-slate-500">
              {dc(i.dia)}
              {i.dia === avui ? ' · avui' : ''}
              {i.event ? ` · ${horaDe(i.event.data)}` : ''}
            </p>
            <p
              className={cn(
                'flex items-start gap-1 font-semibold',
                i.futur ? 'text-slate-500' : 'text-slate-900',
              )}
            >
              <span className="min-w-0 flex-1">{i.t}</span>
              {i.event && i.event.tipus !== 'AMPLIAT' && (
                <button
                  type="button"
                  onClick={() => onTreu(i.event!)}
                  disabled={busy}
                  aria-label="Treure aquest pas"
                  title="Treure aquest pas (apuntat per error)"
                  className="rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </p>
            {i.m && <p className="text-sm text-slate-600">{i.m}</p>}
            {i.edita &&
              (editant === i.edita ? (
                <TriaDia
                  inicial={i.dia}
                  min={minDia}
                  max={maxDia}
                  triat={i.triat}
                  busy={busy}
                  onDesa={(d) => desa(i.edita!, d)}
                  onTanca={() => setEditant(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditant(i.edita!)}
                  className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Canvia el dia
                </button>
              ))}
          </div>
        </li>
      ))}
      {!e.recordatoriPendent && e.situacio !== 'ALLARGA' && e.sortida > avui && (
        <li className="pl-7">
          {editant === 'recordatori' ? (
            <TriaDia
              inicial={sumaDiesDia(e.sortida, -1)}
              min={minDia}
              max={maxDia}
              busy={busy}
              text="Programa’l"
              onDesa={(d) => desa('recordatori', d)}
              onTanca={() => setEditant(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditant('recordatori')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            >
              <Plus className="h-3 w-3" /> Programar un altre recordatori de sortida
            </button>
          )}
        </li>
      )}
    </ol>
  );
}

type Filtre = 'totes' | 'pendents' | 'setmana';

/**
 * Tauler: totes les estades en curs amb la seva línia del temps de la pròrroga
 * (preguntar si vol allargar, recordatori de sortida, respostes i notes). Es
 * proposa quan preguntar, però es pot fer en qualsevol moment.
 */
export function EstadesEnCurs({ avui, estades }: { avui: string; estades: EstadaEnCurs[] }) {
  const router = useRouter();
  const [obert, setObert] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>('totes');
  const [composer, setComposer] = useState<{ id: string; missatge: MissatgeProrroga } | null>(null);
  const [nota, setNota] = useState('');
  // «Aplaça fins al…»: selector de dia obert.
  const [aplacaDia, setAplacaDia] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Plegat o desplegat (es recorda en aquest navegador).
  const [plegat, setPlegat] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem('tauler-estades-plegat') === '1') setPlegat(true);
    } catch {
      /* sense localStorage: desplegat */
    }
  }, []);
  const canviaPlegat = (v: boolean) => {
    setPlegat(v);
    try {
      window.localStorage.setItem('tauler-estades-plegat', v ? '1' : '0');
    } catch {
      /* no es recorda, però funciona igual */
    }
  };

  const decidida = (e: EstadaEnCurs) => e.situacio === 'ALLARGA' || e.situacio === 'MARXA';
  const llista = estades.filter((e) =>
    filtre === 'pendents' ? !decidida(e) : filtre === 'setmana' ? e.diesFalten <= 7 : true,
  );
  const perDecidir = estades.filter((e) => !decidida(e)).length;

  async function accio(id: string, body: Record<string, unknown>): Promise<boolean> {
    setBusy(id);
    setError(null);
    try {
      await postJSON(`/api/estancies/${id}/prorroga`, body);
      setComposer(null);
      setAplacaDia(false);
      if (body.accio === 'NOTA') setNota('');
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No s’ha pogut desar');
      return false;
    } finally {
      setBusy(null);
    }
  }
  const canviaDia = (id: string) => (quin: 'preguntar' | 'recordatori', dia: string | null) =>
    accio(id, { accio: quin === 'preguntar' ? 'DIA_PREGUNTAR' : 'DIA_RECORDATORI', dia });
  async function treu(id: string, x: EventProrroga) {
    setBusy(id);
    setError(null);
    try {
      await delJSON(`/api/estancies/${id}/prorroga?event=${encodeURIComponent(x.id)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No s’ha pogut treure');
    } finally {
      setBusy(null);
    }
  }
  const enviat = (id: string) => (info: InfoEnviat) =>
    accio(id, { accio: ACCIO_MISSATGE[info.missatge], detall: info.detall });

  if (estades.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      aria-labelledby="t-estades-curs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div>
          <h2
            id="t-estades-curs"
            className="flex items-center gap-2 font-serif text-xl font-semibold text-slate-900"
          >
            <BedDouble className="h-5 w-5 text-brand-700" /> Estades en curs
          </h2>
          <p className="text-sm text-slate-500">
            {estades.length} {estades.length === 1 ? 'estada' : 'estades'}
            {perDecidir > 0 ? ` · ${perDecidir} per decidir si allarguen` : ''}
            {plegat ? '.' : '. Clica’n una per veure què ha passat i què pots fer.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!plegat && (
            <div
              role="group"
              aria-label="Quines estades"
              className="flex gap-1 rounded-full bg-stone-100 p-1"
            >
              {(
                [
                  ['totes', 'Totes'],
                  ['pendents', 'Per decidir'],
                  ['setmana', 'Surten aquesta setmana'],
                ] as const
              ).map(([f, l]) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filtre === f}
                  onClick={() => setFiltre(f)}
                  className={cn(
                    'h-8 rounded-full px-3 text-xs font-bold',
                    filtre === f ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-600',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => canviaPlegat(!plegat)}
            aria-expanded={!plegat}
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold text-stone-600 hover:bg-stone-100"
          >
            {plegat ? (
              <>
                <ChevronDown className="h-4 w-4" /> Mostra
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4" /> Amaga
              </>
            )}
          </button>
        </div>
      </div>
      {!plegat && (
        <>
          {error && <p className="px-5 pb-2 text-sm text-red-600">{error}</p>}

          {llista.length === 0 && (
            <p className="border-t border-stone-100 px-5 py-5 text-sm text-slate-500">
              Cap estada amb aquest filtre.
            </p>
          )}
          {llista.map((e) => {
            const titular = e.viatgers[0]
              ? `${e.viatgers[0].nom} ${e.viatgers[0].cognom1}`
              : e.numContracte
                ? `Contracte ${e.numContracte}`
                : 'Sense titular';
            const esObert = obert === e.id;
            const falta = e.recordatoriPendent && avui >= e.recordatoriDia && e.situacio !== 'ALLARGA';
            const ambAmpliacio = e.situacio === 'ALLARGA' && e.estat !== 'SI';
            return (
              <div key={e.id} className="border-t border-stone-100">
                <button
                  type="button"
                  aria-expanded={esObert}
                  onClick={() => {
                    setObert(esObert ? null : e.id);
                    setComposer(null);
                    setNota('');
                    setAplacaDia(false);
                  }}
                  className="grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left hover:bg-stone-50 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-5"
                >
                  <span className="row-span-2 flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-brand-50 leading-none text-brand-700 sm:row-span-1 sm:h-[52px] sm:w-[52px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Hab.</span>
                    <span className="text-lg font-extrabold sm:text-xl">{e.habitacio ?? '–'}</span>
                  </span>
                  <span className="grid min-w-0 gap-1.5">
                    <span className="flex flex-wrap items-baseline gap-x-2.5">
                      <strong className="text-slate-900">{titular}</strong>
                      <span className="text-xs tabular-nums text-slate-500">
                        {dc(e.entrada)} → {dc(e.sortida)} · {e.nits} nits
                        {e.ampliacions.length > 0 && (
                          <span className="ml-1.5 rounded-full bg-violet-50 px-2 py-0.5 font-bold text-violet-800">
                            {e.ampliacions.length === 1
                              ? 'ja ha allargat 1 cop'
                              : `ja ha allargat ${e.ampliacions.length} cops`}
                          </span>
                        )}
                      </span>
                    </span>
                    <Pista e={e} avui={avui} />
                  </span>
                  <span className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3 sm:grid sm:justify-items-end sm:gap-1">
                    <Situacio e={e} />
                    <span className="text-xs tabular-nums text-slate-500">
                      surt{' '}
                      {e.diesFalten === 0
                        ? 'avui'
                        : e.diesFalten === 1
                          ? 'demà'
                          : `d’aquí ${e.diesFalten} dies`}
                    </span>
                    {falta && (
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                        Falta el recordatori
                      </span>
                    )}
                  </span>
                </button>

                {esObert && (
                  <div className="grid gap-4 px-4 pb-5 pt-1 sm:px-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:pl-[88px]">
                    <div>
                      <p className="pb-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                        Què ha passat
                      </p>
                      <Historial
                        e={e}
                        avui={avui}
                        busy={busy === e.id}
                        onTreu={(x) => treu(e.id, x)}
                        onDia={canviaDia(e.id)}
                      />
                    </div>
                    <div className="grid content-start gap-2.5 rounded-xl bg-stone-50 p-3.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                        Què vols fer?
                      </p>
                      {composer?.id === e.id ? (
                        <MissatgeProrrogaComposer
                          key={`${e.id}-${composer.missatge}`}
                          estada={e}
                          inicial={composer.missatge}
                          onEnviat={enviat(e.id)}
                          onTanca={() => setComposer(null)}
                        />
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {!decidida(e) && (
                              <Button
                                size="sm"
                                className="bg-emerald-700 hover:bg-emerald-800"
                                onClick={() => setComposer({ id: e.id, missatge: 'pregunta' })}
                              >
                                <MessageCircle className="h-4 w-4" /> Preguntar si vol allargar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setComposer({ id: e.id, missatge: sortidaRecomanada(e) })
                              }
                            >
                              Recordatori de sortida
                            </Button>
                            {(e.situacio === 'ESPERANT' || e.situacio === 'APLACAT') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setComposer({ id: e.id, missatge: 'noContesta' })}
                              >
                                No contesta…
                              </Button>
                            )}
                          </div>
                          {!ambAmpliacio && (
                            <div className="flex flex-wrap gap-2">
                              {e.situacio !== 'ALLARGA' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy === e.id}
                                  onClick={() => accio(e.id, { accio: 'SI' })}
                                >
                                  {e.situacio === 'MARXA'
                                    ? 'Ha canviat d’idea: allarga'
                                    : 'Ha dit que sí'}
                                </Button>
                              )}
                              {e.situacio !== 'MARXA' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy === e.id}
                                  onClick={() => accio(e.id, { accio: 'NO' })}
                                >
                                  {e.situacio === 'ALLARGA'
                                    ? 'Ha canviat d’idea: marxa'
                                    : 'Ha dit que no'}
                                </Button>
                              )}
                              {!decidida(e) &&
                                (e.situacio === 'APLACAT' ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy === e.id}
                                    onClick={() => accio(e.id, { accio: 'MOSTRA' })}
                                  >
                                    Treu l’aplaçament
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={busy === e.id}
                                      onClick={() =>
                                        accio(e.id, {
                                          accio: 'APLACA',
                                          dies: 3,
                                          detall: `Torna a sortir el ${dc(sumaDiesDia(avui, 3))}`,
                                        })
                                      }
                                    >
                                      Recorda-m’ho en 3 dies
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={busy === e.id}
                                      onClick={() => setAplacaDia(true)}
                                    >
                                      Aplaça fins al…
                                    </Button>
                                  </>
                                ))}
                            </div>
                          )}
                          {aplacaDia && !decidida(e) && e.situacio !== 'APLACAT' && (
                            <TriaDia
                              inicial={sumaDiesDia(avui, 3)}
                              min={sumaDiesDia(avui, 1)}
                              max={e.sortida}
                              busy={busy === e.id}
                              text="Aplaça"
                              onDesa={(d) =>
                                d &&
                                accio(e.id, {
                                  accio: 'APLACA',
                                  fins: d,
                                  detall: `Torna a sortir el ${dc(d)}`,
                                })
                              }
                              onTanca={() => setAplacaDia(false)}
                            />
                          )}
                          {e.situacio === 'ALLARGA' && (
                            <p className="text-xs text-slate-600">
                              {ambAmpliacio
                                ? 'Ja té l’ampliació creada: l’estada següent ja és a gestio.'
                                : 'Següent pas: «Ampliar l’estada» a la fitxa (crea l’estada següent).'}
                            </p>
                          )}
                          <form
                            className="flex gap-2"
                            onSubmit={(ev) => {
                              ev.preventDefault();
                              if (nota.trim()) accio(e.id, { accio: 'NOTA', detall: nota.trim() });
                            }}
                          >
                            <Input
                              value={nota}
                              onChange={(ev) => setNota(ev.target.value)}
                              placeholder="Afegir una nota (p. ex. «m’ho diu dilluns»)"
                              aria-label="Nota"
                              maxLength={300}
                              className="h-9 min-w-0 flex-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              type="submit"
                              disabled={busy === e.id || !nota.trim()}
                            >
                              Afegir
                            </Button>
                          </form>
                        </>
                      )}
                      <Link
                        href={`/estancies/${e.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                      >
                        Obrir la fitxa de l’estada <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div
            className="flex flex-wrap gap-x-4 gap-y-1 border-t border-stone-100 px-5 py-3 text-xs text-slate-500"
            aria-label="Llegenda"
          >
            {(['PREGUNTAT', 'RECORDATORI', 'APLACAT', 'SI', 'NO', 'NOTA', 'AMPLIAT'] as const).map(
              (k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2.5 w-2.5 rounded-full', PAS[k]!.dot)} />
                  {
                    {
                      PREGUNTAT: 'Preguntat',
                      RECORDATORI: 'Recordatori enviat',
                      APLACAT: 'Aplaçat',
                      SI: 'Allarga',
                      NO: 'Marxa',
                      NOTA: 'Nota',
                      AMPLIAT: 'Ampliació feta',
                    }[k]
                  }
                </span>
              ),
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded border border-dashed border-amber-600 bg-amber-50" />{' '}
              Quan et proposo preguntar
            </span>
          </div>
        </>
      )}
    </section>
  );
}
