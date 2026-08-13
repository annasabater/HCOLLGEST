'use client';

import { useEffect, useState } from 'react';
import { Shirt, RotateCcw } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Eur } from '@/components/finances/amounts-visibility';

interface Article { id: string; nom: string; preu: number }
type Item = { article: string; qty: number };
interface Seleccio { manteniment: Item[]; sortida: Item[] }

const toMap = (items?: Item[]): Record<string, number> =>
  Object.fromEntries((items ?? []).map((i) => [i.article, i.qty]));

/** Selecció de la bugaderia (articles a netejar) d'una estada: manteniment i sortida. */
export function BugaderiaPanel({ estanciaId }: { estanciaId: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [mant, setMant] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<Record<string, number>>({});
  const [def, setDef] = useState<Seleccio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch(`/api/estancies/${estanciaId}/bugaderia`)
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        setArticles(d.articles ?? []);
        setDef((d.habDefault as Seleccio | null) ?? null);
        const src = (d.seleccio as Seleccio | null) ?? (d.habDefault as Seleccio | null) ?? { manteniment: [], sortida: [] };
        setMant(toMap(src.manteniment));
        setSort(toMap(src.sortida));
      })
      .catch(() => {})
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [estanciaId]);

  const totalDe = (m: Record<string, number>) =>
    Math.round(articles.reduce((s, a) => s + (m[a.nom] ?? 0) * a.preu, 0) * 100) / 100;

  function setQty(which: 'm' | 's', nom: string, qty: number) {
    const q = Math.max(0, Math.floor(qty || 0));
    (which === 'm' ? setMant : setSort)((p) => ({ ...p, [nom]: q }));
    setDirty(true);
  }

  function restaura() {
    const src = def ?? { manteniment: [], sortida: [] };
    setMant(toMap(src.manteniment));
    setSort(toMap(src.sortida));
    setDirty(true);
  }

  async function desar() {
    setSaving(true);
    const toItems = (m: Record<string, number>) =>
      articles.filter((a) => (m[a.nom] ?? 0) > 0).map((a) => ({ article: a.nom, qty: m[a.nom]! }));
    try {
      await fetch(`/api/estancies/${estanciaId}/bugaderia`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ manteniment: toItems(mant), sortida: toItems(sort) }),
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  const Stepper = ({ which, nom }: { which: 'm' | 's'; nom: string }) => {
    const map = which === 'm' ? mant : sort;
    const q = map[nom] ?? 0;
    return (
      <div className="inline-flex items-center rounded-md border border-slate-200">
        <button type="button" className="px-3 py-1.5 touch-manipulation text-slate-500 hover:bg-slate-100" onClick={() => setQty(which, nom, q - 1)}>−</button>
        <span className={`w-7 text-center text-sm ${q > 0 ? 'font-semibold text-slate-800' : 'text-slate-300'}`}>{q}</span>
        <button type="button" className="px-3 py-1.5 touch-manipulation text-slate-500 hover:bg-slate-100" onClick={() => setQty(which, nom, q + 1)}>+</button>
      </div>
    );
  };

  return (
    <CollapsibleCard title="Bugaderia" icon={<Shirt className="h-4 w-4 text-brand-600" />}>
      {loading ? (
        <p className="text-sm text-slate-400">Carregant…</p>
      ) : articles.length === 0 ? (
        <p className="text-sm text-slate-400">No hi ha catàleg de bugaderia. Configura&apos;l a /config.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {def && (
              <Button size="sm" variant="ghost" onClick={restaura} title="Tornar als valors per defecte de l'habitació">
                <RotateCcw className="h-4 w-4" /> Per defecte
              </Button>
            )}
            <Button size="sm" onClick={desar} disabled={saving || !dirty}>{saving ? 'Desant…' : 'Desar'}</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-1.5 text-left font-medium">Article</th>
                  <th className="py-1.5 text-right font-medium">Preu</th>
                  <th className="py-1.5 text-center font-medium">Manteniment</th>
                  <th className="py-1.5 text-center font-medium">Sortida</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="py-1.5 text-slate-700">{a.nom}</td>
                    <td className="py-1.5 text-right text-slate-400"><Eur value={a.preu} /></td>
                    <td className="py-1.5 text-center"><Stepper which="m" nom={a.nom} /></td>
                    <td className="py-1.5 text-center"><Stepper which="s" nom={a.nom} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-semibold text-slate-800">
                  <td className="py-2" colSpan={2}>Total per neteja</td>
                  <td className="py-2 text-center"><Eur value={totalDe(mant)} /></td>
                  <td className="py-2 text-center"><Eur value={totalDe(sort)} /></td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-2 text-xs text-slate-400">
              Valors per defecte d&apos;aquesta estada. Preomplen la bugaderia quan marques la neteja a <strong>Neteja</strong> (allà és on compta i on es genera l&apos;avís a la Mireia).
            </p>
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}
