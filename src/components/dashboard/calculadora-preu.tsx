'use client';

import { useState } from 'react';
import { Calculator, BedDouble, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { getJSON, ApiError } from '@/lib/api';
import { formatEur } from '@/lib/utils';
import { GRUP_TARIFA, GRUP_TARIFA_LABELS, type GrupTarifa } from '@/lib/validation/tarifa-tipus';

interface Linia { concepte: string; quantitat: number; preuUnitat: number; subtotal: number }
interface Segment { etiqueta: string; desde: string; fins: string; nits: number; linies: Linia[]; subtotal: number }
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
  disponibilitat: { tipus: string; lliures: number; total: number; habitacions: { nom: string; lliure: boolean; ocupadaPer: string | null }[] } | null;
}

function avui(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function fmt(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' });
}

export function CalculadoraPreu() {
  const [entrada, setEntrada] = useState(avui());
  const [sortida, setSortida] = useState(avui(1));
  const [grup, setGrup] = useState<GrupTarifa>('DOBLE');
  const [temporadaId, setTemporadaId] = useState(''); // '' = automàtica (per temporada)
  const [res, setRes] = useState<Resultat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calcular(temp = temporadaId) {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ grup, entrada, sortida });
      if (temp) p.set('temporadaId', temp);
      const r = await getJSON<Resultat>(`/api/tarifes-tipus/calcular?${p.toString()}`);
      if (!r.ok) { setError(r.error ?? 'No s\'ha pogut calcular'); setRes(null); }
      else setRes(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error calculant el preu');
    } finally {
      setLoading(false);
    }
  }

  function canviarTemporada(id: string) {
    setTemporadaId(id);
    void calcular(id);
  }

  function onCanviBase() {
    setTemporadaId('');
    setRes(null);
  }

  const multi = (res?.segments.length ?? 0) > 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-brand-600" />
        <h3 className="font-serif text-lg font-semibold text-slate-800">Calculadora de preus</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Entrada</span>
          <Input type="date" value={entrada} onChange={(e) => { setEntrada(e.target.value); onCanviBase(); }} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Sortida</span>
          <Input type="date" value={sortida} onChange={(e) => { setSortida(e.target.value); onCanviBase(); }} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Habitació</span>
          <Select value={grup} onChange={(e) => { setGrup(e.target.value as GrupTarifa); onCanviBase(); }}>
            {GRUP_TARIFA.map((g) => <option key={g} value={g}>{GRUP_TARIFA_LABELS[g]}</option>)}
          </Select>
        </label>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => calcular()} disabled={loading}>
            {loading ? 'Calculant…' : 'Calcular'}
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {res && res.ok && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Preu */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-500">{res.nits} {res.nits === 1 ? 'nit' : 'nits'}</span>
              {res.temporades.length > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  Temporada:
                  <Select className="h-8 py-0 text-xs" value={temporadaId} onChange={(e) => canviarTemporada(e.target.value)}>
                    <option value="">Automàtica (per temporada)</option>
                    {res.temporades.map((t) => <option key={t.id} value={t.id}>{t.etiqueta}</option>)}
                  </Select>
                </label>
              )}
            </div>

            {res.segments.map((s, si) => (
              <div key={si} className={multi ? 'mb-2 rounded-lg bg-slate-50 p-2' : ''}>
                {multi && (
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-brand-700">{s.etiqueta}</span>
                    <span className="text-slate-400">Del {fmt(s.desde)} al {fmt(s.fins)} · {s.nits} {s.nits === 1 ? 'nit' : 'nits'}</span>
                  </div>
                )}
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
                {multi && (
                  <div className="mt-1 text-right text-xs text-slate-500">Subtotal: <strong>{formatEur(s.subtotal)}</strong></div>
                )}
              </div>
            ))}

            <div className="mt-2 flex items-center justify-between border-t-2 border-brand-700 pt-2">
              <span className="font-serif text-base text-slate-800">Total</span>
              <span className="text-xl font-bold text-brand-800">{formatEur(res.total)}</span>
            </div>
            {res.grupUsat !== res.grup && (
              <p className="mt-1 text-xs text-amber-700">Aplicant tarifa d&apos;Habitació Doble.</p>
            )}
            {res.nota && <p className="mt-1 text-xs text-slate-400">{res.nota}</p>}
          </div>

          {/* Disponibilitat */}
          {res.disponibilitat && (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  Disponibilitat {res.disponibilitat.tipus} ·{' '}
                  <span className={res.disponibilitat.lliures > 0 ? 'text-green-600' : 'text-red-600'}>
                    {res.disponibilitat.lliures} de {res.disponibilitat.total} lliures
                  </span>
                </span>
              </div>
              <div className="space-y-1">
                {res.disponibilitat.habitacions.map((h) => (
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
