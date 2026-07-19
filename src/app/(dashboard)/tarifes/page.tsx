'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Save, FileDown } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { getJSON, ApiError } from '@/lib/api';
import { GRUP_TARIFA, GRUP_TARIFA_LABELS, type GrupTarifa } from '@/lib/validation/tarifa-tipus';

interface Fila {
  _key: string;
  id?: string;
  grup: GrupTarifa;
  etiqueta: string;
  ordre: number;
  mesos: number[];
  preuDia: number | null;
  preuDia4: number | null;
  preuSetmana: number | null;
  preuDosSetmanes: number | null;
  preuMes: number | null;
  reserva: number | null;
  nota: string | null;
}

type CampNum = 'preuDia' | 'preuDia4' | 'preuSetmana' | 'preuDosSetmanes' | 'preuMes' | 'reserva';

const COLS: { camp: CampNum; label: string }[] = [
  { camp: 'preuDia', label: 'Dia (€)' },
  { camp: 'preuDia4', label: '4 dies (€/dia)' },
  { camp: 'preuSetmana', label: 'Setmana (€)' },
  { camp: 'preuDosSetmanes', label: '2 setmanes (€)' },
  { camp: 'preuMes', label: 'Mes (€)' },
  { camp: 'reserva', label: 'Reserva (€)' },
];

let keySeq = 0;
const nouKey = () => `k${++keySeq}`;

export default function TarifesPage() {
  const [files, setFiles] = useState<Fila[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getJSON<{ files: Omit<Fila, '_key'>[] }>('/api/tarifes-tipus');
      setFiles(r.files.map((f) => ({ ...f, _key: nouKey() })));
      setDirty(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error carregant les tarifes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function setCamp(key: string, patch: Partial<Fila>) {
    setFiles((prev) => prev.map((f) => (f._key === key ? { ...f, ...patch } : f)));
    setDirty(true);
    setOkMsg(false);
  }

  function afegirFila(grup: GrupTarifa) {
    const ordre = Math.max(0, ...files.filter((f) => f.grup === grup).map((f) => f.ordre)) + 1;
    setFiles((prev) => [
      ...prev,
      { _key: nouKey(), grup, etiqueta: 'Nova temporada', ordre, mesos: [], preuDia: null, preuDia4: null, preuSetmana: null, preuDosSetmanes: null, preuMes: null, reserva: null, nota: null },
    ]);
    setDirty(true);
  }

  function eliminarFila(key: string) {
    setFiles((prev) => prev.filter((f) => f._key !== key));
    setDirty(true);
  }

  async function desar() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        files: files.map((f) => ({
          id: f.id, grup: f.grup, etiqueta: f.etiqueta, ordre: f.ordre, mesos: f.mesos,
          preuDia: f.preuDia, preuDia4: f.preuDia4, preuSetmana: f.preuSetmana,
          preuDosSetmanes: f.preuDosSetmanes, preuMes: f.preuMes, reserva: f.reserva, nota: f.nota,
        })),
      };
      const res = await fetch('/api/tarifes-tipus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new ApiError((await res.json().catch(() => ({}))).error || 'Error desant', res.status);
      const data = await res.json();
      setFiles((data.files as Omit<Fila, '_key'>[]).map((f) => ({ ...f, _key: nouKey() })));
      setDirty(false);
      setOkMsg(true);
      setTimeout(() => setOkMsg(false), 2500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error desant les tarifes');
    } finally {
      setSaving(false);
    }
  }

  const numInput = (f: Fila, camp: CampNum) => (
    <Input
      type="number"
      step="0.01"
      min="0"
      className="h-9 w-full min-w-20 text-right"
      value={f[camp] ?? ''}
      onChange={(e) => setCamp(f._key, { [camp]: e.target.value === '' ? null : Number(e.target.value) } as Partial<Fila>)}
    />
  );

  return (
    <div>
      <PageHeader
        title="Tarifes"
        subtitle="Full de preus per tipus d'habitació i temporada — editable i descarregable en PDF"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {okMsg && <span className="text-sm font-medium text-green-600">Desat ✓</span>}
            <Button onClick={desar} disabled={saving || !dirty}>
              <Save className="h-4 w-4" /> {saving ? 'Desant…' : 'Desar canvis'}
            </Button>
          </div>
        }
      />
      <FinancesNav />

      {/* Descàrrega PDF (tot o per tipus) */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="font-medium text-slate-700">Descarregar PDF:</span>
        <a href="/imprimir/tarifes" target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm"><FileDown className="h-4 w-4" /> Totes</Button>
        </a>
        {GRUP_TARIFA.map((g) => (
          <a key={g} href={`/imprimir/tarifes?grup=${g}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><FileDown className="h-4 w-4" /> {GRUP_TARIFA_LABELS[g]}</Button>
          </a>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} <button className="ml-2 underline" onClick={() => setError(null)}>Tancar</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregant…</p>
      ) : (
        <div className="space-y-6">
          {GRUP_TARIFA.map((grup) => {
            const rows = files.filter((f) => f.grup === grup).sort((a, b) => a.ordre - b.ordre);
            return (
              <div key={grup} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="font-serif text-lg font-semibold text-slate-800">{GRUP_TARIFA_LABELS[grup]}</h2>
                </div>
                <div className="overflow-x-auto px-4 py-3">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="min-w-52 px-2 py-2">Temporada</th>
                        {COLS.map((c) => (
                          <th key={c.camp} className="px-2 py-2 text-right">{c.label}</th>
                        ))}
                        <th className="min-w-40 px-2 py-2">Mesos</th>
                        <th className="min-w-48 px-2 py-2">Nota</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((f) => (
                        <tr key={f._key} className="border-t border-slate-100 align-top">
                          <td className="px-2 py-2">
                            <Input className="h-9 w-full min-w-48" value={f.etiqueta} onChange={(e) => setCamp(f._key, { etiqueta: e.target.value })} />
                          </td>
                          {COLS.map((c) => (
                            <td key={c.camp} className="px-2 py-2">{numInput(f, c.camp)}</td>
                          ))}
                          <td className="px-2 py-2">
                            <Input
                              className="h-9 w-full min-w-36"
                              placeholder="p. ex. 6,7,8,9"
                              value={f.mesos.join(',')}
                              onChange={(e) => setCamp(f._key, {
                                mesos: e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 12),
                              })}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input className="h-9 w-full min-w-44" value={f.nota ?? ''} onChange={(e) => setCamp(f._key, { nota: e.target.value || null })} />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button type="button" className="p-1 text-slate-400 hover:text-red-600" title="Eliminar temporada" onClick={() => eliminarFila(f._key)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr><td colSpan={COLS.length + 4} className="px-2 py-3 text-center text-xs italic text-slate-400">Cap temporada. Afegeix-ne una.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-100 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => afegirFila(grup)}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-brand-300 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50"
                  >
                    <Plus className="h-4 w-4" /> Afegir temporada
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Els camps buits es deixen en blanc a la taula i al PDF. «4 dies» és el preu per dia a partir del 4t dia.
        Els «Mesos» (1–12) serviran per detectar la temporada automàticament a la calculadora de preus.
      </p>
    </div>
  );
}
