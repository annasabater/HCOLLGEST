'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { getJSON, putJSON, delJSON, ApiError } from '@/lib/api';

interface Resposta { normes: string[]; perDefecte: boolean; ultimaEdicio: string | null }

/**
 * Normes de la casa (reglament que signa cada hoste i cartell de paret), editables
 * línia a línia com les factures: canviar el text, afegir, treure i reordenar.
 * Cada desat és una versió nova: els reglaments ja signats mantenen les seves normes.
 */
export function NormesReglament() {
  const [normes, setNormes] = useState<string[]>([]);
  const [info, setInfo] = useState<{ perDefecte: boolean; ultimaEdicio: string | null }>({ perDefecte: true, ultimaEdicio: null });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canvis, setCanvis] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const aplica = (r: Resposta) => {
    setNormes(r.normes);
    setInfo({ perDefecte: r.perDefecte, ultimaEdicio: r.ultimaEdicio });
    setCanvis(false);
  };

  useEffect(() => {
    getJSON<Resposta>('/api/establiment/normes').then((r) => { aplica(r); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  const canvia = (fn: (n: string[]) => string[]) => { setNormes((n) => fn([...n])); setCanvis(true); setMsg(null); };
  const mou = (i: number, d: -1 | 1) => canvia((n) => { const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });

  async function desa() {
    setBusy(true);
    setMsg(null);
    try {
      aplica(await putJSON<Resposta>('/api/establiment/normes', { normes: normes.map((n) => n.trim()).filter(Boolean) }));
      setMsg({ tone: 'ok', text: 'Normes desades. El cartell i els reglaments nous ja les porten.' });
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof ApiError ? e.message : 'No s’han pogut desar' });
    } finally {
      setBusy(false);
    }
  }

  async function restaura() {
    if (!confirm('Vols tornar a les normes originals? Les que has editat deixaran de sortir al cartell i als reglaments nous.')) return;
    setBusy(true);
    try {
      aplica(await delJSON<Resposta>('/api/establiment/normes'));
      setMsg({ tone: 'ok', text: 'Normes originals restaurades.' });
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <p className="text-sm text-slate-500">Carregant…</p>;

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">
        Són les normes del <b>reglament que signa cada hoste</b> i del <b>cartell</b>. Canvia el text, afegeix o treu línies i desa.
        Els reglaments ja signats es continuen veient amb les normes que hi havia el dia de la firma.
        {info.ultimaEdicio && <span className="text-slate-500"> Última edició: {new Date(info.ultimaEdicio).toLocaleString('ca-ES')}.</span>}
      </p>

      <ol className="space-y-2">
        {normes.map((n, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-2 w-5 shrink-0 text-right text-xs text-slate-400">{i + 1}.</span>
            <Textarea
              value={n}
              rows={Math.min(6, Math.max(1, Math.ceil(n.length / 95)))}
              onChange={(e) => { const t = e.target.value; canvia((x) => { x[i] = t; return x; }); }}
              className="min-h-0 flex-1 text-sm"
            />
            <div className="flex shrink-0 flex-col gap-1">
              <button type="button" title="Puja" disabled={i === 0} onClick={() => mou(i, -1)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" title="Baixa" disabled={i === normes.length - 1} onClick={() => mou(i, 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" title="Treu aquesta norma" onClick={() => canvia((x) => x.filter((_, k) => k !== i))} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => canvia((x) => [...x, ''])}><Plus className="h-4 w-4" /> Afegeix una norma</Button>
        <Button type="button" size="sm" onClick={() => void desa()} disabled={busy || !canvis}>Desa les normes</Button>
        <a href="/api/plantilles-buides?doc=cartell" target="_blank" rel="noreferrer"><Button type="button" size="sm" variant="ghost"><FileText className="h-4 w-4" /> Veure el cartell</Button></a>
        <a href="/api/plantilles-buides?doc=reglament" target="_blank" rel="noreferrer"><Button type="button" size="sm" variant="ghost"><FileText className="h-4 w-4" /> Veure el reglament</Button></a>
        {!info.perDefecte && (
          <Button type="button" size="sm" variant="ghost" onClick={() => void restaura()} disabled={busy}><RotateCcw className="h-4 w-4" /> Normes originals</Button>
        )}
      </div>
      {canvis && <p className="text-xs text-amber-700">Tens canvis sense desar.</p>}
      {msg && <p className={msg.tone === 'ok' ? 'text-xs text-green-700' : 'text-xs text-red-600'}>{msg.text}</p>}
    </div>
  );
}
