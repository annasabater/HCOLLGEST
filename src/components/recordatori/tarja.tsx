'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Clock, Pencil, Smartphone, X } from 'lucide-react';
import { ApiError, patchJSON } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ACCIO_RECORDATORI_LABELS,
  diesEntre,
  sumaDies,
  textHora,
  textQuan,
  textRepeticio,
  TIPUS_RECORDATORI_LABELS,
  type TipusRecordatori,
} from '@/lib/recordatoris';
import type { RecordatoriVista } from '@/lib/services/recordatoris';
import { EVENT_PREGUNTAR_PRORROGA } from '@/components/dashboard/prorroga-popup';
import { RecordatoriFormulari } from './formulari';
import { nomsEstada } from './tria-estada';

const MESOS = ['GEN', 'FEB', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DES'];
const dcm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const eur = (n: number) => `${n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Per poder obrir el formulari d'edició des de la targeta. */
export interface AvisosRecordatori {
  mobilActiu: boolean;
  calendariConnectat: boolean;
}

/** Data en columna fina: dia gran i mes a sota. Granat si ve, vermell si ja ha passat. */
export function DataTile({ data, vencut, petit, fix }: { data: string; vencut?: boolean; petit?: boolean; fix?: boolean }) {
  return (
    <div className={cn('w-10 shrink-0 text-center leading-none', vencut ? 'text-red-700' : fix ? 'text-blue-700' : 'text-brand-700')}>
      <div className={cn('font-serif font-semibold tabular-nums', petit ? 'text-2xl' : 'text-3xl')}>{data.slice(8, 10)}</div>
      <div className="mt-0.5 text-[10px] font-bold tracking-[0.12em] opacity-80">{MESOS[Number(data.slice(5, 7)) - 1]}</div>
    </div>
  );
}

/** Línia de l'estada: habitació, hostes, quan surt i l'enllaç. */
export function LiniaEstada({ r, avui }: { r: RecordatoriVista; avui: string }) {
  const e = r.estada;
  if (!e) return null;
  const falten = e.sortida ? diesEntre(avui, e.sortida) : null;
  return (
    <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-slate-700">
      <span className="bg-brand-700 px-1.5 py-0.5 text-[11px] font-extrabold text-white">Hab. {e.habitacio ?? '—'}</span>
      <span className="font-semibold">{nomsEstada(e)}</span>
      {e.sortida && falten !== null && (
        <span className="text-slate-500">
          · {falten < 0 ? `va sortir el ${dcm(e.sortida)}` : `surt el ${dcm(e.sortida)}${falten === 0 ? ' (avui)' : falten === 1 ? ' (demà)' : ` (d’aquí ${falten} dies)`}`}
        </span>
      )}
      {r.accio === 'COBRAMENT' && r.import != null && <span className="font-bold text-slate-900">· {eur(r.import)}</span>}
      <Link href={`/estancies/${e.id}`} className="font-semibold text-brand-700 hover:underline">
        Veure l’estada{e.contracte ? ` (${e.contracte})` : ''} →
      </Link>
    </span>
  );
}

/** Recordatori que toca ara: «Fet», «Ajorna…» i, si és d'una estada, l'acció d'aquell dia. */
export function RecordatoriTarja({
  r,
  avui,
  canWrite,
  onCanvi,
  compacte,
  avisos,
}: {
  r: RecordatoriVista;
  avui: string;
  canWrite: boolean;
  onCanvi?: () => void;
  /** Una sola línia (per al tauler). */
  compacte?: boolean;
  /** Si hi és, la targeta té «Editar». */
  avisos?: AvisosRecordatori;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editant, setEditant] = useState(false);
  // Després de «Allarga»: avís amb l'enllaç per ampliar l'estada.
  const [allargat, setAllargat] = useState(false);
  const dies = diesEntre(avui, r.data);
  const vencut = dies < 0;
  const prorroga = r.accio === 'PRORROGA' && !!r.estada;

  // «Ajorna…» (o «Encara no ho sap…») obre les opcions de quants dies.
  const [triaDies, setTriaDies] = useState(false);

  async function envia(body: Record<string, unknown>, quin: string, refresca = true) {
    setBusy(quin);
    setErr(null);
    try {
      await patchJSON(`/api/recordatoris/${r.id}`, body);
      setTriaDies(false);
      if (refresca) {
        onCanvi?.();
        router.refresh();
      }
      return true;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut desar');
      return false;
    } finally {
      setBusy(null);
    }
  }
  const fet = () => envia({ accio: 'FET' }, 'FET');
  const ajorna = (n: number) => envia({ accio: 'AJORNA', dies: n }, 'AJORNA');
  async function allarga() {
    if (await envia({ accio: 'RESPOSTA', resposta: 'SI' }, 'SI', false)) setAllargat(true);
  }

  /** Missatge de sortida: al tauler obre el compositor d'«Estades en curs»; si no, hi porta. */
  function missatgeSortida() {
    if (!r.estada) return;
    if (compacte) {
      window.dispatchEvent(new CustomEvent(EVENT_PREGUNTAR_PRORROGA, { detail: { id: r.estada.id, missatge: 'sortida' } }));
    } else {
      router.push(`/?missatge=sortida&estada=${r.estada.id}`);
    }
  }

  const triaDiesUI = (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Recorda-m’ho d’aquí a">
      <span className="text-xs font-semibold text-slate-500">{prorroga ? 'Encara no ho sap · recorda-m’ho en:' : 'Recorda-m’ho en:'}</span>
      {[
        [1, '1 dia'],
        [2, '2 dies'],
        [3, '3 dies'],
        [4, '4 dies'],
        [5, '5 dies'],
        [7, '1 setmana'],
        [14, '2 setmanes'],
        [30, '1 mes'],
      ].map(([n, t]) => (
        <Button key={n} size="sm" variant="outline" disabled={busy !== null} onClick={() => ajorna(Number(n))}>
          {t}
        </Button>
      ))}
      <label className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
        o el dia
        <input
          type="date"
          min={sumaDies(avui, 1)}
          disabled={busy !== null}
          onChange={(ev) => {
            const d = ev.target.value;
            const n = d ? diesEntre(avui, d) : 0;
            if (n >= 1 && n <= 365) ajorna(n);
          }}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
          aria-label="Recorda-m’ho el dia"
        />
      </label>
      <Button size="sm" variant="ghost" onClick={() => setTriaDies(false)} aria-label="Cancel·la">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  const btnFet = (mida: 'sm' | 'md') => (
    <Button size={mida} onClick={fet} disabled={busy !== null} className="bg-emerald-700 hover:bg-emerald-800">
      <Check className="h-4 w-4" /> {busy === 'FET' ? 'Desant…' : 'Fet'}
    </Button>
  );
  const btnAjorna = (mida: 'sm' | 'md') => (
    <Button size={mida} variant="outline" onClick={() => setTriaDies(true)} disabled={busy !== null}>
      <Clock className="h-4 w-4" /> {busy === 'AJORNA' ? 'Desant…' : 'Ajorna…'}
    </Button>
  );
  const btnEdita = avisos ? (
    <Button size="sm" variant="ghost" onClick={() => setEditant(true)} aria-label={`Editar ${r.titol}`} title="Editar">
      <Pencil className="h-4 w-4" />
    </Button>
  ) : null;

  const botons = (mida: 'sm' | 'md') => {
    if (triaDies) return triaDiesUI;
    if (allargat && r.estada) {
      return (
        <div className="flex flex-wrap items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-900">
          <Check className="h-4 w-4" /> Apuntat a la pròrroga: allarga.
          <Link href={`/estancies/${r.estada.id}`} className="bg-brand-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-800">
            Ampliar estada
          </Link>
          <button type="button" onClick={() => { onCanvi?.(); router.refresh(); }} className="text-xs font-semibold underline">
            D’acord
          </button>
        </div>
      );
    }
    if (prorroga) {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-slate-700">Què t’ha dit?</span>
          <Button size={mida} onClick={allarga} disabled={busy !== null} className="bg-emerald-700 hover:bg-emerald-800">
            <Check className="h-4 w-4" /> {busy === 'SI' ? 'Desant…' : 'Allarga'}
          </Button>
          <Button size={mida} variant="outline" onClick={() => envia({ accio: 'RESPOSTA', resposta: 'NO' }, 'NO')} disabled={busy !== null}>
            {busy === 'NO' ? 'Desant…' : `Marxa${r.estada?.sortida ? ` el ${dcm(r.estada.sortida)}` : ''}`}
          </Button>
          <Button size={mida} variant="ghost" onClick={() => setTriaDies(true)} disabled={busy !== null}>
            Encara no ho sap…
          </Button>
          {btnEdita}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {r.accio === 'COBRAMENT' && r.estada && (
          <Link href={`/estancies/${r.estada.id}`} className="inline-flex h-9 items-center border border-brand-700 bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800">
            Registrar el pagament
          </Link>
        )}
        {r.accio === 'SORTIDA' && r.estada && (
          <Button size={mida} onClick={missatgeSortida} disabled={busy !== null}>
            Escriure el missatge de sortida
          </Button>
        )}
        {r.accio === 'FACTURA' && r.estada && (
          <Link href={`/estancies/${r.estada.id}`} className="inline-flex h-9 items-center border border-brand-700 bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800">
            Fer la factura
          </Link>
        )}
        {btnFet(mida)}
        {btnAjorna(mida)}
        {btnEdita}
      </div>
    );
  };

  const formulari =
    editant && avisos ? (
      <RecordatoriFormulari
        inicial={r}
        mobilActiu={avisos.mobilActiu}
        calendariConnectat={avisos.calendariConnectat}
        onTanca={() => setEditant(false)}
        onDesat={() => {
          setEditant(false);
          onCanvi?.();
          router.refresh();
        }}
      />
    ) : null;

  const etiquetaTipus = r.estada
    ? (r.accio ? ACCIO_RECORDATORI_LABELS[r.accio] : 'Estada')
    : (TIPUS_RECORDATORI_LABELS[r.tipus as TipusRecordatori] ?? r.tipus);

  if (compacte) {
    const dd = r.data.slice(8, 10);
    const mes = MESOS[Number(r.data.slice(5, 7)) - 1];
    return (
      <article className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-xs font-extrabold text-white',
            vencut ? 'bg-red-700' : 'bg-amber-700',
          )}
        >
          {dd} {mes}
        </span>
        <div className="flex min-w-0 flex-[1_1_14rem] flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-900">{r.titol}</span>
          <span className={cn('text-xs font-bold', vencut ? 'text-red-800' : 'text-amber-900')}>
            {dies === 0 ? 'Avui' : textQuan(dies).replace(/^./, (c) => c.toUpperCase())}
          </span>
          {!r.estada && <span className="text-xs text-stone-500">· {etiquetaTipus}</span>}
          {r.whatsapp && r.hora && (
            <span className="inline-flex items-center gap-0.5 text-xs text-emerald-800">
              <Smartphone className="h-3 w-3" /> {textHora(r.hora)}
            </span>
          )}
          <LiniaEstada r={r} avui={avui} />
          {r.notes && <span className="w-full truncate text-xs text-slate-500">{r.notes}</span>}
          {err && <span className="w-full text-xs text-red-600">{err}</span>}
        </div>
        {canWrite && botons('sm')}
        {formulari}
      </article>
    );
  }

  return (
    <article className={cn('flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:gap-5', r.fix && 'border-l-4 border-l-blue-600')}>
      <DataTile data={r.data} vencut={vencut} fix={r.fix} />
      <div className="min-w-0 flex-[1_1_16rem] space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {r.fix && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800">Fix</span>}
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-bold',
              vencut ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900',
            )}
          >
            {dies === 0 ? 'Avui' : textQuan(dies).replace(/^./, (c) => c.toUpperCase())}
          </span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', r.estada ? 'bg-blue-50 text-blue-900' : 'bg-stone-100 text-stone-600')}>
            {etiquetaTipus}
            {!prorroga && ` · ${textRepeticio(r.repeticioCada, r.repeticioUnitat).toLowerCase()}`}
          </span>
          {r.ajornaments > 0 && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
              ajornat {r.ajornaments === 1 ? '1 cop' : `${r.ajornaments} cops`}
            </span>
          )}
          {r.whatsapp && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <Smartphone className="h-3 w-3" /> Mòbil{r.hora ? ` ${textHora(r.hora)}` : ''}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-900">{r.titol}</h3>
        <LiniaEstada r={r} avui={avui} />
        {r.notes && <p className="text-sm text-slate-600">{r.notes}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
      {canWrite && botons('md')}
      {formulari}
    </article>
  );
}
