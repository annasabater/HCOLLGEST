'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import { toISODate } from '@/lib/dates';

export interface PagamentPrevistRow {
  id: string;
  import: number;
  dataPrevista: string; // ISO
  concepte: string | null;
  pagat: boolean;
}

export function PagamentsPrevistos({
  estanciaId,
  previstos,
}: {
  estanciaId: string;
  previstos: PagamentPrevistRow[];
}) {
  const router = useRouter();
  const [imp, setImp] = useState('');
  const [data, setData] = useState(toISODate(new Date()));
  const [concepte, setConcepte] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    if (!imp || !data) return;
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/estancies/${estanciaId}/pagaments-previstos`, {
        import: parseFloat(imp.replace(',', '.')) || 0,
        dataPrevista: data,
        concepte,
      });
      setImp('');
      setConcepte('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No s’ha pogut afegir');
    } finally {
      setSaving(false);
    }
  }

  async function marcarPagat(id: string, pagat: boolean) {
    setBusy(id);
    try {
      await patchJSON(`/api/pagaments-previstos/${id}`, { pagat });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function elimina(id: string) {
    setBusy(id);
    try {
      await delJSON(`/api/pagaments-previstos/${id}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const avuiIso = toISODate(new Date());

  return (
    <div className="space-y-3">
      {previstos.length === 0 ? (
        <p className="text-sm text-slate-400">Cap cobrament pendent registrat.</p>
      ) : (
        <ul className="space-y-2">
          {previstos.map((p) => {
            const venc = !p.pagat && toISODate(new Date(p.dataPrevista)) <= avuiIso;
            return (
              <li
                key={p.id}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  p.pagat ? 'border-slate-200 bg-slate-50 opacity-70' : venc ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                }`}
              >
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="font-medium text-slate-800">{formatEur(p.import)}</span>
                <span className="text-slate-500">
                  · previst el {formatDate(p.dataPrevista)}
                  {p.concepte ? ` · ${p.concepte}` : ''}
                </span>
                {p.pagat ? (
                  <Badge tone="success"><Check className="mr-0.5 h-3 w-3" />Pagat</Badge>
                ) : venc ? (
                  <Badge tone="warning">Vençut</Badge>
                ) : null}
                <div className="ml-auto flex items-center gap-1">
                  {!p.pagat && (
                    <Button variant="outline" size="sm" disabled={busy === p.id} onClick={() => marcarPagat(p.id, true)}>
                      <Check className="h-4 w-4" /> Marcar pagat
                    </Button>
                  )}
                  {p.pagat && (
                    <Button variant="ghost" size="sm" disabled={busy === p.id} onClick={() => marcarPagat(p.id, false)}>
                      Desfer
                    </Button>
                  )}
                  <button type="button" className="p-2 touch-manipulation text-slate-400 hover:text-red-600" onClick={() => elimina(p.id)} disabled={busy === p.id} title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={afegir} className="grid items-end gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[120px_150px_1fr_auto]">
        <Field label="Import (€)">
          <Input inputMode="decimal" value={imp} onChange={(e) => setImp(e.target.value)} placeholder="0,00" className="text-right" />
        </Field>
        <Field label="Data prevista">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>
        <Field label="Concepte (opcional)">
          <Input value={concepte} onChange={(e) => setConcepte(e.target.value)} placeholder="Resta de l’allotjament…" />
        </Field>
        <Button type="submit" disabled={saving || !imp || !data}>
          <Plus className="h-4 w-4" /> Afegir
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-400">
        El tauler t’avisarà des del <strong>dia abans</strong> de la data prevista (i mentre estigui vençut) fins que ho marquis com a pagat.
      </p>
    </div>
  );
}
