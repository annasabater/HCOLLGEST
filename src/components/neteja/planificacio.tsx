'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarPlus, Copy, ExternalLink, MessageSquare, Plus, Printer, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { PeriodeEnLinia } from '@/components/ui/navegador-periode';
import { MenuPagaments } from '@/components/neteja/menu-pagaments';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ApiError, delJSON, getJSON, patchJSON, postJSON, putJSON } from '@/lib/api';
import { toISODate } from '@/lib/dates';
import type { EstatPeriode } from '@/lib/periode';
import { dillunsDe, rangSencer, type DiaNeteja, type HabDia, type SetmanaNeteja, type TipusNeteja } from '@/lib/neteja-planificacio';
import { cn, formatEur } from '@/lib/utils';

interface Dades {
  setmanes: SetmanaNeteja[];
  habitacions: { id: string; nom: string }[];
  treballadors: { id: string; nom: string }[];
  sortides: string[];
  resum: { dies: number; sortides: number; manteniments: number; bugaderia: number; perPagar: number };
}

const DIES = ['dg', 'dl', 'dt', 'dc', 'dj', 'dv', 'ds'];
const MESOS = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];
const nomDia = (d: string) => `${DIES[new Date(`${d}T00:00:00Z`).getUTCDay()]} ${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`;
const curt = (d: string) => `${Number(d.slice(8, 10))} ${MESOS[Number(d.slice(5, 7)) - 1]}`;
const sumaDies = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Xip d'una habitació: granat = sortida, vora = manteniment, verd = feta. */
function Xip({ h, actiu, onClick }: { h: HabDia; actiu?: boolean; onClick?: () => void }) {
  const fet = h.origen === 'FETA';
  return (
    <button
      type="button"
      onClick={onClick}
      title={fet ? 'Feta (desada al full del dia)' : 'Clica per canviar-la o deixar-hi una observació'}
      className={cn(
        'inline-flex h-6 items-center gap-1 px-1.5 text-xs font-semibold',
        fet
          ? h.tipus === 'CANVI_COMPLET'
            ? 'border border-green-300 bg-green-50 text-green-800'
            : 'border border-green-100 bg-green-50/60 text-green-700'
          : h.tipus === 'CANVI_COMPLET'
            ? 'bg-brand-700 text-white'
            : 'border border-slate-200 bg-white text-slate-700',
        actiu && 'outline outline-2 outline-offset-2 outline-brand-700',
        !onClick && 'cursor-default',
      )}
    >
      {fet && <span className="text-[10px]">✓</span>}
      <b className="font-bold">{h.habitacioId ? h.nom : 'Zones'}</b>
      <span className="text-[10.5px] font-medium opacity-75">{h.tipus === 'CANVI_COMPLET' ? 'sortida' : 'mant.'}</span>
      {h.bugaderia && <span className="text-[10.5px] font-medium opacity-70">· bugaderia</span>}
      {h.nota && <MessageSquare className="h-3 w-3 opacity-70" />}
    </button>
  );
}

/** Text editable en línia (observació del dia o de la setmana), amb × per esborrar-la. */
function NotaEditable({
  text,
  etiqueta,
  afegir,
  onDesa,
  className,
}: {
  text: string | null;
  etiqueta: string;
  afegir: string;
  onDesa: (t: string) => Promise<void>;
  className?: string;
}) {
  const [editant, setEditant] = useState(false);
  const [valor, setValor] = useState(text ?? '');
  useEffect(() => setValor(text ?? ''), [text]);
  if (editant)
    return (
      <form
        className="flex w-full basis-full gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          await onDesa(valor);
          setEditant(false);
        }}
      >
        <Input autoFocus value={valor} onChange={(e) => setValor(e.target.value)} placeholder={afegir} aria-label={etiqueta} className="h-8 min-w-0 flex-1 text-[13px]" maxLength={1000} />
        <Button size="sm" type="submit">Desa</Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => { setValor(text ?? ''); setEditant(false); }}>Cancel·la</Button>
      </form>
    );
  if (!text)
    return (
      <button type="button" onClick={() => setEditant(true)} className="text-[11px] font-semibold text-slate-400 hover:text-brand-700">
        + {afegir}
      </button>
    );
  return (
    <div className={cn('group flex w-full basis-full items-start gap-1.5 text-[12.5px]', className)}>
      <button type="button" onClick={() => setEditant(true)} className="min-w-0 flex-1 text-left" title="Clica per canviar-la">
        <b>{etiqueta}:</b> {text}
      </button>
      <button type="button" onClick={() => onDesa('')} aria-label={`Esborrar ${etiqueta.toLowerCase()}`} title="Esborrar" className="p-0.5 text-slate-400 hover:text-red-700">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Quadret per canviar una habitació planificada: sortida/manteniment, observació, treure-la. */
function EditorHab({
  h,
  dia,
  onTanca,
  onCanvi,
  onTreu,
}: {
  h: HabDia;
  dia: string;
  onTanca: () => void;
  onCanvi: (p: { tipus: TipusNeteja; nota: string }) => Promise<void>;
  onTreu: () => Promise<void>;
}) {
  const [tipus, setTipus] = useState<TipusNeteja>(h.tipus);
  const [nota, setNota] = useState(h.nota ?? '');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const clic = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onTanca(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onTanca(); };
    document.addEventListener('mousedown', clic);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', clic); document.removeEventListener('keydown', tecla); };
  }, [onTanca]);
  return (
    <div ref={ref} role="dialog" aria-label={`Habitació ${h.nom}`} className="ui-card absolute left-0 top-9 z-30 w-[min(21rem,calc(100vw-3rem))] border border-slate-300 bg-white p-3.5 shadow-lg">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Habitació {h.nom} · {nomDia(dia)}</p>
      <div role="group" className="mt-2.5 flex border border-slate-200 text-[13px]">
        {(['CANVI_COMPLET', 'REPAS'] as const).map((t, i) => (
          <button key={t} type="button" aria-pressed={tipus === t} onClick={() => setTipus(t)} className={cn('flex-1 py-1.5 font-semibold', i > 0 && 'border-l border-slate-200', tipus === t ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-50')}>
            {t === 'CANVI_COMPLET' ? 'Sortida' : 'Manteniment'}
          </button>
        ))}
      </div>
      <label className="mt-2.5 block text-xs text-slate-500" htmlFor={`nota-${h.id}`}>Observació d&apos;aquesta habitació</label>
      <textarea id={`nota-${h.id}`} value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={500} placeholder="P. ex. falta un coixí, l'han deixada bruta…" className="mt-1 w-full border border-slate-300 p-2 text-[13px] focus:border-brand-600 focus:outline-none" />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={() => onCanvi({ tipus, nota })}>Desa</Button>
        <Button size="sm" variant="ghost" onClick={onTanca}>Cancel·la</Button>
        <button type="button" onClick={onTreu} className="ml-auto text-xs font-semibold text-red-700 hover:underline">Treu l&apos;habitació</button>
      </div>
    </div>
  );
}

/**
 * Planificació de la neteja per setmanes, com el full a mà: les neteges fetes i les
 * que vénen (planificades), amb sortida o manteniment i observacions per habitació,
 * per dia i per setmana. Es pot repetir la setmana passada i imprimir el full.
 */
export function PlanificacioNeteja({ onObreDia }: { onObreDia: (data: string, personaId: string | null) => void }) {
  const avui = toISODate(new Date());
  const [estat, setEstat] = useState<EstatPeriode>({ tipus: 'mes', off: 0 });
  const { desde, fins } = rangSencer(estat, avui);
  const [dades, setDades] = useState<Dades | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [obert, setObert] = useState<string | null>(null); // id de l'habitació amb l'editor obert
  const [nouDia, setNouDia] = useState<{ data: string; persona: string } | null>(null);
  const [diesBuits, setDiesBuits] = useState<{ data: string; persona: string }[]>([]);
  const [desfer, setDesfer] = useState<{ text: string; accio: () => Promise<void> } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carrega = useCallback(async () => {
    try {
      setDades(await getJSON<Dades>(`/api/neteja/planificacio?desde=${desde}&fins=${fins}`));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut carregar la planificació');
    }
  }, [desde, fins]);
  useEffect(() => { void carrega(); }, [carrega]);

  const fes = async (f: () => Promise<unknown>) => {
    try {
      await f();
      await carrega();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut desar');
    }
  };
  const ofereixDesfer = (text: string, accio: () => Promise<void>) => {
    if (timer.current) clearTimeout(timer.current);
    setDesfer({ text, accio });
    timer.current = setTimeout(() => setDesfer(null), 8000);
  };

  const persona0 = dades?.treballadors[0]?.id ?? '';
  const nomPersona = (id: string | null) => (id ? dades?.treballadors.find((t) => t.id === id)?.nom ?? '' : '');

  const desaNota = (data: string, ambit: 'DIA' | 'SETMANA', anterior: string | null) => async (text: string) => {
    await fes(() => putJSON('/api/neteja/notes', { data, ambit, text }));
    if (!text.trim() && anterior) {
      ofereixDesfer('Observació esborrada', () => fes(() => putJSON('/api/neteja/notes', { data, ambit, text: anterior })));
    }
  };

  const [avis, setAvis] = useState<string | null>(null);

  /** Repeteix la setmana anterior (o la darrera amb neteja) i diu què ha passat. */
  const repeteix = (dilluns: string) =>
    fes(async () => {
      const r = await postJSON<{ creades: number; origen: string | null; jaHi: number }>('/api/neteja/planificacio/repetir', { dilluns });
      const d = r.origen ? `${curt(r.origen)} – ${curt(sumaDies(r.origen, 6))}` : '';
      setAvis(
        !r.origen
          ? 'No hi ha cap neteja a les setmanes anteriors per copiar.'
          : r.creades === 0
            ? `No s'ha afegit res: tot el de la setmana del ${d} ja hi és${r.jaHi ? ` (${r.jaHi} habitacions)` : ''}.`
            : `Copiades ${r.creades} ${r.creades === 1 ? 'habitació' : 'habitacions'} de la setmana del ${d}${r.jaHi ? ` (${r.jaHi} ja hi eren)` : ''}.`,
      );
    });

  // Esborrar un dia sempre demana confirmació (diàleg de l'aplicació).
  const [aEsborrar, setAEsborrar] = useState<DiaNeteja | null>(null);

  /** Esborra un dia: el planificat, o el desat al full del dia si no té cap pagament registrat. */
  const esborraDia = async (d: DiaNeteja) => {
    const fetes = d.habitacions.filter((h) => h.origen === 'FETA');
    if (d.habitacions.length === 0 && !d.nota) {
      setDiesBuits((b) => b.filter((x) => x.data !== d.data));
      return;
    }
    const plans = d.habitacions.filter((h) => h.origen === 'PLA');
    const nota = d.nota?.text ?? null;
    await fes(async () => {
      for (const h of fetes) await delJSON(`/api/tasques-neteja/${h.id}`);
      await delJSON(`/api/neteja/planificacio?dia=${d.data}`);
      setDiesBuits((b) => b.filter((x) => x.data !== d.data));
    });
    if (fetes.length === 0) {
      ofereixDesfer(`${nomDia(d.data)} esborrat`, async () => {
        await fes(async () => {
          for (const h of plans) await postJSON('/api/neteja/planificacio', { data: d.data, habitacioId: h.habitacioId, tipus: h.tipus, nota: h.nota, treballadorId: d.treballadorId });
          if (nota) await putJSON('/api/neteja/notes', { data: d.data, ambit: 'DIA', text: nota });
        });
      });
    }
  };

  const afegeixHab = (data: string, habitacioId: string, persona: string | null) =>
    fes(async () => {
      await postJSON('/api/neteja/planificacio', { data, habitacioId, treballadorId: persona || null });
      setDiesBuits((d) => d.filter((x) => x.data !== data));
    });

  if (!dades) return <p className="py-8 text-sm text-slate-500">{error ?? 'Carregant…'}</p>;

  const r = dades.resum;
  const setmanaActual = dillunsDe(avui);

  const targetaDia = (d: DiaNeteja, personaLocal?: string) => {
    const persona = d.treballadorId ?? personaLocal ?? null;
    const lliures = dades.habitacions.filter((h) => !d.habitacions.some((x) => x.habitacioId === h.id));
    const planificat = !d.fet;
    return (
      <div key={d.data} className={cn('relative min-w-0 flex-1 basis-64 px-3 py-2.5', planificat ? 'border border-dashed border-brand-200 bg-brand-50/20' : 'border border-slate-100 bg-white')}>
        <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
          <b className="ui-page-title text-sm text-slate-900">{nomDia(d.data)}</b>
          <span className="text-[11px] text-slate-400">{nomPersona(persona)}</span>
          <span className="ml-auto text-[9.5px] font-bold uppercase tracking-wider">
            {d.fet && d.pendent ? (
              <span className="text-slate-500">Desada · pendent</span>
            ) : d.fet ? (
              d.pagament === 'PAGAT' ? <span className="text-green-700">Feta · pagada</span>
              : d.pagament === 'PER_PAGAR' ? <span className="text-amber-700">Feta · per pagar</span>
              : <span className="text-slate-500">Feta</span>
            ) : (
              <span className="text-brand-700">Planificada</span>
            )}
          </span>
        </div>
        <div className="relative flex flex-wrap gap-1">
          {d.habitacions.map((h) => (
            <span key={h.id} className="relative">
              <Xip h={h} actiu={obert === h.id} onClick={h.origen === 'PLA' ? () => setObert(obert === h.id ? null : h.id) : undefined} />
              {obert === h.id && (
                <EditorHab
                  h={h}
                  dia={d.data}
                  onTanca={() => setObert(null)}
                  onCanvi={async (p) => { setObert(null); await fes(() => patchJSON(`/api/neteja/planificacio/${h.id}`, p)); }}
                  onTreu={async () => {
                    setObert(null);
                    await fes(() => delJSON(`/api/neteja/planificacio/${h.id}`));
                    ofereixDesfer(`Habitació ${h.nom} treta`, () =>
                      fes(() => postJSON('/api/neteja/planificacio', { data: d.data, habitacioId: h.habitacioId, tipus: h.tipus, nota: h.nota, treballadorId: persona })),
                    );
                  }}
                />
              )}
            </span>
          ))}
          {lliures.length > 0 && (
            <Select
              aria-label="Afegir una habitació"
              value=""
              onChange={(e) => e.target.value && afegeixHab(d.data, e.target.value, persona)}
              className="h-6 w-auto border-dashed border-slate-200 py-0 pl-1.5 text-[11px] font-semibold text-slate-400 hover:border-brand-400 hover:text-brand-700"
            >
              <option value="">+ habitació</option>
              {lliures.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nom}
                  {dades.sortides.includes(`${d.data}|${h.id}`) ? ' · surt aquest dia' : ''}
                </option>
              ))}
            </Select>
          )}
        </div>
        {d.habitacions.filter((h) => h.nota).map((h) => (
          <p key={`n-${h.id}`} className="mt-1 text-[12px] text-slate-600">
            <b className="text-brand-700">Hab. {h.nom}:</b> {h.nota}
          </p>
        ))}
        {/* Les accions del dia, en una sola línia discreta. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
          <NotaEditable text={d.nota?.text ?? null} etiqueta="Dia" afegir="observació" onDesa={desaNota(d.data, 'DIA', d.nota?.text ?? null)} className="border-l-2 border-slate-200 pl-2 text-slate-600" />
          <button type="button" onClick={() => onObreDia(d.data, persona)} className="inline-flex items-center gap-1 font-semibold text-slate-400 hover:text-brand-700">
            Full del dia <ExternalLink className="h-3 w-3" />
          </button>
          {d.fet && d.pagament ? (
            <span className="ml-auto inline-flex items-center gap-1 text-slate-300" title="Aquest dia té un pagament registrat: desfés-lo abans d'esborrar-lo (a Neteja o a Treballadors).">
              <Trash2 className="h-3 w-3" /> Amb pagament
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAEsborrar(d)}
              className="ml-auto inline-flex items-center gap-1 text-slate-400 hover:text-red-700"
              title={d.fet ? 'Esborra el dia i les neteges desades' : 'Treu el dia i el que hi ha planificat'}
            >
              <Trash2 className="h-3 w-3" /> Esborrar el dia
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodeEnLinia estat={estat} onChange={setEstat} avui={avui} primerDia="2024-01-01" />
        <span className="ml-auto flex flex-wrap gap-2">
          <Button onClick={() => setNouDia({ data: sumaDies(avui, 1), persona: persona0 })}>
            <CalendarPlus className="h-4 w-4" /> Planificar un dia
          </Button>
          <a href={`/imprimir/neteja?desde=${desde}&fins=${fins}&auto=1`} target="_blank" rel="noreferrer">
            <Button variant="outline"><Printer className="h-4 w-4" /> Imprimir</Button>
          </a>
          <MenuPagaments treballadors={dades.treballadors} />
        </span>
      </div>

      {nouDia && (
        <form
          className="ui-card flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setDiesBuits((d) => [...d.filter((x) => x.data !== nouDia.data), nouDia]);
            const dl = dillunsDe(nouDia.data);
            if (nouDia.data < desde || nouDia.data > fins) setEstat({ tipus: 'per', desde: dl, fins: sumaDies(dl, 27) });
            setNouDia(null);
          }}
        >
          <label className="grid gap-1 text-xs text-slate-500">
            Dia
            <Input type="date" value={nouDia.data} onChange={(e) => setNouDia({ ...nouDia, data: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-xs text-slate-500">
            Qui neteja
            <Select value={nouDia.persona} onChange={(e) => setNouDia({ ...nouDia, persona: e.target.value })}>
              {dades.treballadors.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </Select>
          </label>
          <Button type="submit"><Plus className="h-4 w-4" /> Afegir el dia</Button>
          <Button type="button" variant="ghost" onClick={() => setNouDia(null)}>Cancel·la</Button>
          <p className="w-full text-xs text-slate-500">Després tria les habitacions amb «+ habitació»: les que tenen una sortida aquell dia ja surten com a sortida.</p>
        </form>
      )}

      <div className="ui-card grid grid-cols-2 border border-slate-200 bg-white sm:grid-cols-5">
        {([
          ['Dies de neteja', String(r.dies)],
          ['Sortides', String(r.sortides)],
          ['Manteniments', String(r.manteniments)],
          ['Bugaderia', `${r.bugaderia} ${r.bugaderia === 1 ? 'cop' : 'cops'}`],
          ['Per pagar', formatEur(r.perPagar)],
        ] as const).map(([k, v], i) => (
          <div key={k} className={cn('px-4 py-2.5', i > 0 && 'sm:border-l sm:border-slate-100')}>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{k}</p>
            <p className={cn('ui-page-title mt-0.5 text-lg font-semibold', i === 4 ? 'text-brand-700' : 'text-slate-900')}>{v}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {avis && (
        <p role="status" className="flex items-start gap-2 border border-brand-200 bg-brand-50/50 px-3 py-2 text-sm text-slate-800">
          <span className="flex-1">{avis}</span>
          <button type="button" onClick={() => setAvis(null)} aria-label="Tanca l'avís" className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </p>
      )}

      <div className="ui-card border border-slate-200 bg-white px-4">
        {[...dades.setmanes].reverse().map((s) => {
          const buits = diesBuits
            .filter((b) => b.data >= s.dilluns && b.data <= s.diumenge && !s.dies.some((d) => d.data === b.data))
            .map((b) => ({ dia: { data: b.data, treballadorId: b.persona, habitacions: [], nota: null, fet: false, pendent: false, pagament: null } as DiaNeteja, persona: b.persona }));
          const tots = [...s.dies.map((d) => ({ dia: d, persona: undefined as string | undefined })), ...buits].sort((a, b) => a.dia.data.localeCompare(b.dia.data));
          const futura = s.dilluns >= setmanaActual;
          return (
            <div key={s.dilluns} className="grid gap-2.5 border-b border-slate-100 py-3 last:border-b-0 md:grid-cols-[7rem_minmax(0,1fr)]">
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Setmana</p>
                <p className="text-[13px] font-semibold text-slate-700">{curt(s.dilluns)} – {curt(s.diumenge)}</p>
                {futura && (
                  <button
                    type="button"
                    onClick={() => void repeteix(s.dilluns)}
                    className="mt-1 inline-flex items-center gap-1 text-left text-[11px] font-semibold text-slate-400 hover:text-brand-700"
                    title="Copia les habitacions i els dies de la setmana anterior (o de l'última setmana amb neteja)"
                  >
                    <Copy className="h-3 w-3" /> Repetir la setmana passada
                  </button>
                )}
              </div>
              <div>
                {tots.length === 0 ? (
                  <p className="py-0.5 text-xs text-slate-300">Cap neteja.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">{tots.map((x) => targetaDia(x.dia, x.persona))}</div>
                )}
                {(() => {
                  // «+ dia»: els dies d'aquesta setmana (d'avui endavant) que encara no hi són.
                  const lliures = [0, 1, 2, 3, 4, 5, 6]
                    .map((n) => sumaDies(s.dilluns, n))
                    .filter((d) => d >= avui && !tots.some((x) => x.dia.data === d));
                  if (lliures.length === 0) return null;
                  const persona = tots.find((x) => x.dia.treballadorId)?.dia.treballadorId ?? persona0;
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                      <span className="font-semibold text-slate-400">+ dia</span>
                      {lliures.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDiesBuits((b) => [...b.filter((x) => x.data !== d), { data: d, persona }])}
                          className="h-6 border border-dashed border-slate-200 bg-white px-1.5 font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-700"
                          title="Afegeix aquest dia; després tria les habitacions amb «+ habitació»"
                        >
                          {nomDia(d)}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                <div className="mt-2 flex flex-wrap">
                <NotaEditable
                  text={s.nota?.text ?? null}
                  etiqueta="Setmana"
                  afegir="nota de la setmana"
                  onDesa={desaNota(s.dilluns, 'SETMANA', s.nota?.text ?? null)}
                  className="border border-amber-100 bg-amber-50/70 px-2.5 py-1 text-amber-950"
                />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 bg-brand-700" /> sortida (a fons)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 border border-slate-300 bg-white" /> manteniment</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 border border-green-200 bg-green-50" /> desada al full del dia</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 border-[1.5px] border-dashed border-brand-200 bg-brand-50/30" /> planificada: no compta per pagar fins que es desa al full del dia</span>
      </div>

      <ConfirmDialog
        open={aEsborrar !== null}
        title="Esborrar el dia"
        message={
          aEsborrar
            ? aEsborrar.habitacions.some((h) => h.origen === 'FETA')
              ? `Vols esborrar el ${nomDia(aEsborrar.data)}? També s'esborraran les neteges desades al full del dia. No es pot desfer.`
              : aEsborrar.habitacions.length > 0 || aEsborrar.nota
                ? `Vols esborrar el ${nomDia(aEsborrar.data)} amb les habitacions i l'observació planificades?`
                : `Vols treure el ${nomDia(aEsborrar.data)}?`
            : ''
        }
        confirmLabel="Esborrar el dia"
        onConfirm={() => {
          const d = aEsborrar;
          setAEsborrar(null);
          if (d) void esborraDia(d);
        }}
        onCancel={() => setAEsborrar(null)}
      />

      {desfer && (
        <div role="status" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {desfer.text}
          <button
            type="button"
            className="font-bold text-amber-300 hover:underline"
            onClick={async () => { const a = desfer.accio; setDesfer(null); await a(); }}
          >
            Desfer
          </button>
        </div>
      )}
    </div>
  );
}
