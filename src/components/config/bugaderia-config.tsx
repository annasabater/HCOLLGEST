'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';

interface Article { id: string; nom: string; preu: number; ordre: number; actiu: boolean }
type Item = { article: string; qty: number };
interface HabDefault { manteniment?: Item[]; sortida?: Item[] }
interface Hab { id: string; nom: string; bugaderiaDefault: HabDefault | null }

const toMap = (items?: Item[]) => Object.fromEntries((items ?? []).map((i) => [i.article, i.qty]));

export function BugaderiaConfig() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [habs, setHabs] = useState<Hab[]>([]);
  const [nou, setNou] = useState({ nom: '', preu: '' });
  const [habSel, setHabSel] = useState('');
  const [mant, setMant] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingHab, setSavingHab] = useState(false);
  const [okHab, setOkHab] = useState(false);

  async function load() {
    const [a, h] = await Promise.all([
      fetch('/api/bugaderia/articles').then((r) => r.json()),
      fetch('/api/bugaderia/habitacions').then((r) => r.json()),
    ]);
    setArticles(a.articles ?? []);
    setHabs(h.habitacions ?? []);
  }
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  useEffect(() => {
    const h = habs.find((x) => x.id === habSel);
    const d = h?.bugaderiaDefault ?? {};
    setMant(toMap(d.manteniment));
    setSort(toMap(d.sortida));
  }, [habSel, habs]);

  async function desarArticle(a: Article, canvi: Partial<Article>) {
    const upd = { ...a, ...canvi };
    setArticles((prev) => prev.map((x) => (x.id === a.id ? upd : x)));
    await fetch(`/api/bugaderia/articles/${a.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nom: upd.nom, preu: upd.preu }),
    });
  }
  async function esborraArticle(id: string) {
    if (!confirm('Eliminar aquest article del catàleg?')) return;
    await fetch(`/api/bugaderia/articles/${id}`, { method: 'DELETE' });
    setArticles((prev) => prev.filter((x) => x.id !== id));
  }
  async function afegirArticle() {
    if (!nou.nom.trim() || nou.preu === '') return;
    const res = await fetch('/api/bugaderia/articles', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nom: nou.nom.trim(), preu: Number(nou.preu) }),
    });
    if (res.ok) { setNou({ nom: '', preu: '' }); await load(); }
  }
  async function desarHab() {
    if (!habSel) return;
    setSavingHab(true); setOkHab(false);
    const toItems = (m: Record<string, number>) => articles.filter((a) => (m[a.nom] ?? 0) > 0).map((a) => ({ article: a.nom, qty: m[a.nom]! }));
    try {
      await fetch(`/api/bugaderia/habitacions/${habSel}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ manteniment: toItems(mant), sortida: toItems(sort) }),
      });
      await load();
      setOkHab(true); setTimeout(() => setOkHab(false), 2000);
    } finally { setSavingHab(false); }
  }

  const Step = ({ which, nom }: { which: 'm' | 's'; nom: string }) => {
    const map = which === 'm' ? mant : sort;
    const set = which === 'm' ? setMant : setSort;
    const q = map[nom] ?? 0;
    return (
      <div className="inline-flex items-center rounded-md border border-slate-200">
        <button type="button" className="px-2 text-slate-500 hover:bg-slate-100" onClick={() => set((p) => ({ ...p, [nom]: Math.max(0, q - 1) }))}>−</button>
        <span className={`w-6 text-center text-sm ${q > 0 ? 'font-semibold text-slate-800' : 'text-slate-300'}`}>{q}</span>
        <button type="button" className="px-2 text-slate-500 hover:bg-slate-100" onClick={() => set((p) => ({ ...p, [nom]: q + 1 }))}>+</button>
      </div>
    );
  };

  if (loading) return <p className="text-sm text-slate-400">Carregant…</p>;

  return (
    <div className="space-y-6">
      {/* Catàleg d'articles */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Catàleg d&apos;articles i preus</h3>
        <div className="space-y-1.5">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <Input className="flex-1" defaultValue={a.nom} onBlur={(e) => e.target.value.trim() && e.target.value !== a.nom && desarArticle(a, { nom: e.target.value.trim() })} />
              <div className="flex items-center gap-1">
                <Input type="number" step="0.01" className="w-24 text-right" defaultValue={a.preu} onBlur={(e) => Number(e.target.value) !== a.preu && desarArticle(a, { preu: Number(e.target.value) })} />
                <span className="text-sm text-slate-400">€</span>
              </div>
              <button type="button" className="p-2 touch-manipulation text-slate-400 hover:text-red-600" onClick={() => esborraArticle(a.id)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input className="flex-1" placeholder="Nou article (p. ex. Nòrdic)" value={nou.nom} onChange={(e) => setNou({ ...nou, nom: e.target.value })} />
          <Input type="number" step="0.01" className="w-24 text-right" placeholder="Preu" value={nou.preu} onChange={(e) => setNou({ ...nou, preu: e.target.value })} />
          <Button size="sm" variant="outline" onClick={afegirArticle}><Plus className="h-4 w-4" /> Afegir</Button>
        </div>
        <p className="mt-1 text-xs text-slate-400">Els canvis de nom i preu es desen en sortir del camp.</p>
      </div>

      {/* Valors per defecte per habitació */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Valors per defecte per habitació</h3>
        <Select value={habSel} onChange={(e) => setHabSel(e.target.value)} className="mb-3 max-w-xs">
          <option value="">Tria una habitació…</option>
          {habs.map((h) => <option key={h.id} value={h.id}>Habitació {h.nom}</option>)}
        </Select>
        {habSel && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-1.5 text-left font-medium">Article</th>
                  <th className="py-1.5 text-center font-medium">Manteniment</th>
                  <th className="py-1.5 text-center font-medium">Sortida</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="py-1.5 text-slate-700">{a.nom}</td>
                    <td className="py-1.5 text-center"><Step which="m" nom={a.nom} /></td>
                    <td className="py-1.5 text-center"><Step which="s" nom={a.nom} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" onClick={desarHab} disabled={savingHab}>{savingHab ? 'Desant…' : 'Desar valors per defecte'}</Button>
              {okHab && <span className="text-xs font-medium text-green-600">Desat ✓</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
