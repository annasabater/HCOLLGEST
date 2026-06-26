'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, Tag, History } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { getJSON, postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatEur, formatDate } from '@/lib/utils';
import { TEMPORADA_LABELS, type Temporada } from '@/lib/validation/tarifa';

interface Hab {
  id: string;
  nom: string;
  tipus: string | null;
}
interface Tarifa {
  id: string;
  nom: string;
  temporada: Temporada | null;
  preuNit: string | number;
  preuMensual: string | number | null;
  tipusHabitacio: string | null;
  habitacioId: string | null;
  habitacio: { nom: string } | null;
  dataInici: string | null;
  dataFi: string | null;
  actiu: boolean;
  createdAt: string;
}

const TEMPORADA_TONE: Record<Temporada, 'danger' | 'warning' | 'info'> = {
  ALTA: 'danger',
  MITJA: 'warning',
  BAIXA: 'info',
};

const emptyForm = {
  nom: '',
  temporada: '' as Temporada | '',
  preuNit: '',
  preuMensual: '',
  dataInici: '',
  dataFi: '',
};

function fmtRange(t: Tarifa) {
  if (!t.dataInici && !t.dataFi) return 'Tot l\'any';
  const ini = t.dataInici ? formatDate(t.dataInici) : '…';
  const fi = t.dataFi ? formatDate(t.dataFi) : '…';
  return `${ini} – ${fi}`;
}

function TarifaBadge({ t }: { t: Tarifa }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {t.temporada && (
        <Badge tone={TEMPORADA_TONE[t.temporada]}>{TEMPORADA_LABELS[t.temporada]}</Badge>
      )}
      {!t.actiu && <Badge tone="neutral">Inactiva</Badge>}
    </div>
  );
}

function TarifaRow({
  t,
  onToggle,
  onDelete,
  compact = false,
}: {
  t: Tarifa;
  onToggle: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${t.actiu ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-800">{t.nom}</span>
          <TarifaBadge t={t} />
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
          <span><span className="font-medium text-slate-700">{formatEur(Number(t.preuNit))}</span>/nit</span>
          {t.preuMensual && (
            <span><span className="font-medium text-slate-700">{formatEur(Number(t.preuMensual))}</span>/mes</span>
          )}
          {!compact && <span>{fmtRange(t)}</span>}
        </div>
        {!compact && (
          <div className="mt-0.5 text-xs text-slate-400">{fmtRange(t)}</div>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="outline" onClick={onToggle} className="text-xs px-2 py-1 h-auto">
          {t.actiu ? 'Desactivar' : 'Activar'}
        </Button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-red-600"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function HabCard({
  hab,
  tarifes,
  onAfegir,
  onToggle,
  onDelete,
}: {
  hab: Hab;
  tarifes: Tarifa[];
  onAfegir: (habitacioId: string, data: typeof emptyForm) => Promise<void>;
  onToggle: (t: Tarifa) => void;
  onDelete: (t: Tarifa) => void;
}) {
  const [openForm, setOpenForm] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const actives = tarifes.filter((t) => t.actiu);
  const historic = tarifes.filter((t) => !t.actiu);
  const current = actives[0] ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await onAfegir(hab.id, form);
      setForm(emptyForm);
      setOpenForm(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Capçalera habitació */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          {hab.nom}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-slate-800">Habitació {hab.nom}</div>
          {hab.tipus && <div className="text-xs text-slate-400">{hab.tipus}</div>}
        </div>
        {current ? (
          <div className="text-right text-sm">
            <div className="font-semibold text-slate-800">{formatEur(Number(current.preuNit))}<span className="text-xs font-normal text-slate-400">/nit</span></div>
            {current.preuMensual && (
              <div className="text-xs text-slate-500">{formatEur(Number(current.preuMensual))}/mes</div>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Sense tarifa</span>
        )}
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Tarifa activa */}
        {actives.length > 0 ? (
          <div className="space-y-2">
            {actives.map((t) => (
              <TarifaRow key={t.id} t={t} onToggle={() => onToggle(t)} onDelete={() => onDelete(t)} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-1">Cap tarifa activa per a aquesta habitació.</p>
        )}

        {/* Botó nova tarifa */}
        {!openForm && (
          <button
            type="button"
            onClick={() => setOpenForm(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-brand-300 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
          >
            <Plus className="h-4 w-4" /> Nova tarifa per a Hab. {hab.nom}
          </button>
        )}

        {/* Formulari nova tarifa */}
        {openForm && (
          <form onSubmit={submit} className="rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-3">
            <p className="text-xs font-semibold text-brand-700 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Nova tarifa · Hab. {hab.nom}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Nom">
                <Input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Estàndard, Promoció juny…"
                  required
                />
              </Field>
              <Field label="Temporada">
                <Select value={form.temporada} onChange={(e) => setForm({ ...form, temporada: e.target.value as Temporada | '' })}>
                  <option value="">Sense temporada</option>
                  <option value="ALTA">Temporada alta</option>
                  <option value="MITJA">Temporada mitja</option>
                  <option value="BAIXA">Temporada baixa</option>
                </Select>
              </Field>
              <Field label="Preu/nit (€)" required>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.preuNit}
                  onChange={(e) => setForm({ ...form, preuNit: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Preu/mes (€)" hint="Opcional">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.preuMensual}
                  onChange={(e) => setForm({ ...form, preuMensual: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Des de">
                <Input type="date" value={form.dataInici} onChange={(e) => setForm({ ...form, dataInici: e.target.value })} />
              </Field>
              <Field label="Fins a">
                <Input type="date" value={form.dataFi} onChange={(e) => setForm({ ...form, dataFi: e.target.value })} />
              </Field>
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Desant…' : 'Desar tarifa'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setOpenForm(false); setErr(null); }}>
                Cancel·lar
              </Button>
            </div>
          </form>
        )}

        {/* Historial */}
        {historic.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOpenHistory((v) => !v)}
              className="flex w-full items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 py-1"
            >
              <History className="h-3.5 w-3.5" />
              Historial ({historic.length})
              <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${openHistory ? 'rotate-180' : ''}`} />
            </button>
            {openHistory && (
              <div className="mt-2 space-y-2">
                {historic.map((t) => (
                  <TarifaRow key={t.id} t={t} compact onToggle={() => onToggle(t)} onDelete={() => onDelete(t)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TarifesPage() {
  const [tarifes, setTarifes] = useState<Tarifa[]>([]);
  const [habitacions, setHabitacions] = useState<Hab[]>([]);

  const load = useCallback(async () => {
    const r = await getJSON<{ tarifes: Tarifa[] }>('/api/tarifes');
    setTarifes(r.tarifes);
  }, []);

  useEffect(() => {
    load();
    getJSON<{ habitacions: Hab[] }>('/api/habitacions').then((r) => setHabitacions(r.habitacions));
  }, [load]);

  async function afegir(habitacioId: string, form: typeof emptyForm) {
    await postJSON('/api/tarifes', {
      nom: form.nom,
      temporada: form.temporada || undefined,
      preuNit: Number(form.preuNit),
      preuMensual: form.preuMensual ? Number(form.preuMensual) : undefined,
      habitacioId,
      dataInici: form.dataInici || undefined,
      dataFi: form.dataFi || undefined,
    });
    await load();
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

  // Per cada habitació, les seves tarifes ordenades (actives primer, despres per data creació desc)
  function tarifesDeHab(habId: string) {
    return tarifes
      .filter((t) => t.habitacioId === habId)
      .sort((a, b) => {
        if (a.actiu !== b.actiu) return a.actiu ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  return (
    <div>
      <PageHeader
        title="Tarifes"
        subtitle="Preu per habitació i temporada — s'aplica automàticament a les factures"
      />
      <FinancesNav />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {habitacions.map((hab) => (
          <HabCard
            key={hab.id}
            hab={hab}
            tarifes={tarifesDeHab(hab.id)}
            onAfegir={afegir}
            onToggle={toggle}
            onDelete={eliminar}
          />
        ))}
      </div>

      {habitacions.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-400">
          No hi ha habitacions configurades. Crea-les primer des de la secció d&apos;habitacions.
        </p>
      )}
    </div>
  );
}
