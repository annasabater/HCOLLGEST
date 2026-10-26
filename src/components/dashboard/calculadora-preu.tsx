'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, BedDouble, Check, X, Repeat, FilePlus2, Plus, Lightbulb } from 'lucide-react';
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
interface HabitacioDies {
  nom: string;
  tipus: 'Doble' | 'Individual';
  trossos: { desde: string; fins: string; lliure: boolean; qui: string | null; finsOcupacio: string | null }[];
}
interface PropostaHab {
  trams: { habitacio: string; grup: string; desde: string; fins: string; nits: number; total: number }[];
  total: number;
}
interface DisponibilitatPropostes { habitacions: HabitacioDies[]; propostes: PropostaHab[] }
// «auto»: a partir de 30 nits es posa sola la regla de tres. Es pot triar a mà
// en qualsevol estada: «Per nits» (també si en té 30 o més) o «Regla de tres».
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
  // Ocupació dia a dia de les habitacions i propostes per a l'estada sencera.
  const [prop, setProp] = useState<DisponibilitatPropostes | null>(null);
  const [propSel, setPropSel] = useState(0);

  const entradaDe = (k: number, ts: Tram[] = trams) => (k === 0 ? entrada : ts[k - 1]!.sortida);
  const nitsTotal = nitsEntre(entrada, trams[trams.length - 1]!.sortida);
  const llarga = nitsTotal >= NITS_MES;
  const mensual = mode === 'auto' ? llarga : mode === 'mensual';

  function canvia(fn: () => void) {
    fn();
    setRes(null);
    setProp(null);
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

  async function calcular(ts: Tram[] = trams, propostaTriada = 0) {
    setError(null);
    for (let k = 0; k < ts.length; k++) {
      if (nitsEntre(entradaDe(k, ts), ts[k]!.sortida) <= 0) {
        setError(ts.length > 1 ? `Al tram ${k + 1}, la sortida ha de ser posterior a l'entrada` : 'La data de sortida ha de ser posterior a la d\'entrada');
        setRes(null);
        return;
      }
    }
    const sortida = ts[ts.length - 1]!.sortida;
    const nitsEstada = nitsEntre(entrada, sortida);
    const esMensual = mode === 'auto' ? nitsEstada >= NITS_MES : mode === 'mensual';
    setLoading(true);
    try {
      // La temporada SEMPRE surt de les dates (partint per temporada si l'estada
      // creua mesos). El preu de mes es decideix per l'estada SENCERA, no per tram.
      const calculats = Promise.all(ts.map(async (t, k) => {
        const p = new URLSearchParams({ grup: t.grup, entrada: entradaDe(k, ts), sortida: t.sortida, mensual: esMensual ? '1' : '0', nitsEstada: String(nitsEstada) });
        const r = await getJSON<Resultat>(`/api/tarifes-tipus/calcular?${p.toString()}`);
        return { entrada: entradaDe(k, ts), sortida: t.sortida, grup: t.grup, observacio: t.observacio, res: r };
      }));
      // Propostes per a l'estada sencera: 2 persones si algun tram és «Habitació Doble».
      const grupEstada: GrupTarifa = ts.some((t) => t.grup === 'DOBLE') ? 'DOBLE' : ts[0]!.grup;
      const pp = new URLSearchParams({ grup: grupEstada, entrada, sortida, mensual: esMensual ? '1' : '0' });
      const propostes = getJSON<DisponibilitatPropostes>(`/api/tarifes-tipus/propostes?${pp.toString()}`).catch(() => null);
      const [cs, pr] = await Promise.all([calculats, propostes]);
      const ko = cs.find((c) => !c.res.ok);
      if (ko) { setError(ko.res.error ?? 'No s\'ha pogut calcular'); setRes(null); }
      else setRes(cs);
      setProp(pr);
      setPropSel(propostaTriada);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error calculant el preu');
    } finally {
      setLoading(false);
    }
  }

  // Omple els trams amb la proposta (una habitació o dues) i recalcula.
  function usarProposta(i: number) {
    const p = prop?.propostes[i];
    if (!p) return;
    const ts = p.trams.map((t) => ({ key: seq++, sortida: t.fins, grup: t.grup as GrupTarifa, observacio: '' }));
    setTrams(ts);
    void calcular(ts, i);
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
          {([['nits', 'Per nits'], ['mensual', 'Regla de tres']] as const).map(([m, label]) => {
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
        {mode === 'auto' ? (
          llarga
            ? 'Estada de 30 nits o més: regla de tres (preu del mes ÷ 30 × nits), encara que cada tram sigui més curt. Si vols, pots triar «Per nits».'
            : 'La regla de tres (preu del mes ÷ 30 × nits) s’activa sola quan l’estada arriba a 30 nits. També la pots posar o treure a mà.'
        ) : (
          <>
            {mode === 'mensual' ? 'Regla de tres triada a mà.' : 'Preu per nits triat a mà.'}{' '}
            <button type="button" className="text-brand-700 underline" onClick={() => canvia(() => setMode('auto'))}>
              Tornar a automàtic
            </button>
          </>
        )}
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

          {/* Propostes (o, si no n'hi ha, la disponibilitat del tipus triat) */}
          <div className="rounded-xl border border-slate-200 p-4">
            {prop && prop.propostes.length > 0 ? (
              <Propostes propostes={prop.propostes} sel={propSel} onSel={setPropSel} onUsar={usarProposta} loading={loading} />
            ) : varisTrams ? (
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

          {prop && prop.habitacions.length > 0 && (
            <div className="lg:col-span-2">
              <OcupacioDies
                entrada={entrada}
                sortida={trams[trams.length - 1]!.sortida}
                habitacions={prop.habitacions}
                proposta={prop.propostes[propSel] ?? null}
              />
            </div>
          )}

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

function Propostes({ propostes, sel, onSel, onUsar, loading }: {
  propostes: PropostaHab[];
  sel: number;
  onSel: (i: number) => void;
  onUsar: (i: number) => void;
  loading: boolean;
}) {
  const senseCanvis = propostes.filter((p) => p.trams.length === 1).map((p) => p.total);
  const refSense = senseCanvis.length ? Math.min(...senseCanvis) : null;
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-brand-600" />
        <span className="text-sm font-medium text-slate-700">Propostes</span>
        <span className="text-xs text-slate-500">de més barata a més cara</span>
      </div>
      <div className="space-y-2">
        {propostes.map((p, i) => {
          const estalvi = refSense != null && p.trams.length > 1 ? Math.round(refSense - p.total) : 0;
          const etiqueta = i === 0 && estalvi > 0 ? `Més barata · estalvia ${formatEur(estalvi)}` : p.trams.length === 1 ? 'Sense canvis' : i === 0 ? 'Més barata' : 'Alternativa';
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSel(i)}
              aria-pressed={i === sel}
              className={`w-full rounded-lg border p-3 text-left text-sm ${i === sel ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className={`text-xs font-semibold ${i === 0 ? 'text-green-700' : 'text-slate-500'}`}>{etiqueta}</span>
                <span className="text-base font-bold text-brand-800">{formatEur(p.total)}</span>
              </span>
              {p.trams.map((t, k) => (
                <span key={k} className="mt-0.5 block text-slate-700">
                  {k > 0 && <span className="text-brand-700">→ </span>}
                  <strong>Hab. {t.habitacio}</strong> ({GRUP_TARIFA_LABELS[t.grup as GrupTarifa] ?? t.grup}) · {fmt(t.desde)} → {fmt(t.fins)} · {nitsTxt(t.nits)}
                </span>
              ))}
            </button>
          );
        })}
      </div>
      <Button className="mt-3 w-full" onClick={() => onUsar(sel)} disabled={loading}>
        Fer servir aquesta proposta
      </Button>
      <p className="mt-1 text-xs text-slate-500">Omple els trams amb les dates i les habitacions, i recalcula.</p>
    </>
  );
}

/** Barra de dies per habitació: qui hi és i fins quan, i la proposta triada a sota. */
function OcupacioDies({ entrada, sortida, habitacions, proposta }: {
  entrada: string;
  sortida: string;
  habitacions: HabitacioDies[];
  proposta: PropostaHab | null;
}) {
  const total = Math.max(1, nitsEntre(entrada, sortida));
  const pct = (desde: string, fins: string) => `${(nitsEntre(desde, fins) / total) * 100}%`;
  const marques = Array.from({ length: Math.ceil(total / 7) }, (_, k) => k * 7).filter((d) => d < total);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <BedDouble className="h-4 w-4 text-slate-400" /> Disponibilitat del {fmt(entrada)} al {fmt(sortida)}
        </span>
        <span className="flex flex-wrap gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1"><span className="h-2.5 w-3.5 rounded-sm border border-green-600 bg-green-200" />Lliure</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-3.5 rounded-sm bg-slate-200" />Ocupada</span>
          {proposta && <span className="flex items-center gap-1"><span className="h-1 w-3.5 rounded-sm bg-brand-700" />Proposta</span>}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px] space-y-1.5">
          <div className="grid grid-cols-[120px_1fr] gap-2 text-[11px] text-slate-500">
            <span />
            <div className="relative h-4">
              {marques.map((d) => (
                <span key={d} className="absolute" style={{ left: `${(d / total) * 100}%` }}>{fmt(isoMesDies(entrada, d))}</span>
              ))}
            </div>
          </div>
          {habitacions.map((h) => {
            const t = proposta?.trams.find((x) => x.habitacio === h.nom);
            return (
              <div key={h.nom} className="grid grid-cols-[120px_1fr] items-center gap-2">
                <span className="text-sm leading-tight">
                  <strong className="text-slate-700">Hab. {h.nom}</strong>
                  <span className="block text-xs text-slate-500">{h.tipus}</span>
                </span>
                <div>
                  <div className="flex h-7 overflow-hidden rounded-md text-xs">
                    {h.trossos.map((s, k) => {
                      const txt = s.lliure
                        ? h.trossos.length === 1 ? 'Lliure tota l’estada' : k === 0 ? `Lliure fins al ${fmt(s.fins)}` : `Lliure des del ${fmt(s.desde)}`
                        : `${s.qui} · fins al ${fmt(s.finsOcupacio ?? s.fins)}`;
                      return (
                        <div
                          key={k}
                          title={txt}
                          style={{ width: pct(s.desde, s.fins) }}
                          className={`flex items-center overflow-hidden whitespace-nowrap border-r border-white px-2 ${s.lliure ? 'bg-green-200 text-green-900' : 'bg-slate-200 text-slate-700'}`}
                        >
                          {txt}
                        </div>
                      );
                    })}
                  </div>
                  <div className="relative mt-0.5 h-1">
                    {t && <div className="absolute h-1 rounded-sm bg-brand-700" style={{ left: pct(entrada, t.desde), width: pct(t.desde, t.fins) }} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
