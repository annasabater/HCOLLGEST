'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getJSON, postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import {
  estatIncidenciaValues,
  prioritatIncidenciaValues,
  ESTAT_INCIDENCIA_LABELS,
  PRIORITAT_INCIDENCIA_LABELS,
} from '@/lib/validation/incidencia';

interface Hab {
  id: string;
  nom: string;
}
interface Incidencia {
  id: string;
  titol: string;
  descripcio: string | null;
  habitacio: { nom: string } | null;
  estat: 'OBERTA' | 'EN_CURS' | 'RESOLTA';
  prioritat: 'BAIXA' | 'MITJA' | 'ALTA';
  cost: string | number | null;
  data: string;
  notes: string | null;
}

const PRIO_TONE = { ALTA: 'danger', MITJA: 'warning', BAIXA: 'neutral' } as const;
const ESTAT_TONE = { OBERTA: 'danger', EN_CURS: 'warning', RESOLTA: 'success' } as const;
const emptyForm = { titol: '', habitacioId: '', prioritat: 'MITJA', descripcio: '', cost: '' };

export default function MantenimentPage() {
  const [incidencies, setIncidencies] = useState<Incidencia[]>([]);
  const [habitacions, setHabitacions] = useState<Hab[]>([]);
  const [filtre, setFiltre] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await getJSON<{ incidencies: Incidencia[] }>(`/api/incidencies${filtre ? `?estat=${filtre}` : ''}`);
    setIncidencies(r.incidencies);
  }, [filtre]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    getJSON<{ habitacions: Hab[] }>('/api/habitacions').then((r) => setHabitacions(r.habitacions));
  }, []);

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await postJSON('/api/incidencies', {
        titol: form.titol,
        habitacioId: form.habitacioId || undefined,
        prioritat: form.prioritat,
        descripcio: form.descripcio || undefined,
        cost: form.cost || undefined,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant la incidència');
    } finally {
      setSaving(false);
    }
  }

  async function canviEstat(i: Incidencia, estat: string) {
    await patchJSON(`/api/incidencies/${i.id}`, { estat });
    await load();
  }
  async function eliminar(i: Incidencia) {
    if (!confirm(`Eliminar "${i.titol}"?`)) return;
    await delJSON(`/api/incidencies/${i.id}`);
    await load();
  }

  const obertes = incidencies.filter((i) => i.estat !== 'RESOLTA').length;

  return (
    <div>
      <PageHeader title="Manteniment" subtitle={`Incidències i avaries · ${obertes} obertes`} />

      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-brand-600" />
          <CardTitle>Nova incidència</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={afegir} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Títol" required className="lg:col-span-2">
              <Input value={form.titol} onChange={(e) => setForm({ ...form, titol: e.target.value })} placeholder="P. ex. Aire condicionat no funciona" />
            </Field>
            <Field label="Habitació">
              <Select value={form.habitacioId} onChange={(e) => setForm({ ...form, habitacioId: e.target.value })}>
                <option value="">— (general)</option>
                {habitacions.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nom}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prioritat">
              <Select value={form.prioritat} onChange={(e) => setForm({ ...form, prioritat: e.target.value })}>
                {prioritatIncidenciaValues.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITAT_INCIDENCIA_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Descripció" className="lg:col-span-3">
              <Textarea rows={2} value={form.descripcio} onChange={(e) => setForm({ ...form, descripcio: e.target.value })} />
            </Field>
            <Field label="Cost (€)" hint="En marcar-la Resolta amb cost, es crea una despesa de “Manteniment” automàticament.">
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </Field>
            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={saving}>
                <Plus className="h-4 w-4" /> {saving ? 'Desant…' : 'Afegir'}
              </Button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="mb-4 max-w-xs">
        <Select value={filtre} onChange={(e) => setFiltre(e.target.value)}>
          <option value="">Totes</option>
          {estatIncidenciaValues.map((e) => (
            <option key={e} value={e}>
              {ESTAT_INCIDENCIA_LABELS[e]}
            </option>
          ))}
        </Select>
      </div>

      {incidencies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Cap incidència.
        </div>
      ) : (
        <div className="space-y-3">
          {incidencies.map((i) => (
            <Card key={i.id} className={i.estat === 'RESOLTA' ? 'opacity-60' : ''}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{i.titol}</span>
                    <Badge tone={PRIO_TONE[i.prioritat]}>{PRIORITAT_INCIDENCIA_LABELS[i.prioritat]}</Badge>
                    <Badge tone={ESTAT_TONE[i.estat]}>{ESTAT_INCIDENCIA_LABELS[i.estat]}</Badge>
                    {i.habitacio && <span className="text-xs text-slate-500">Hab. {i.habitacio.nom}</span>}
                    <span className="text-xs text-slate-400">{formatDate(i.data)}</span>
                  </div>
                  {i.descripcio && <p className="mt-1 text-sm text-slate-700">{i.descripcio}</p>}
                  {i.cost != null && <p className="mt-1 text-xs text-slate-500">Cost: {formatEur(Number(i.cost))}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select className="h-9" value={i.estat} onChange={(e) => canviEstat(i, e.target.value)}>
                    {estatIncidenciaValues.map((e) => (
                      <option key={e} value={e}>
                        {ESTAT_INCIDENCIA_LABELS[e]}
                      </option>
                    ))}
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => eliminar(i)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
