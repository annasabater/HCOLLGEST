'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Search, Trash2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getJSON, postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { GRAVETAT_AVIS_LABELS, gravetatAvisValues } from '@/lib/validation/avis';

interface Avis {
  id: string;
  nom: string;
  telefon: string | null;
  email: string | null;
  motiu: string;
  gravetat: 'BAIXA' | 'MITJA' | 'ALTA';
  notes: string | null;
  actiu: boolean;
  createdAt: string;
}

const TONE = { ALTA: 'danger', MITJA: 'warning', BAIXA: 'neutral' } as const;

const emptyForm = { nom: '', telefon: '', email: '', gravetat: 'MITJA', motiu: '', notes: '' };

export default function AvisosPage() {
  const [avisos, setAvisos] = useState<Avis[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await getJSON<{ avisos: Avis[] }>(`/api/avisos${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
    setAvisos(res.avisos);
  }, [q]);
  useEffect(() => {
    load();
  }, [load]);

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await postJSON('/api/avisos', form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant l’avís');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(a: Avis) {
    await patchJSON(`/api/avisos/${a.id}`, { actiu: !a.actiu });
    await load();
  }
  async function eliminar(a: Avis) {
    if (!confirm(`Eliminar l’avís de ${a.nom}?`)) return;
    await delJSON(`/api/avisos/${a.id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avisos interns"
        subtitle="Persones a vigilar o no acollir, encara que no siguin clients (per nom o telèfon)"
      />

      <Card>
        <CardHeader>
          <CardTitle>Nou avís</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={afegir} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nom" required>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom i cognoms o àlies" />
            </Field>
            <Field label="Telèfon">
              <Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} placeholder="Opcional" />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Opcional" />
            </Field>
            <Field label="Gravetat">
              <Select value={form.gravetat} onChange={(e) => setForm({ ...form, gravetat: e.target.value })}>
                {gravetatAvisValues.map((g) => (
                  <option key={g} value={g}>
                    {GRAVETAT_AVIS_LABELS[g]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Motiu" required className="sm:col-span-2">
              <Input value={form.motiu} onChange={(e) => setForm({ ...form, motiu: e.target.value })} placeholder="P. ex. va deixar l’habitació en mal estat" />
            </Field>
            <Field label="Notes internes" className="sm:col-span-2 lg:col-span-3">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="Detalls addicionals (només per a tu)"
              />
            </Field>
            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving}>
                <Plus className="h-4 w-4" /> {saving ? 'Desant…' : 'Afegir avís'}
              </Button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per nom, telèfon o motiu…"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {avisos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Cap avís registrat.
        </div>
      ) : (
        <div className="space-y-3">
          {avisos.map((a) => (
            <Card key={a.id} className={a.actiu ? '' : 'opacity-60'}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${a.actiu ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span className="font-medium text-slate-900">{a.nom}</span>
                    <Badge tone={TONE[a.gravetat]}>{GRAVETAT_AVIS_LABELS[a.gravetat]}</Badge>
                    {!a.actiu && <Badge tone="neutral">Inactiu</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{a.motiu}</p>
                  {(a.telefon || a.email) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {a.telefon && <>📞 {a.telefon}</>} {a.email && <>· ✉ {a.email}</>}
                    </p>
                  )}
                  {a.notes && <p className="mt-1 text-xs italic text-slate-500">{a.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => toggle(a)}>
                    {a.actiu ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => eliminar(a)}>
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
