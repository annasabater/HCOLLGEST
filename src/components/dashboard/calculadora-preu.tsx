'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, BedDouble, Check, X, Repeat, FilePlus2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { getJSON, postJSON, ApiError } from '@/lib/api';
import { liniesPressupost, liniesPressupostTrams, isoMesDies, type TramPla } from '@/lib/pressupost-calcul';
import { formatEur } from '@/lib/utils';
import { GRUP_TARIFA, GRUP_TARIFA_LABELS, type GrupTarifa } from '@/lib/validation/tarifa-tipus';

interface Linia { concepte: string; quantitat: number; preuUnitat: number; subtotal: number }
interface Segment { etiqueta: string; desde: string; fins: string; nits: number; linies: Linia[]; subtotal: number }
interface Disponibilitat {
  tipus: string;
  lliures: number;
  total: number;
  habitacions: { nom: string; lliure: boolean; ocupadaPer: string | null }[];
  pla: TramPla[] | null;
}
interface Resultat {
  ok: boolean;
  error?: string;
  nits: number;
  grup: GrupTarifa;
  grupUsat: GrupTarifa;
  temporades: { id: string; etiqueta: string }[];
  temporadaForcada: string | null;
  segments: Segment[];
  total: number;
  nota: string | null;
  disponibilitat: Disponibilitat | null;
}

// Un tram = uns dies en un tipus d'habitació. L'entrada del primer és la de
// l'estada; la de cada tram següent és la sortida de l'anterior.
interface Tram { key: number; sortida: string; grup: GrupTarifa; observacio: string }
interface TramCalculat { entrada: string; sortida: string; grup: GrupTarifa; observacio: string; res: Resultat }
type Mode = 'auto' | 'nits' | 'mensual';

const NITS_MES = 30;

function avui(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function fmt(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' });
}
function nitsEntre(desde: string, fins: string): number {
  if (!desde || !fins) return 0;
  return Math.round((Date.parse(`${fins}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}
const nitsTxt = (n: number) => `${n} ${n === 1 ? 'nit' : 'nits'}`;

let seq = 1;

export function CalculadoraPreu({ potFerPressupost = false }: { potFerPressupost?: boolean }) {
  const router = useRouter();
  const [creant, setCreant] = useState(false);
  const [entrada, setEntrada] = useState(avui());
  const [trams, setTrams] = useState<Tram[]>([{ key: 0, sortida: avui(1), grup: 'DOBLE', observacio: '' }]);
  const [mode, setMode] = useState<Mode>('auto');
  const [res, setRes] = useState<TramCalculat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entradaDe = (k: number) => (k === 0 ? entrada : trams[k - 1]!.sortida);
  const nitsTotal = nitsEntre(entrada, trams[trams.length - 1]!.sortida);
  const mensual = mode === 'auto' ? nitsTotal >= NITS_MES : mode === 'mensual';

  function canvia(fn: () => void) {
    fn();
    setRes(null);
  }
  function setTram(k: number, patch: Partial<Tram>) {
    canvia(() => setTrams((ts) => ts.map((t, i) => (i === k ? { ...t, ...patch } : t))));
  }
  function afegirTram() {
    const ultim = trams[trams.length - 1]!;
    canvia(() => setTrams((ts) => [...ts, { key: seq++, sortida: isoMesDies(ultim.sortida, 7), grup: ultim.grup === 'INDIVIDUAL' ? 'DOBLE' : 'INDIVIDUAL', observacio: '' }]));
  }
  function treureTram(k: number) {
    canvia(() => setTrams((ts) => ts.filter((_, i) => i !== k)));
  }

  async function calcular() {
    setError(null);
    for (let k = 0; k < trams.length; k++) {
      if (nitsEntre(entradaDe(k), trams[k]!.sortida) <= 0) {
        setError(trams.length > 1 ? `Al tram ${k + 1}, la sortida ha de ser posterior a l'entrada` : 'La data de sortida ha de ser posterior a la d\'entrada');
        setRes(null);
        return;
      }
    }
    setLoading(true);
    try {
      // La temporada SEMPRE surt de les dates (partint per temporada si l'estada
      // creua mesos). El preu de mes es decideix per l'estada SENCERA, no per tram.
      const calculats = await Promise.all(trams.map(async (t, k) => {
        const p = new URLSearchParams({ grup: t.grup, entrada: entradaDe(k), sortida: t.sortida, mensual: mensual ? '1' : '0', nitsEstada: String(nitsTotal) });
        const r = await getJSON<Resultat>(`/api/tarifes-tipus/calcular?${p.toString()}`);
        return { entrada: entradaDe(k), sortida: t.sortida, grup: t.grup, observacio: t.observacio, res: r };
      }));
      const ko = calculats.find((c) => !c.res.ok);
      if (ko) { setError(ko.res.error ?? 'No s\'ha pogut calcular'); setRes(null); }
      else setRes(calculats);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error calculant el preu');
    } finally {
      setLoading(false);
    }
  }

  const total = res ? Math.round(res.reduce((a, c) => a + c.res.total, 0) * 100) / 100 : 0;
  const detallDe = (c: TramCalculat) => (mensual ? [...new Set(c.res.segments.flatMap((s) => s.linies.map((l) => l.concepte)))].join(' + ') : undefined);

  // Crea un pressupost amb aquest preu i hi entra. Amb un sol tram, com sempre
  // (amb el canvi d'habitació proposat, si n'hi ha); amb trams, una línia per tram.
  async function ferPressupost() {
    if (!res) return;
    setCreant(true);
    setError(null);
    try {
      if (res.length === 1) {
        const c = res[0]!;
        const pla = c.res.disponibilitat?.pla ?? null;
        const dades = liniesPressupost({
          tipus: GRUP_TARIFA_LABELS[c.grup], entrada: c.entrada, sortida: c.sortida, nits: c.res.nits, total: c.res.total,
          segments: c.res.segments, pla, mostrarCanvi: true,
        });
        dades.notes = [dades.notes, c.observacio.trim()].filter(Boolean).join('\n');
        const r = await postJSON<{ id: string }>('/api/pressupostos', dades);
        const q = pla ? `?${new URLSearchParams({ grup: c.grup, entrada: c.entrada, sortida: c.sortida, canvi: '1' }).toString()}` : '';
        router.push(`/pressupostos/${r.id}${q}`);
      } else {
        const dades = liniesPressupostTrams(res.map((c) => ({
          tipus: GRUP_TARIFA_LABELS[c.grup], entrada: c.entrada, sortida: c.sortida, nits: c.res.nits,
          total: c.res.total, detall: detallDe(c), observacio: c.observacio,
        })));
        const r = await postJSON<{ id: string }>('/api/pressupostos', dades);
        router.push(`/pressupostos/${r.id}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut crear el pressupost');
      setCreant(false);
    }
  }

  const varisTrams = trams.length > 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-brand-600" />
          <h3 className="font-serif text-lg font-semibold text-slate-800">Calculadora de preus</h3>
        </div>
        <div role="group" aria-label="Tipus de càlcul" className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {([['nits', 'Per nits'], ['mensual', 'Preu mensual (regla de 3)']] as const).map(([m, label]) => {
            const actiu = m === 'mensual' ? mensual : !mensual;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={actiu}
                onClick={() => canvia(() => setMode(m))}
                className={`min-h-10 rounded-md px-3 text-sm ${actiu ? 'bg-brand-700 font-medium text-white' : 'text-slate-600 hover:text-slate-800'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        {mode === 'auto'
          ? 'El preu mensual (preu del mes ÷ 30 × nits) s’activa sol quan l’estada arriba a 30 nits, encara que cada tram sigui més curt. També el pots posar o treure a mà (p. ex. si allarga una estada d’un mes).'
          : <>Posat a mà. <button type="button" className="text-brand-700 underline" onClick={() => canvia(() => setMode('auto'))}>Tornar a automàtic</button></>}
      </p>

      <div className="space-y-2">
        {trams.map((t, k) => (
          <div key={t.key} className={varisTrams ? 'rounded-xl border border-slate-200 p-3' : ''}>
            {varisTrams && (
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">Tram {k + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => treureTram(k)} aria-label={`Treure el tram ${k + 1}`}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className={`grid gap-3 ${varisTrams ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">Entrada</span>
                {k === 0
                  ? <Input type="date" value={entrada} onChange={(e) => canvia(() => setEntrada(e.target.value))} />
                  : <Input type="date" value={entradaDe(k)} disabled title="És la sortida del tram anterior" />}
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">Sortida</span>
                <Input type="date" value={t.sortida} onChange={(e) => setTram(k, { sortida: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">Habitació</span>
                <Select value={t.grup} onChange={(e) => setTram(k, { grup: e.target.value as GrupTarifa })}>
                  {GRUP_TARIFA.map((g) => <option key={g} value={g}>{GRUP_TARIFA_LABELS[g]}</option>)}
                </Select>
              </label>
              {!varisTrams && (
                <div className="flex items-end">
                  <Button className="w-full" onClick={() => calcular()} disabled={loading}>
                    {loading ? 'Calculant…' : 'Calcular'}
                  </Button>
                </div>
              )}
            </div>
            <label className="mt-2 block text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">Observacions{potFerPressupost ? ' (surten al pressupost)' : ''}</span>
              <Input value={t.observacio} placeholder="Opcional" onChange={(e) => setTram(k, { observacio: e.target.value })} />
            </label>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="flex-1 border-dashed" onClick={afegirTram}>
            <Plus className="h-4 w-4" /> Afegir canvi d&apos;habitació
          </Button>
          {varisTrams && (
            <Button className="flex-1 sm:flex-none sm:px-10" onClick={() => calcular()} disabled={loading}>
              {loading ? 'Calculant…' : 'Calcular'}
            </Button>
          )}
        </div>
        {varisTrams && <p className="text-xs text-slate-500">L&apos;entrada de cada tram es posa sola amb la sortida de l&apos;anterior.</p>}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {res && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Preu */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-500">{nitsTxt(nitsTotal)}</span>
              {mensual
                ? <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">Llarga estada · preu mensual</span>
                : res.length === 1 && res[0]!.res.segments.length === 1 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600" title="Temporada segons les dates">
                    {res[0]!.res.segments[0]!.etiqueta}
                  </span>
                )}
            </div>

            {res.map((c, k) => {
              const multiSeg = c.res.segments.length > 1;
              return (
                <div key={k} className={varisTrams || multiSeg ? 'mb-2 rounded-lg bg-slate-50 p-2' : ''}>
                  {varisTrams && (
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className="font-medium text-brand-700">Tram {k + 1} · {GRUP_TARIFA_LABELS[c.grup]}</span>
                      <span className="text-slate-400">Del {fmt(c.entrada)} al {fmt(c.sortida)} · {nitsTxt(c.res.nits)}</span>
                    </div>
                  )}
                  {c.res.segments.map((s, si) => (
                    <div key={si}>
                      {multiSeg && (
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-slate-600">{s.etiqueta}</span>
                          <span className="text-slate-400">Del {fmt(s.desde)} al {fmt(s.fins)} · {nitsTxt(s.nits)}</span>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            {s.linies.map((l, i) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0">
                                <td className="py-1.5 text-slate-700">{l.concepte}</td>
                                <td className="py-1.5 text-center text-slate-400">×{l.quantitat}</td>
                                <td className="py-1.5 text-right text-slate-500">{formatEur(l.preuUnitat)}</td>
                                <td className="py-1.5 text-right font-medium text-slate-800">{formatEur(l.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  {c.observacio.trim() && <p className="mt-1 text-xs italic text-slate-500">{c.observacio.trim()}</p>}
                  {(varisTrams || multiSeg) && (
                    <div className="mt-1 text-right text-xs text-slate-500">Subtotal: <strong>{formatEur(c.res.total)}</strong></div>
                  )}
                  {c.res.grupUsat !== c.res.grup && <p className="mt-1 text-xs text-amber-700">Aplicant tarifa d&apos;Habitació Doble.</p>}
                </div>
              );
            })}

            <div className="mt-2 flex items-center justify-between border-t-2 border-brand-700 pt-2">
              <span className="font-serif text-base text-slate-800">Total</span>
              <span className="text-xl font-bold text-brand-800">{formatEur(total)}</span>
            </div>
            {mensual && <p className="mt-1 text-xs text-slate-500">Regla de 3: cada nit al preu del bloc més gran que hi cap (mes ÷ 30, 2 setmanes ÷ 14 o setmana ÷ 7) de la seva habitació i temporada, sense arrodonir: només s&apos;arrodoneix el total al cèntim.</p>}
            {[...new Set(res.map((c) => c.res.nota).filter(Boolean))].map((n) => <p key={n} className="mt-1 text-xs text-slate-400">{n}</p>)}
          </div>

          {/* Disponibilitat */}
          <div className="rounded-xl border border-slate-200 p-4">
            {varisTrams ? (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Disponibilitat per tram</span>
                </div>
                <div className="space-y-2">
                  {res.map((c, k) => c.res.disponibilitat && (
                    <details key={k} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                        <span>Tram {k + 1} · {c.res.disponibilitat.tipus} · {fmt(c.entrada)}–{fmt(c.sortida)}</span>
                        <ResumLliures d={c.res.disponibilitat} />
                      </summary>
                      <div className="mt-2"><Disponibilitat d={c.res.disponibilitat} /></div>
                    </details>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Toca un tram per veure les habitacions.</p>
              </>
            ) : res[0]!.res.disponibilitat && (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">
                    Disponibilitat {res[0]!.res.disponibilitat.tipus} · <ResumLliures d={res[0]!.res.disponibilitat} />
                  </span>
                </div>
                <Disponibilitat d={res[0]!.res.disponibilitat} />
              </>
            )}
          </div>

          {potFerPressupost && (
            <div className="lg:col-span-2">
              <Button variant="outline" className="w-full" onClick={ferPressupost} disabled={creant}>
                <FilePlus2 className="h-4 w-4" /> {creant ? 'Creant…' : 'Fer pressupost amb aquest preu'}
              </Button>
              {res.some((c) => c.res.disponibilitat && c.res.disponibilitat.lliures === 0 && !c.res.disponibilitat.pla) && (
                <p className="mt-1 text-center text-xs text-amber-700">No hi ha disponibilitat per a aquestes dates, però el pressupost es pot fer igualment.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResumLliures({ d }: { d: Disponibilitat }) {
  return (
    <span className={d.lliures > 0 ? 'text-green-600' : d.pla ? 'text-amber-700' : 'text-red-600'}>
      {d.lliures} de {d.total} lliures{d.pla ? ' tota l’estada' : ''}
    </span>
  );
}

function Disponibilitat({ d }: { d: Disponibilitat }) {
  return (
    <>
      <div className="space-y-1">
        {d.habitacions.map((h) => (
          <div key={h.nom} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5 text-sm">
            <span className="font-medium text-slate-700">Hab. {h.nom}</span>
            {h.lliure ? (
              <span className="flex items-center gap-1 text-green-600"><Check className="h-3.5 w-3.5" /> Lliure</span>
            ) : (
              <span className="flex items-center gap-1 text-red-500"><X className="h-3.5 w-3.5" /> {h.ocupadaPer}</span>
            )}
          </div>
        ))}
      </div>
      {d.pla && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <Repeat className="h-4 w-4" /> Es pot fer amb un canvi d&apos;habitació
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
            {d.pla.map((t, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-amber-700" aria-hidden="true">→</span>}
                <span className="rounded-md border border-amber-200 bg-white px-2 py-0.5">
                  <strong>Hab. {t.habitacio}</strong> · {fmt(t.desde)}–{fmt(t.fins)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
