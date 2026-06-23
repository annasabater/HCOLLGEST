'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getJSON, postJSON, patchJSON, delJSON } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toISODate } from '@/lib/dates';
import { optionsFrom, tipusNetejaValues, TIPUS_NETEJA_LABELS } from '@/lib/validation/enums';

interface Habitacio {
  id: string;
  nom: string;
}
interface Treballador {
  id: string;
  nom: string;
}
interface Tasca {
  id: string;
  data: string;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  estat: 'PENDENT' | 'FETA';
  habitacio: { nom: string } | null;
  treballador: { nom: string } | null;
  assignadaA: string | null;
}

export default function NetejaPage() {
  const [habitacions, setHabitacions] = useState<Habitacio[]>([]);
  const [treballadors, setTreballadors] = useState<Treballador[]>([]);
  const [tasques, setTasques] = useState<Tasca[]>([]);
  const [filtreEstat, setFiltreEstat] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [nova, setNova] = useState({
    data: toISODate(new Date()),
    habitacioId: '',
    tipus: 'REPAS',
    assignadaA: '',
  });

  const loadTasques = useCallback(async () => {
    const q = filtreEstat ? `?estat=${filtreEstat}` : '';
    const res = await getJSON<{ tasques: Tasca[] }>(`/api/tasques-neteja${q}`);
    setTasques(res.tasques);
  }, [filtreEstat]);

  useEffect(() => {
    getJSON<{ habitacions: Habitacio[] }>('/api/habitacions').then((r) => setHabitacions(r.habitacions));
    getJSON<{ treballadors: Treballador[] }>('/api/treballadors').then((r) =>
      setTreballadors(r.treballadors),
    );
  }, []);
  useEffect(() => {
    loadTasques();
  }, [loadTasques]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nova.habitacioId) return;
    await postJSON('/api/tasques-neteja', {
      data: nova.data,
      habitacioId: nova.habitacioId,
      tipus: nova.tipus,
      assignadaA: nova.assignadaA || undefined,
    });
    setNova({ data: toISODate(new Date()), habitacioId: '', tipus: 'REPAS', assignadaA: '' });
    setShowForm(false);
    loadTasques();
  }

  async function update(id: string, patch: Record<string, unknown>) {
    await patchJSON(`/api/tasques-neteja/${id}`, patch);
    loadTasques();
  }

  async function esborrar(id: string) {
    if (!window.confirm('Segur que vols eliminar aquesta tasca de neteja?')) return;
    await delJSON(`/api/tasques-neteja/${id}`);
    loadTasques();
  }

  return (
    <div>
      <PageHeader
        title="Neteja"
        subtitle="Tasques de neteja per habitació"
        actions={
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> Nova tasca
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crear} className="grid items-end gap-3 sm:grid-cols-5">
              <Field label="Data">
                <Input type="date" value={nova.data} onChange={(e) => setNova({ ...nova, data: e.target.value })} />
              </Field>
              <Field label="Habitació">
                <Select value={nova.habitacioId} onChange={(e) => setNova({ ...nova, habitacioId: e.target.value })}>
                  <option value="">—</option>
                  {habitacions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nom}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tipus">
                <Select value={nova.tipus} onChange={(e) => setNova({ ...nova, tipus: e.target.value })}>
                  {optionsFrom(tipusNetejaValues, TIPUS_NETEJA_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Assignada a">
                <Select value={nova.assignadaA} onChange={(e) => setNova({ ...nova, assignadaA: e.target.value })}>
                  <option value="">—</option>
                  {treballadors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" disabled={!nova.habitacioId}>
                Crear
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Select className="max-w-48" value={filtreEstat} onChange={(e) => setFiltreEstat(e.target.value)}>
          <option value="">Totes</option>
          <option value="PENDENT">Pendents</option>
          <option value="FETA">Fetes</option>
        </Select>
      </div>

      {tasques.length === 0 ? (
        <EmptyState>Cap tasca de neteja.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Data</Th>
              <Th>Habitació</Th>
              <Th>Tipus</Th>
              <Th>Assignada</Th>
              <Th>Estat</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {tasques.map((t) => (
              <Tr key={t.id}>
                <Td>{formatDate(t.data)}</Td>
                <Td>{t.habitacio?.nom ?? '—'}</Td>
                <Td>{TIPUS_NETEJA_LABELS[t.tipus]}</Td>
                <Td>
                  <Select
                    className="h-8 max-w-44"
                    value={t.assignadaA ?? ''}
                    onChange={(e) => update(t.id, { assignadaA: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {treballadors.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.nom}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td>
                  <Badge tone={t.estat === 'FETA' ? 'success' : 'warning'}>
                    {t.estat === 'FETA' ? 'Feta' : 'Pendent'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {t.estat === 'PENDENT' ? (
                      <Button size="sm" variant="outline" onClick={() => update(t.id, { estat: 'FETA' })}>
                        <Check className="h-4 w-4" /> Feta
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => update(t.id, { estat: 'PENDENT' })}>
                        Desfer
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => esborrar(t.id)}
                      className="text-slate-400 hover:text-red-600"
                      title="Eliminar tasca"
                      aria-label="Eliminar tasca"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
