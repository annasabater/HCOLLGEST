'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, FileDown, History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getJSON } from '@/lib/api';
import { formatEur } from '@/lib/utils';
import { GRUP_TARIFA, GRUP_TARIFA_LABELS, type GrupTarifa } from '@/lib/validation/tarifa-tipus';

export interface FilaVersio {
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

interface Versio { id: string; desDe: string; editadaEl: string | null; obertaFins: string | null; usuari: string | null; files: FilaVersio[] }

type CampNum = 'preuDia' | 'preuDia4' | 'preuSetmana' | 'preuDosSetmanes' | 'preuMes' | 'reserva';
const COLS: { camp: CampNum; label: string }[] = [
  { camp: 'preuDia', label: 'Dia' },
  { camp: 'preuDia4', label: '4 dies' },
  { camp: 'preuSetmana', label: 'Setmana' },
  { camp: 'preuDosSetmanes', label: '2 setmanes' },
  { camp: 'preuMes', label: 'Mes' },
  { camp: 'reserva', label: 'Reserva' },
];

const clau = (f: FilaVersio) => `${f.grup}|${f.etiqueta}`;
const data = (iso: string) => new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dia = (iso: string) => new Date(iso).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Historial de la matriu de tarifes: cada canvi de preus és una versió (els desats
 * dels primers dies s'hi acumulen, perquè editar-los uns quants dies sigui una sola). Es pot
 * obrir per veure els preus (en groc, el que va canviar respecte de la versió
 * anterior) i recuperar-la a l'editor (després cal desar-la).
 */
export function VersionsTarifes({ recarrega, onRecupera }: { recarrega: number; onRecupera: (files: FilaVersio[]) => void }) {
  const [versions, setVersions] = useState<Versio[] | null>(null);
  const [obert, setObert] = useState<string | null>(null);

  useEffect(() => {
    getJSON<{ versions: Versio[] }>('/api/tarifes-tipus/versions').then((r) => setVersions(r.versions)).catch(() => setVersions([]));
  }, [recarrega]);

  if (!versions) return null;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <History className="h-4 w-4 text-slate-500" />
        <h2 className="font-serif text-lg font-semibold text-slate-800">Versions anteriors</h2>
      </div>
      {versions.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-500">Encara no hi ha cap versió. A partir del proper desat, cada canvi de preus quedarà guardat aquí.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {versions.map((v, i) => {
            const anterior = versions[i + 1];
            const previ = new Map((anterior?.files ?? []).map((f) => [clau(f), f]));
            const fins = i > 0 ? versions[i - 1]!.desDe : null;
            const esOberta = obert === v.id;
            const enEdicio = !!v.obertaFins && new Date(v.obertaFins) > new Date();
            return (
              <li key={v.id}>
                {enEdicio && (
                  <p className="bg-blue-50 px-4 py-2 text-xs text-blue-800">
                    <b>En edició fins al {dia(v.obertaFins!)}:</b> els canvis que desis fins aleshores s’afegeixen a aquesta versió
                    (no en fan una de nova){v.editadaEl && <> · últim desat el {data(v.editadaEl)}</>}. A partir d’aquell dia, el següent canvi començarà una versió nova.
                  </p>
                )}
                <div className="flex items-center hover:bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setObert(esOberta ? null : v.id)}
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 py-2.5 pl-4 text-left text-sm"
                  >
                    {esOberta ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span className="font-medium text-slate-800">Des del {data(v.desDe)}</span>
                    <span className="text-slate-500">{fins ? `fins al ${data(fins)}` : '· preus actuals'}</span>
                    {v.usuari && <span className="ml-auto text-xs text-slate-400">{v.usuari}</span>}
                  </button>
                  <a
                    href={`/imprimir/tarifes?versio=${v.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Full de preus d’aquesta versió (per imprimir o desar en PDF)"
                    className="mx-3 flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  >
                    <FileDown className="h-3.5 w-3.5" /> PDF
                  </a>
                </div>
                {esOberta && (
                  <div className="space-y-4 px-4 pb-4">
                    {GRUP_TARIFA.map((grup) => {
                      const rows = v.files.filter((f) => f.grup === grup).sort((a, b) => a.ordre - b.ordre);
                      if (rows.length === 0) return null;
                      return (
                        <div key={grup} className="overflow-x-auto">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{GRUP_TARIFA_LABELS[grup]}</p>
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="text-left text-xs text-slate-400">
                                <th className="px-2 py-1">Temporada</th>
                                {COLS.map((c) => <th key={c.camp} className="px-2 py-1 text-right">{c.label}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((f) => {
                                const p = previ.get(clau(f));
                                return (
                                  <tr key={clau(f)} className="border-t border-slate-100">
                                    <td className={`px-2 py-1 ${anterior && !p ? 'bg-amber-50 font-medium' : ''}`}>{f.etiqueta}</td>
                                    {COLS.map((c) => {
                                      const canviat = !!anterior && p != null && p[c.camp] !== f[c.camp];
                                      return (
                                        <td
                                          key={c.camp}
                                          className={`px-2 py-1 text-right tabular-nums ${canviat ? 'bg-amber-100 font-medium text-amber-900' : 'text-slate-700'}`}
                                          title={canviat ? `Abans: ${p[c.camp] != null ? formatEur(p[c.camp]!) : 'buit'}` : undefined}
                                        >
                                          {f[c.camp] != null ? formatEur(f[c.camp]!) : '—'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap items-center gap-3">
                      {anterior && <span className="text-xs text-slate-500"><span className="rounded bg-amber-100 px-1">en groc</span> el que va canviar en aquesta versió (passa-hi el ratolí per veure el preu d’abans)</span>}
                      {i > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto"
                          onClick={() => {
                            if (confirm('Vols carregar aquests preus a l’editor? Després caldrà prémer «Desar canvis» perquè tornin a ser els vigents.')) onRecupera(v.files);
                          }}
                        >
                          <RotateCcw className="h-4 w-4" /> Recupera aquests preus
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
