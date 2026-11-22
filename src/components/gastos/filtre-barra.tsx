'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Search, Star, Trash2, X } from 'lucide-react';
import { Eur } from '@/components/finances/amounts-visibility';
import { cn, formatDate } from '@/lib/utils';
import {
  etiquetaFiltre,
  mateixFiltre,
  suggeriments,
  type DespesaFiltrable,
  type FiltreDespesa,
  type ModeComparacio,
  type Suggeriment,
} from '@/lib/filtre-despeses';

export interface ConsultaDesada {
  id: string;
  nom: string;
  filtres: FiltreDespesa[];
  comparacio: string;
}

/** Tanca el desplegable en clicar fora o prémer Esc. */
function useTancaFora(obert: boolean, tanca: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!obert) return;
    const clic = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) tanca(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') tanca(); };
    document.addEventListener('mousedown', clic);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', clic); document.removeEventListener('keydown', tecla); };
  }, [obert, tanca]);
  return ref;
}

const panell = 'absolute z-30 mt-1 w-full min-w-[16rem] border border-slate-300 bg-white py-1 shadow-lg ui-card';
const opcio = 'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none';
const titolGrup = 'px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500';

const ETIQUETA_MODE: Record<ModeComparacio, string> = {
  CAP: 'Compara',
  ANTERIOR: 'vs període anterior',
  ANY_PASSAT: 'vs l’any passat',
  RANG: 'vs un altre rang',
};

export function FiltreBarra({
  filtres,
  onFiltres,
  comparacio,
  onComparacio,
  rangComparat,
  rangAMa,
  onRangAMa,
  gastosPeriode,
  proveidors,
  categories,
  consultes,
  consultaActiva,
  onAplicaConsulta,
  onDesaConsulta,
  onEsborraConsulta,
  onTreuTot,
  canWrite,
  className,
}: {
  filtres: FiltreDespesa[];
  onFiltres: (f: FiltreDespesa[]) => void;
  comparacio: ModeComparacio;
  onComparacio: (m: ModeComparacio) => void;
  /** El rang amb què es compara ara (per mostrar-lo al desplegable). */
  rangComparat: { desde: string; fins: string } | null;
  rangAMa: { desde: string; fins: string };
  onRangAMa: (r: { desde: string; fins: string }) => void;
  gastosPeriode: DespesaFiltrable[];
  proveidors: { id: string; nom: string }[];
  categories: { nom: string }[];
  consultes: ConsultaDesada[];
  consultaActiva: string | null;
  onAplicaConsulta: (c: ConsultaDesada) => void;
  onDesaConsulta: (nom: string) => Promise<void>;
  onEsborraConsulta: (c: ConsultaDesada) => Promise<void>;
  onTreuTot: () => void;
  canWrite: boolean;
  className?: string;
}) {
  const [text, setText] = useState('');
  const [obert, setObert] = useState<'cerca' | 'compara' | 'consultes' | null>(null);
  const tanca = () => setObert(null);
  const refCerca = useTancaFora(obert === 'cerca', tanca);
  const refCompara = useTancaFora(obert === 'compara', tanca);
  const refConsultes = useTancaFora(obert === 'consultes', tanca);
  const inputRef = useRef<HTMLInputElement>(null);

  const [nomNova, setNomNova] = useState('');
  const [desant, setDesant] = useState(false);
  const [errConsulta, setErrConsulta] = useState<string | null>(null);

  const sug = suggeriments(text, gastosPeriode, proveidors, categories, filtres);
  const hiHaFiltre = filtres.length > 0 || comparacio !== 'CAP';
  const nomActiva = consultes.find((c) => c.id === consultaActiva)?.nom;

  function afegeix(f: FiltreDespesa) {
    if (!filtres.some((x) => mateixFiltre(x, f))) onFiltres([...filtres, f]);
    setText('');
    inputRef.current?.focus();
  }
  function afegeixText() {
    const t = text.trim();
    if (t) afegeix({ tipus: 'TEXT', text: t });
  }

  const filaSuggeriment = (s: Suggeriment) => (
    <button key={etiquetaFiltre(s.filtre) + s.filtre.tipus} type="button" className={opcio} onClick={() => afegeix(s.filtre)}>
      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{etiquetaFiltre(s.filtre)}</span>
      {s.n > 0 ? (
        <span className="shrink-0 text-xs text-slate-500">
          {s.n} · <Eur value={s.import} />
        </span>
      ) : (
        <span className="shrink-0 text-xs text-slate-400">res aquest període</span>
      )}
    </button>
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Què vols mirar: cercador amb els filtres triats com a etiquetes. */}
      <div ref={refCerca} className="relative min-w-[16rem] flex-[1_1_22rem]">
        <div
          className={cn(
            'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1 ui-card',
            obert === 'cerca' ? 'border-brand-600 ring-1 ring-brand-600' : 'border-slate-300',
          )}
          onClick={() => { setObert('cerca'); inputRef.current?.focus(); }}
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          {filtres.map((f) => (
            <span key={f.tipus + etiquetaFiltre(f)} className="inline-flex h-7 items-center gap-1 rounded bg-brand-50 pl-2 pr-1 text-xs font-bold text-brand-800">
              {f.tipus === 'CATEGORIA' && <span className="font-normal text-brand-700/70">Categoria:</span>}
              {etiquetaFiltre(f)}
              <button
                type="button"
                aria-label={`Treure ${etiquetaFiltre(f)}`}
                onClick={(e) => { e.stopPropagation(); onFiltres(filtres.filter((x) => !mateixFiltre(x, f))); }}
                className="rounded p-1 hover:bg-brand-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setObert('cerca'); }}
            onFocus={() => setObert('cerca')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); afegeixText(); }
              if (e.key === 'Backspace' && !text && filtres.length) onFiltres(filtres.slice(0, -1));
            }}
            aria-label="Què vols mirar"
            placeholder={filtres.length ? 'Afegeix-ne un altre…' : 'Proveïdor, categoria o paraula…'}
            className="h-8 min-w-[8rem] flex-1 border-0 bg-transparent text-sm outline-none"
          />
        </div>
        {obert === 'cerca' && (
          <div className={cn(panell, 'max-h-96 overflow-y-auto')} role="listbox" aria-label="Suggeriments">
            {sug.categories.length > 0 && (
              <>
                <p className={titolGrup}>{text ? 'Categories' : 'Categories d’aquest període'}</p>
                {sug.categories.map(filaSuggeriment)}
              </>
            )}
            {sug.proveidors.length > 0 && (
              <>
                <p className={cn(titolGrup, sug.categories.length > 0 && 'border-t border-slate-100')}>{text ? 'Proveïdors' : 'Proveïdors d’aquest període'}</p>
                {sug.proveidors.map(filaSuggeriment)}
              </>
            )}
            {text.trim() && (
              <>
                <p className={cn(titolGrup, 'border-t border-slate-100')}>Paraula</p>
                <button type="button" className={opcio} onClick={afegeixText}>
                  <span className="flex-1">Cerca «<b>{text.trim()}</b>» a les descripcions</span>
                </button>
              </>
            )}
            {!text && sug.categories.length === 0 && sug.proveidors.length === 0 && (
              <p className="px-3 py-3 text-sm text-slate-500">Escriu el nom d’un proveïdor, d’una categoria o una paraula.</p>
            )}
          </div>
        )}
      </div>

      {/* Compara amb… */}
      <div ref={refCompara} className="relative">
        <button
          type="button"
          aria-expanded={obert === 'compara'}
          onClick={() => setObert(obert === 'compara' ? null : 'compara')}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold ui-card',
            comparacio === 'CAP' ? 'border-slate-300 bg-white text-slate-700' : 'border-amber-600 bg-amber-50 text-amber-900',
          )}
        >
          {ETIQUETA_MODE[comparacio]} <ChevronDown className="h-4 w-4" />
        </button>
        {obert === 'compara' && (
          <div className={cn(panell, 'right-0 w-72')}>
            {(['CAP', 'ANTERIOR', 'ANY_PASSAT', 'RANG'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={cn(opcio, 'flex-col items-start gap-0.5', comparacio === m && 'bg-amber-50 font-bold')}
                onClick={() => { onComparacio(m); if (m !== 'RANG') tanca(); }}
              >
                <span>{m === 'CAP' ? 'No comparis' : m === 'ANTERIOR' ? 'El període anterior' : m === 'ANY_PASSAT' ? 'El mateix de l’any passat' : 'Un altre rang…'}{comparacio === m ? ' ✓' : ''}</span>
                {comparacio === m && m !== 'CAP' && m !== 'RANG' && rangComparat && (
                  <span className="text-xs font-normal text-slate-500">{formatDate(rangComparat.desde)} – {formatDate(rangComparat.fins)}</span>
                )}
              </button>
            ))}
            {comparacio === 'RANG' && (
              <div className="grid gap-2 border-t border-slate-100 px-3 py-3 text-sm text-slate-600">
                <label className="flex items-center justify-between gap-2">
                  Des de
                  <input type="date" value={rangAMa.desde} onChange={(e) => onRangAMa({ ...rangAMa, desde: e.target.value })} className="h-9 rounded border border-slate-300 px-2 text-sm" />
                </label>
                <label className="flex items-center justify-between gap-2">
                  Fins a
                  <input type="date" value={rangAMa.fins} onChange={(e) => onRangAMa({ ...rangAMa, fins: e.target.value })} className="h-9 rounded border border-slate-300 px-2 text-sm" />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Les meves consultes */}
      <div ref={refConsultes} className="relative">
        <button
          type="button"
          aria-expanded={obert === 'consultes'}
          aria-label="Les meves consultes"
          onClick={() => { setObert(obert === 'consultes' ? null : 'consultes'); setErrConsulta(null); }}
          className="inline-flex h-10 max-w-[14rem] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 ui-card"
        >
          <Star className={cn('h-4 w-4 shrink-0', nomActiva ? 'fill-amber-500 text-amber-500' : 'text-slate-400')} />
          {nomActiva && <span className="truncate">{nomActiva}</span>}
          <ChevronDown className="h-4 w-4 shrink-0" />
        </button>
        {obert === 'consultes' && (
          <div className={cn(panell, 'right-0 w-72')}>
            <p className={titolGrup}>Les meves consultes</p>
            {consultes.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">Encara no n’has desat cap.</p>}
            {consultes.map((c) => (
              <div key={c.id} className={cn('flex items-center', consultaActiva === c.id && 'bg-brand-50')}>
                <button type="button" className={cn(opcio, 'flex-1', consultaActiva === c.id && 'font-bold')} onClick={() => { onAplicaConsulta(c); tanca(); }}>
                  {c.nom}{consultaActiva === c.id ? ' ✓' : ''}
                </button>
                {canWrite && (
                  <button
                    type="button"
                    aria-label={`Esborrar la consulta ${c.nom}`}
                    onClick={() => void onEsborraConsulta(c)}
                    className="mr-1 rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {canWrite && (
              <form
                className="border-t border-slate-100 px-3 py-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!filtres.length) { setErrConsulta('Tria primer què vols mirar.'); return; }
                  if (!nomNova.trim()) { setErrConsulta('Posa-li un nom.'); return; }
                  setDesant(true); setErrConsulta(null);
                  try { await onDesaConsulta(nomNova.trim()); setNomNova(''); tanca(); }
                  catch (err) { setErrConsulta(err instanceof Error ? err.message : 'No s’ha pogut desar'); }
                  finally { setDesant(false); }
                }}
              >
                <p className="mb-1.5 text-sm font-bold text-brand-700">+ Desa el que estic mirant</p>
                <div className="flex gap-2">
                  <input
                    value={nomNova}
                    onChange={(e) => setNomNova(e.target.value)}
                    placeholder={filtres.length ? filtres.map(etiquetaFiltre).join(' + ').slice(0, 40) : 'Nom (p. ex. Aigua)'}
                    aria-label="Nom de la consulta"
                    className="h-9 min-w-0 flex-1 rounded border border-slate-300 px-2 text-sm"
                  />
                  <button type="submit" disabled={desant} className="h-9 rounded bg-brand-700 px-3 text-sm font-semibold text-white disabled:opacity-60">
                    {desant ? '…' : 'Desa'}
                  </button>
                </div>
                {errConsulta && <p className="mt-1.5 text-xs text-red-600">{errConsulta}</p>}
              </form>
            )}
          </div>
        )}
      </div>

      {hiHaFiltre && (
        <button type="button" onClick={() => { setText(''); onTreuTot(); }} className="h-10 whitespace-nowrap px-2 text-sm font-semibold text-brand-700 hover:underline">
          Treu els filtres
        </button>
      )}
    </div>
  );
}

/** Una línia amb el resultat del filtre: total, diferència i el botó del gràfic. */
export function ResultatFiltre({
  total,
  n,
  fiances,
  comparat,
  etiquetaComparat,
  grafic,
  graficObert,
  onGrafic,
}: {
  total: number;
  n: number;
  fiances: number;
  comparat: { total: number; diff: number; pct: number | null } | null;
  etiquetaComparat: string;
  grafic: ReactNode;
  graficObert: boolean;
  onGrafic: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm">
        <span>
          <span className="ui-page-title text-xl font-bold text-slate-900"><Eur value={total} /></span>
          <span className="text-slate-500"> en {n} {n === 1 ? 'despesa' : 'despeses'}</span>
        </span>
        {comparat && (
          <>
            <span className={cn('font-bold', comparat.diff > 0 ? 'text-red-700' : comparat.diff < 0 ? 'text-emerald-700' : 'text-slate-600')}>
              {comparat.diff > 0 ? '▲ ' : comparat.diff < 0 ? '▼ ' : '= '}
              <Eur value={Math.abs(comparat.diff)} />
              {comparat.pct != null && ` (${comparat.pct > 0 ? '+' : ''}${comparat.pct.toLocaleString('ca-ES')} %)`}
              {comparat.diff > 0 ? ' més' : comparat.diff < 0 ? ' menys' : ''}
            </span>
            <span className="text-slate-500">
              que <Eur value={comparat.total} /> {etiquetaComparat}
            </span>
          </>
        )}
        {fiances > 0 && (
          <span className="text-amber-700">Fiances a part: <Eur value={fiances} /></span>
        )}
        <button type="button" onClick={onGrafic} className="ml-auto text-sm font-semibold text-brand-700 hover:underline">
          {graficObert ? 'Amaga el gràfic ▴' : 'Mostra el gràfic ▾'}
        </button>
      </div>
      {graficObert && <div className="border-t border-slate-100 px-4 py-3">{grafic}</div>}
    </div>
  );
}
