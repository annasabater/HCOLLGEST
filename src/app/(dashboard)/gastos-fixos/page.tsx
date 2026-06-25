'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { getJSON, postJSON, patchJSON } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';

interface GasFix {
  id: string;
  activitat: string;
  frequencia: string;
  importPrevist: string | null;
  metodePagament: string;
  properaData: string;
  observacions: string | null;
  gastos: { id: string; data: string; import: string }[];
}

const FREQUENCIES = ['MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'BIENNAL', 'PUNTUAL'];
const FREQ_LABELS: Record<string, string> = {
  MENSUAL: 'Mensual',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
  BIENNAL: 'Biennal',
  PUNTUAL: 'Puntual',
};
const METODES = ['EFECTIU', 'TARGETA', 'TRANSFERENCIA', 'BIZUM', 'ALTRES'];
const METODE_LABELS: Record<string, string> = {
  EFECTIU: 'Efectiu',
  TARGETA: 'Targeta',
  TRANSFERENCIA: 'Transferencia',
  BIZUM: 'Bizum',
  ALTRES: 'Altres',
};

function statusInfo(properaData: string): { label: string; tone: 'success' | 'warning' | 'danger' } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const propera = new Date(properaData);
  propera.setHours(0, 0, 0, 0);
  const diff = (propera.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: 'Vençut', tone: 'danger' };
  if (diff <= 7) return { label: 'Vença aviat', tone: 'warning' };
  return { label: 'Al dia', tone: 'success' };
}

function advanceDate(date: Date, frequencia: string): Date {
  const next = new Date(date);
  switch (frequencia) {
    case 'MENSUAL': next.setMonth(next.getMonth() + 1); break;
    case 'TRIMESTRAL': next.setMonth(next.getMonth() + 3); break;
    case 'SEMESTRAL': next.setMonth(next.getMonth() + 6); break;
    case 'ANUAL': next.setMonth(next.getMonth() + 12); break;
    case 'BIENNAL': next.setMonth(next.getMonth() + 24); break;
  }
  return next;
}

function getOccurrencesInNext6Months(g: GasFix): { monthKey: string }[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setMonth(end.getMonth() + 6);

  const results: { monthKey: string }[] = [];
  if (g.frequencia === 'PUNTUAL') {
    const d = new Date(g.properaData);
    if (d >= now && d <= end) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      results.push({ monthKey: key });
    }
    return results;
  }

  let cursor = new Date(g.properaData);
  let safetyLimit = 0;
  while (cursor <= end && safetyLimit < 50) {
    if (cursor >= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      if (!results.find((r) => r.monthKey === key)) {
        results.push({ monthKey: key });
      }
    }
    cursor = advanceDate(cursor, g.frequencia);
    safetyLimit++;
  }
  return results;
}

function getNext6MonthKeys(): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });
}

interface FormState {
  activitat: string;
  frequencia: string;
  importPrevist: string;
  metodePagament: string;
  properaData: string;
  observacions: string;
}

const EMPTY_FORM: FormState = {
  activitat: '',
  frequencia: 'MENSUAL',
  importPrevist: '',
  metodePagament: 'TRANSFERENCIA',
  properaData: '',
  observacions: '',
};

function GastoForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Field label="Activitat" required htmlFor="gf-activitat">
        <Input id="gf-activitat" value={form.activitat} onChange={set('activitat')} placeholder="Lloguer, llum, asseguranca..." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frequencia" htmlFor="gf-freq">
          <Select id="gf-freq" value={form.frequencia} onChange={set('frequencia')}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{FREQ_LABELS[f]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Import previst (EUR)" htmlFor="gf-import">
          <Input id="gf-import" type="number" step="0.01" min="0" value={form.importPrevist} onChange={set('importPrevist')} placeholder="0.00" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Metode de pagament" htmlFor="gf-metode">
          <Select id="gf-metode" value={form.metodePagament} onChange={set('metodePagament')}>
            {METODES.map((m) => (
              <option key={m} value={m}>{METODE_LABELS[m]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Propera data" required htmlFor="gf-data">
          <Input id="gf-data" type="date" value={form.properaData} onChange={set('properaData')} />
        </Field>
      </div>
      <Field label="Observacions" htmlFor="gf-obs">
        <Input id="gf-obs" value={form.observacions} onChange={set('observacions')} placeholder="Notes addicionals..." />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)} disabled={loading || !form.activitat || !form.properaData}>
          {loading ? 'Desant...' : 'Desar'}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel&middot;lar
        </Button>
      </div>
    </div>
  );
}

export default function GastosFixosPage() {
  const [gastos, setGastos] = useState<GasFix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getJSON<{ gastos: GasFix[] }>('/api/gastos-fixos');
      setGastos(data.gastos);
    } catch {
      setError('Error carregant els gastos fixos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(form: FormState) {
    try {
      setSaving(true);
      await postJSON('/api/gastos-fixos', {
        activitat: form.activitat,
        frequencia: form.frequencia,
        importPrevist: form.importPrevist ? parseFloat(form.importPrevist) : null,
        metodePagament: form.metodePagament,
        properaData: form.properaData,
        observacions: form.observacions || null,
      });
      setShowNew(false);
      await load();
    } catch {
      setError('Error creant el gasto fix');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string, form: FormState) {
    try {
      setSaving(true);
      await patchJSON(`/api/gastos-fixos/${id}`, {
        activitat: form.activitat,
        frequencia: form.frequencia,
        importPrevist: form.importPrevist ? parseFloat(form.importPrevist) : null,
        metodePagament: form.metodePagament,
        properaData: form.properaData,
        observacions: form.observacions || null,
      });
      setEditingId(null);
      await load();
    } catch {
      setError('Error actualitzant el gasto fix');
    } finally {
      setSaving(false);
    }
  }

  async function handlePagar(id: string) {
    try {
      setPayingId(id);
      await postJSON(`/api/gastos-fixos/${id}/pagar`, {});
      await load();
    } catch {
      setError('Error registrant el pagament');
    } finally {
      setPayingId(null);
    }
  }

  const monthKeys = getNext6MonthKeys();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos fixos"
        subtitle="Despeses periodiques (lloguer, llum, assegurances...)"
        actions={
          <Button size="sm" onClick={() => { setShowNew(true); setEditingId(null); }}>
            + Nou gasto fix
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>Tancar</button>
        </div>
      )}

      {showNew && (
        <GastoForm
          initial={EMPTY_FORM}
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
          loading={saving}
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregant...</p>
      ) : gastos.length === 0 ? (
        <p className="text-sm text-slate-500">Cap gasto fix registrat. Fes clic a &quot;Nou gasto fix&quot; per afegir-ne un.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gastos.map((g) => {
            const status = statusInfo(g.properaData);
            const isEditing = editingId === g.id;
            const editInitial: FormState = {
              activitat: g.activitat,
              frequencia: g.frequencia,
              importPrevist: g.importPrevist ?? '',
              metodePagament: g.metodePagament,
              properaData: g.properaData.slice(0, 10),
              observacions: g.observacions ?? '',
            };
            return (
              <Card key={g.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{g.activitat}</CardTitle>
                    <Badge tone="neutral">{FREQ_LABELS[g.frequencia] ?? g.frequencia}</Badge>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {isEditing ? (
                    <GastoForm
                      initial={editInitial}
                      onSave={(form) => handleEdit(g.id, form)}
                      onCancel={() => setEditingId(null)}
                      loading={saving}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-slate-800">
                          {g.importPrevist != null ? formatEur(g.importPrevist) : '—'}
                        </span>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Propera data:</span>{' '}
                        {formatDate(g.properaData)}
                      </div>
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Pagament:</span>{' '}
                        {METODE_LABELS[g.metodePagament] ?? g.metodePagament}
                      </div>
                      {g.observacions && (
                        <p className="text-xs text-slate-500">{g.observacions}</p>
                      )}
                      {g.gastos.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500">Darrers pagaments</p>
                          {g.gastos.map((p) => (
                            <div key={p.id} className="flex justify-between text-xs text-slate-600">
                              <span>{formatDate(p.data)}</span>
                              <span>{formatEur(p.import)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handlePagar(g.id)}
                          disabled={payingId === g.id}
                        >
                          {payingId === g.id ? 'Registrant...' : 'Registrar pagament'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingId(g.id)}
                        >
                          Editar
                        </Button>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {gastos.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-slate-800">Proxims 6 mesos</h2>
          <div className="space-y-3">
            {monthKeys.map((monthKey) => {
              const gastosMes = gastos.filter((g) =>
                getOccurrencesInNext6Months(g).some((o) => o.monthKey === monthKey),
              );
              if (gastosMes.length === 0) return null;
              const now = new Date();
              const [y, m] = monthKey.split('-');
              const monthPast = new Date(Number(y), Number(m), 0) < now;
              return (
                <div key={monthKey} className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">
                    {monthLabel(monthKey)}
                  </h3>
                  <div className="space-y-2">
                    {gastosMes.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-sm">
                        <span className={monthPast ? 'text-green-700' : 'text-slate-700'}>
                          {monthPast ? '✓ ' : ''}{g.activitat}
                        </span>
                        <span className="font-medium text-slate-800">
                          {g.importPrevist != null ? formatEur(g.importPrevist) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
