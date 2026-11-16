'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getJSON } from '@/lib/api';
import { GRUP_TARIFA, GRUP_TARIFA_LABELS, type GrupTarifa } from '@/lib/validation/tarifa-tipus';

interface Fila {
  id: string;
  grup: string;
  etiqueta: string;
  ordre: number;
  mesos: number[];
  preuDia: number | null;
  preuDia4: number | null;
  preuSetmana: number | null;
  preuDosSetmanes: number | null;
  preuMes: number | null;
  nota: string | null;
  actiu: boolean;
}

const COLS: { k: keyof Fila; t: string }[] = [
  { k: 'preuDia', t: 'Dia' },
  { k: 'preuDia4', t: '4+ dies' },
  { k: 'preuSetmana', t: 'Setmana' },
  { k: 'preuDosSetmanes', t: '2 setm.' },
  { k: 'preuMes', t: 'Mes' },
];

const eur = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('ca-ES', { maximumFractionDigits: 2 });

/** Taula de tarifes (només lectura) que es desplega dins la calculadora del tauler. */
export function TarifesDesplegable({ grupInicial }: { grupInicial: GrupTarifa }) {
  const [files, setFiles] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grup, setGrup] = useState<GrupTarifa>(grupInicial);
  const mesAvui = new Date().getMonth() + 1;

  useEffect(() => {
    getJSON<{ files: Fila[] }>('/api/tarifes-tipus')
      .then((r) => setFiles(r.files.filter((f) => f.actiu)))
      .catch(() => setError('No s’han pogut carregar les tarifes'));
  }, []);

  const delGrup = (files ?? []).filter((f) => f.grup === grup).sort((a, b) => a.ordre - b.ordre);
  // Només les columnes que tenen algun preu en aquest tipus.
  const cols = COLS.filter((c) => delGrup.some((f) => f[c.k] != null));

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div role="group" aria-label="Tipus d'habitació" className="mb-2 flex flex-wrap gap-1">
        {GRUP_TARIFA.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={grup === g}
            onClick={() => setGrup(g)}
            className={`min-h-8 rounded-md px-2.5 text-xs ${grup === g ? 'bg-brand-700 font-medium text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-brand-400'}`}
          >
            {GRUP_TARIFA_LABELS[g]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {files === null && !error && <p className="text-sm text-slate-500">Carregant…</p>}
      {files !== null && delGrup.length === 0 && <p className="text-sm text-slate-500">Aquest tipus no té tarifes.</p>}

      {delGrup.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="py-1 pr-2 text-left font-medium">Temporada</th>
                {cols.map((c) => <th key={c.k} className="px-2 py-1 text-right font-medium">{c.t}</th>)}
              </tr>
            </thead>
            <tbody>
              {delGrup.map((f) => {
                const avui = f.mesos.includes(mesAvui);
                return (
                  <tr key={f.id} className={`border-t border-slate-200 ${avui ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-700'}`}>
                    <td className="py-1.5 pr-2">
                      {f.etiqueta}
                      {avui && <span className="ml-1.5 rounded bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold text-white">ARA</span>}
                      {f.nota && <span className="block text-xs font-normal text-slate-500">{f.nota}</span>}
                    </td>
                    {cols.map((c) => (
                      <td key={c.k} className="px-2 py-1.5 text-right tabular-nums">{eur(f[c.k] as number | null)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-right text-xs">
        <Link href="/tarifes" className="text-brand-700 underline underline-offset-2">Editar tarifes →</Link>
      </p>
    </div>
  );
}
