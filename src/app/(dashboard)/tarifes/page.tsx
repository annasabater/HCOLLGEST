'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { getJSON, postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatEur, formatDate } from '@/lib/utils';

interface Hab {
  id: string;
  nom: string;
  tipus: string | null;
}
interface Tarifa {
  id: string;
  nom: string;
  preuNit: string | number;
  tipusHabitacio: string | null;
  habitacioId: string | null;
  habitacio: { nom: string } | null;
  dataInici: string | null;
  dataFi: string | null;
  actiu: boolean;
}

const emptyForm = { nom: '', preuNit: '', tipusHabitacio: '', habitacioId: '', dataInici: '', dataFi: '' };

export default function TarifesPage() {
  const [tarifes, setTarifes] = useState<Tarifa[]>([]);
  const [habitacions, setHabitacions] = useState<Hab[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await getJSON<{ tarifes: Tarifa[] }>('/api/tarifes');
    setTarifes(r.tarifes);
  }, []);
  useEffect(() => {
    load();
    getJSON<{ habitacions: Hab[] }>('/api/habitacions').then((r) => setHabitacions(r.habitacions));
  }, [load]);

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await postJSON('/api/tarifes', {
        nom: form.nom,
        preuNit: Number(form.preuNit),
        tipusHabitacio: form.tipusHabitacio || undefined,
        habitacioId: form.habitacioId || undefined,
        dataInici: form.dataInici || undefined,
        dataFi: form.dataFi || undefined,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant la tarifa');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(t: Tarifa) {
    await patchJSON(`/api/tarifes/${t.id}`, { actiu: !t.actiu });
    await load();
  }
  async function eliminar(t: Tarifa) {
    if (!confirm(`Eliminar la tarifa "${t.nom}"?`)) return;
    await delJSON(`/api/tarifes/${t.id}`);
    await load();
  }

  async function desaTipus(id: string, tipus: string) {
    await patchJSON(`/api/habitacions/${id}`, { tipus });
    setHabitacions((prev) => prev.map((h) => (h.id === id ? { ...h, tipus: tipus || null } : h)));
  }

  const tipusExistents = [...new Set(habitacions.map((h) => h.tipus).filter(Boolean))] as string[];

  return (
    <div>
      <PageHeader title="Tarifes" subtitle="Preu per nit (per habitació i/o temporada) — s’aplica sol a la factura" />
      <FinancesNav />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tipus d’habitació</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-xs text-slate-500">
            Assigna un tipus a cada habitació (Individual, Doble…) per poder posar una tarifa per tipus.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {habitacions.map((h) => (
              <div key={h.id} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-sm text-slate-600">Hab. {h.nom}</span>
                <Input
                  list="tipus-hab"
                  defaultValue={h.tipus ?? ''}
                  placeholder="Tipus"
                  onBlur={(e) => {
                    if ((e.target.value || '') !== (h.tipus ?? '')) desaTipus(h.id, e.target.value);
                  }}
                />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-brand-600" />
          <CardTitle>Nova tarifa</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={afegir} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nom" required>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Estàndard, Temporada alta…" />
            </Field>
            <Field label="Preu/nit (€)" required>
              <Input type="number" step="0.01" value={form.preuNit} onChange={(e) => setForm({ ...form, preuNit: e.target.value })} />
            </Field>
            <Field label="Tipus d'habitació (opcional)" hint="Aplica a totes les d'aquest tipus">
              <Input
                list="tipus-hab"
                value={form.tipusHabitacio}
                onChange={(e) => setForm({ ...form, tipusHabitacio: e.target.value })}
                placeholder="Individual, Doble…"
                disabled={!!form.habitacioId}
              />
              <datalist id="tipus-hab">
                {tipusExistents.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
            <Field label="Habitació concreta (opcional)">
              <Select value={form.habitacioId} onChange={(e) => setForm({ ...form, habitacioId: e.target.value })}>
                <option value="">Totes / per tipus</option>
                {habitacions.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nom}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Des de (opcional)">
              <Input type="date" value={form.dataInici} onChange={(e) => setForm({ ...form, dataInici: e.target.value })} />
            </Field>
            <Field label="Fins a (opcional)">
              <Input type="date" value={form.dataFi} onChange={(e) => setForm({ ...form, dataFi: e.target.value })} />
            </Field>
            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving}>
                <Plus className="h-4 w-4" /> {saving ? 'Desant…' : 'Afegir tarifa'}
              </Button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>
        </CardBody>
      </Card>

      {tarifes.length === 0 ? (
        <EmptyState>Cap tarifa. Crea’n una i el preu de l’allotjament sortirà sol a les factures.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Nom</Th>
              <Th className="text-right">Preu/nit</Th>
              <Th>Aplica a</Th>
              <Th>Temporada</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {tarifes.map((t) => (
              <Tr key={t.id} className={t.actiu ? '' : 'opacity-50'}>
                <Td className="font-medium text-slate-900">
                  {t.nom} {!t.actiu && <Badge tone="neutral">Inactiva</Badge>}
                </Td>
                <Td className="text-right">{formatEur(Number(t.preuNit))}</Td>
                <Td>{t.habitacio?.nom ? `Hab. ${t.habitacio.nom}` : t.tipusHabitacio ? `Tipus: ${t.tipusHabitacio}` : 'Totes'}</Td>
                <Td className="text-sm text-slate-500">
                  {t.dataInici || t.dataFi
                    ? `${t.dataInici ? formatDate(t.dataInici) : '…'} – ${t.dataFi ? formatDate(t.dataFi) : '…'}`
                    : 'Tot l’any'}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggle(t)}>
                      {t.actiu ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => eliminar(t)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
