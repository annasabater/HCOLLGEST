'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Paperclip, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { getJSON, postJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import { toISODate } from '@/lib/dates';
import { optionsFrom, metodeCobramentValues, METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';

interface Cat {
  id: string;
  nom: string;
}
interface Prov {
  id: string;
  nom: string;
}
interface Gasto {
  id: string;
  data: string;
  import: string | number;
  descripcio: string;
  metodePagament: keyof typeof METODE_COBRAMENT_LABELS;
  adjuntPath: string | null;
  categoria: { nom: string };
  proveidor: { nom: string } | null;
}

export default function GastosPage() {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [proveidors, setProveidors] = useState<Prov[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [total, setTotal] = useState(0);
  const [perCat, setPerCat] = useState<Record<string, number>>({});

  const [fDesde, setFDesde] = useState('');
  const [fFins, setFFins] = useState('');
  const [fCat, setFCat] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [nova, setNova] = useState({
    data: toISODate(new Date()),
    import: '',
    categoriaId: '',
    proveidorId: '',
    metodePagament: 'TARGETA',
    descripcio: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (fDesde) p.set('desde', fDesde);
    if (fFins) p.set('fins', fFins);
    if (fCat) p.set('categoriaId', fCat);
    const res = await getJSON<{ gastos: Gasto[]; total: number; perCategoria: Record<string, number> }>(
      `/api/gastos?${p.toString()}`,
    );
    setGastos(res.gastos);
    setTotal(res.total);
    setPerCat(res.perCategoria);
  }, [fDesde, fFins, fCat]);

  useEffect(() => {
    getJSON<{ categories: Cat[] }>('/api/categories-gasto').then((r) => setCategories(r.categories));
    getJSON<{ proveidors: Prov[] }>('/api/proveidors').then((r) => setProveidors(r.proveidors));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nova.categoriaId || !nova.import) return;
    setSaving(true);
    setError(null);
    try {
      let adjuntPath: string | undefined;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!up.ok) throw new ApiError('No s’ha pogut pujar l’adjunt', up.status);
        adjuntPath = (await up.json()).path;
      }
      await postJSON('/api/gastos', {
        data: nova.data,
        import: Number(nova.import),
        categoriaId: nova.categoriaId,
        proveidorId: nova.proveidorId || undefined,
        metodePagament: nova.metodePagament,
        descripcio: nova.descripcio,
        adjuntPath,
      });
      setNova({
        data: toISODate(new Date()),
        import: '',
        categoriaId: '',
        proveidorId: '',
        metodePagament: 'TARGETA',
        descripcio: '',
      });
      setFile(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant la despesa');
    } finally {
      setSaving(false);
    }
  }

  async function esborrar(id: string) {
    await fetch(`/api/gastos/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Despeses"
        subtitle={`${formatEur(total)} en el període seleccionat`}
        actions={
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> Nova despesa
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crear} className="grid gap-3 sm:grid-cols-3">
              <Field label="Data" required>
                <Input type="date" value={nova.data} onChange={(e) => setNova({ ...nova, data: e.target.value })} />
              </Field>
              <Field label="Import €" required>
                <Input
                  type="number"
                  step="0.01"
                  value={nova.import}
                  onChange={(e) => setNova({ ...nova, import: e.target.value })}
                />
              </Field>
              <Field label="Categoria" required>
                <Select value={nova.categoriaId} onChange={(e) => setNova({ ...nova, categoriaId: e.target.value })}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Proveïdor">
                <Select value={nova.proveidorId} onChange={(e) => setNova({ ...nova, proveidorId: e.target.value })}>
                  <option value="">—</option>
                  {proveidors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Mètode de pagament">
                <Select
                  value={nova.metodePagament}
                  onChange={(e) => setNova({ ...nova, metodePagament: e.target.value })}
                >
                  {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Adjunt (factura/ticket)">
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </Field>
              <Field label="Descripció" required className="sm:col-span-3">
                <Input value={nova.descripcio} onChange={(e) => setNova({ ...nova, descripcio: e.target.value })} />
              </Field>
              <div className="sm:col-span-3 flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Desant…' : 'Desar despesa'}
                </Button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Filtros + totales */}
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Des de">
            <Input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} />
          </Field>
          <Field label="Fins a">
            <Input type="date" value={fFins} onChange={(e) => setFFins(e.target.value)} />
          </Field>
          <Field label="Categoria">
            <Select className="min-w-44" value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="">Totes</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </Select>
          </Field>
          <div className="ml-auto flex flex-wrap gap-2">
            {Object.entries(perCat)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([nom, imp]) => (
                <Badge key={nom} tone="neutral">
                  {nom}: {formatEur(imp)}
                </Badge>
              ))}
          </div>
        </CardBody>
      </Card>

      {gastos.length === 0 ? (
        <EmptyState>
          <Filter className="mx-auto mb-2 h-5 w-5 text-slate-300" /> Cap despesa en aquest període.
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Data</Th>
              <Th>Descripció</Th>
              <Th>Categoria</Th>
              <Th>Proveïdor</Th>
              <Th>Mètode</Th>
              <Th className="text-right">Import</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {gastos.map((g) => (
              <Tr key={g.id}>
                <Td>{formatDate(g.data)}</Td>
                <Td className="font-medium text-slate-800">
                  {g.descripcio}
                  {g.adjuntPath && (
                    <a
                      href={`/api/files?path=${encodeURIComponent(g.adjuntPath)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-flex text-brand-600"
                      title="Veure adjunt"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </a>
                  )}
                </Td>
                <Td>{g.categoria.nom}</Td>
                <Td>{g.proveidor?.nom ?? '—'}</Td>
                <Td>{METODE_COBRAMENT_LABELS[g.metodePagament]}</Td>
                <Td className="text-right font-medium">{formatEur(Number(g.import))}</Td>
                <Td>
                  <button className="text-slate-400 hover:text-red-600" onClick={() => esborrar(g.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
