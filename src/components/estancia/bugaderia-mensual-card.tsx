'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shirt, Pencil, Trash2, Check, X, Tag } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Eur } from '@/components/finances/amounts-visibility';
import { getJSON, patchJSON, ApiError } from '@/lib/api';

interface Item { article: string; qty: number }
interface Article { id: string; nom: string; preu: number }
interface Row {
  id: string;
  data: string;
  habitacio: string | null;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  articles: string;
  items: Item[];
  total: number;
}
interface Resposta { total: number; detall: Row[]; articles: Article[] }

/**
 * Total de bugaderia del mes (per comprovar la factura de la Mireia).
 * Cada fila és la bugaderia marcada a una tasca de neteja: es pot editar
 * (quantitats i articles) i treure. Els preus del catàleg també s'editen aquí.
 */
export function BugaderiaMensualCard() {
  const now = new Date();
  const [mes, setMes] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [total, setTotal] = useState(0);
  const [detall, setDetall] = useState<Row[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  // Edició d'una fila: id de la tasca + quantitats en curs.
  const [editant, setEditant] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [desant, setDesant] = useState(false);
  const [treure, setTreure] = useState<Row | null>(null);
  const [mostraPreus, setMostraPreus] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await getJSON<Resposta>(`/api/bugaderia/mensual?mes=${mes}`).catch(() => null);
    if (!d) return;
    setTotal(d.total ?? 0);
    setDetall(d.detall ?? []);
    setArticles(d.articles ?? []);
  }, [mes]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setEditant(null);
    load().finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [load]);

  const mesos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const dataCurta = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '—';

  const preuDe = (nom: string) => articles.find((a) => a.nom === nom)?.preu ?? 0;
  const costDraft = Math.round(
    Object.entries(draft).reduce((s, [nom, qty]) => s + preuDe(nom) * qty, 0) * 100,
  ) / 100;

  function editar(r: Row) {
    setErr(null);
    setEditant(r.id);
    setDraft(Object.fromEntries(r.items.map((i) => [i.article, i.qty])));
  }
  const setQty = (nom: string, qty: number) =>
    setDraft((p) => ({ ...p, [nom]: Math.max(0, qty) }));

  const missatgeError = (e: unknown, fallback: string) =>
    e instanceof ApiError ? (e.status === 403 ? 'No tens permís per fer aquest canvi.' : e.message) : fallback;

  async function desarFila(id: string) {
    setDesant(true);
    setErr(null);
    try {
      const items = Object.entries(draft)
        .map(([article, qty]) => ({ article, qty }))
        .filter((i) => i.qty > 0);
      await patchJSON(`/api/tasques-neteja/${id}`, { bugaderia: items });
      setEditant(null);
      await load();
    } catch (e) {
      setErr(missatgeError(e, 'Error desant la bugaderia'));
    } finally {
      setDesant(false);
    }
  }

  async function treureBugaderia(r: Row) {
    setErr(null);
    try {
      await patchJSON(`/api/tasques-neteja/${r.id}`, { bugaderia: null });
      if (editant === r.id) setEditant(null);
      await load();
    } catch (e) {
      setErr(missatgeError(e, 'Error traient la bugaderia'));
    } finally {
      setTreure(null);
    }
  }

  async function desarPreu(a: Article, valor: string) {
    const preu = Number(valor);
    if (!Number.isFinite(preu) || preu < 0 || preu === a.preu) return;
    setErr(null);
    try {
      await patchJSON(`/api/bugaderia/articles/${a.id}`, { preu });
      await load();
    } catch (e) {
      setErr(missatgeError(e, 'Error desant el preu'));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Shirt className="h-4 w-4 text-brand-600" /> Bugaderia del mes</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={mostraPreus ? 'secondary' : 'outline'} onClick={() => setMostraPreus((v) => !v)}>
            <Tag className="h-4 w-4" /> Preus
          </Button>
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm capitalize"
          >
            {mesos.map((mm) => (
              <option key={mm} value={mm}>
                {new Date(`${mm}-01T00:00:00`).toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-1 text-2xl font-bold text-slate-900"><Eur value={total} /></div>
        <p className="mb-3 text-xs text-slate-400">
          Suma la bugaderia que has marcat a les <strong>neteges</strong> d&apos;aquest mes (a Neteja, per cada habitació). Només compta el que has marcat que fa la Mireia. Serveix per comprovar la seva factura.
        </p>

        {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        {/* Preus del catàleg: es desen en sortir del camp i afecten tot l'històric. */}
        {mostraPreus && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Preus per article</h3>
            <div className="flex flex-wrap gap-2">
              {articles.map((a) => (
                <label key={a.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm">
                  <span className="text-slate-600">{a.nom}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-8 w-20 text-right"
                    defaultValue={a.preu}
                    onBlur={(e) => desarPreu(a, e.target.value)}
                  />
                  <span className="text-slate-400">€</span>
                </label>
              ))}
              {articles.length === 0 && <span className="text-sm text-slate-400">Cap article al catàleg.</span>}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              El preu es desa en sortir del camp i recalcula tots els mesos. Per crear o eliminar articles, ves a Configuració → Bugaderia.
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Carregant…</p>
        ) : detall.length === 0 ? (
          <p className="text-sm text-slate-400">Cap bugaderia marcada aquest mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-1.5 text-left font-medium">Dia</th>
                  <th className="py-1.5 text-center font-medium">Hab.</th>
                  <th className="py-1.5 text-center font-medium">Tipus</th>
                  <th className="py-1.5 text-left font-medium">Articles</th>
                  <th className="py-1.5 text-right font-medium">Cost</th>
                  <th className="py-1.5 text-right font-medium"><span className="sr-only">Accions</span></th>
                </tr>
              </thead>
              <tbody>
                {detall.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 align-top">
                    <td className="py-1.5 whitespace-nowrap text-slate-500">{dataCurta(r.data)}</td>
                    <td className="py-1.5 text-center text-slate-500">{r.habitacio ?? '—'}</td>
                    <td className="py-1.5 text-center">
                      <Badge tone={r.tipus === 'CANVI_COMPLET' ? 'warning' : 'neutral'} className="text-xs">
                        {r.tipus === 'CANVI_COMPLET' ? 'Sortida' : 'Repàs'}
                      </Badge>
                    </td>
                    {editant === r.id ? (
                      <td className="py-1.5" colSpan={3}>
                        <div className="flex flex-wrap items-center gap-2">
                          {articles
                            .filter((a) => (draft[a.nom] ?? 0) > 0)
                            .map((a) => (
                              <span key={a.id} className="inline-flex items-center rounded-md border border-slate-200 bg-white text-xs">
                                <button type="button" className="px-2.5 py-1.5 touch-manipulation text-slate-500 hover:bg-slate-100" onClick={() => setQty(a.nom, (draft[a.nom] ?? 0) - 1)}>−</button>
                                <span className="px-1 font-medium text-slate-700">{draft[a.nom]}× {a.nom}</span>
                                <button type="button" className="px-2.5 py-1.5 touch-manipulation text-slate-500 hover:bg-slate-100" onClick={() => setQty(a.nom, (draft[a.nom] ?? 0) + 1)}>+</button>
                              </span>
                            ))}
                          {Object.values(draft).every((q) => q <= 0) && (
                            <span className="text-xs text-slate-400">cap article — si ho deses així, la fila desapareix</span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Select
                            className="h-8 max-w-48 text-xs"
                            value=""
                            onChange={(e) => { if (e.target.value) setQty(e.target.value, (draft[e.target.value] ?? 0) + 1); }}
                          >
                            <option value="">＋ afegir article…</option>
                            {articles
                              .filter((a) => (draft[a.nom] ?? 0) === 0)
                              .map((a) => <option key={a.id} value={a.nom}>{a.nom} ({a.preu.toFixed(2)} €)</option>)}
                          </Select>
                          <span className="text-xs text-slate-500">Total: <strong className="text-slate-700">{costDraft.toFixed(2)} €</strong></span>
                          <Button size="sm" onClick={() => desarFila(r.id)} disabled={desant}>
                            <Check className="h-4 w-4" /> {desant ? 'Desant…' : 'Desar'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditant(null)} disabled={desant}>
                            <X className="h-4 w-4" /> Cancel·lar
                          </Button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-1.5 text-slate-600">{r.articles}</td>
                        <td className="py-1.5 text-right font-medium text-slate-800"><Eur value={r.total} /></td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => editar(r)}
                            aria-label="Editar la bugaderia"
                            className="inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTreure(r)}
                            aria-label="Treure la bugaderia"
                            className="inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>

      <ConfirmDialog
        open={treure !== null}
        title="Treure la bugaderia"
        message={
          treure
            ? `Es traurà la bugaderia de la neteja del ${dataCurta(treure.data)} (habitació ${treure.habitacio ?? '—'}). La tasca de neteja es manté; només deixa de comptar per a la factura.`
            : ''
        }
        confirmLabel="Treure"
        onConfirm={() => { if (treure) void treureBugaderia(treure); }}
        onCancel={() => setTreure(null)}
      />
    </Card>
  );
}
