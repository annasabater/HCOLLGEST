'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Paperclip, Filter, Camera, Upload, X, Users, ShieldCheck, ShieldOff } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Eur, HideAmountsButton } from '@/components/finances/amounts-visibility';
import { getJSON, postJSON, patchJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur, cn } from '@/lib/utils';
import { toISODate } from '@/lib/dates';
import { optionsFrom, metodeCobramentValues, METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';

// ─── Tipus ────────────────────────────────────────────────────────────────────

interface Cat { id: string; nom: string }
interface Prov { id: string; nom: string }
interface Hab { id: string; nom: string }
interface Gasto {
  id: string;
  data: string;
  import: string | number;
  descripcio: string;
  metodePagament: keyof typeof METODE_COBRAMENT_LABELS;
  adjuntPath: string | null;
  esFianca: boolean;
  categoria: { nom: string };
  proveidor: { nom: string } | null;
  habitacio: { nom: string } | null;
}

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

// ─── Gastos fixes ─────────────────────────────────────────────────────────────

const FREQUENCIES = ['MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'BIENNAL', 'PUNTUAL'];
const FREQ_LABELS: Record<string, string> = {
  MENSUAL: 'Mensual', TRIMESTRAL: 'Trimestral', SEMESTRAL: 'Semestral',
  ANUAL: 'Anual', BIENNAL: 'Biennal', PUNTUAL: 'Puntual',
};
const METODES_FIX = ['EFECTIU', 'TARGETA', 'TRANSFERENCIA', 'BIZUM', 'ALTRES'];
const METODE_LABELS_FIX: Record<string, string> = {
  EFECTIU: 'Efectiu', TARGETA: 'Targeta', TRANSFERENCIA: 'Transferencia', BIZUM: 'Bizum', ALTRES: 'Altres',
};

function statusInfo(properaData: string): { label: string; tone: 'success' | 'warning' | 'danger' } {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const propera = new Date(properaData); propera.setHours(0, 0, 0, 0);
  const diff = (propera.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: 'Vençut', tone: 'danger' };
  if (diff <= 7) return { label: 'Vença aviat', tone: 'warning' };
  return { label: 'Al dia', tone: 'success' };
}

function advanceDateFix(date: Date, frequencia: string): Date {
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
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setMonth(end.getMonth() + 6);
  const results: { monthKey: string }[] = [];
  if (g.frequencia === 'PUNTUAL') {
    const d = new Date(g.properaData);
    if (d >= now && d <= end) results.push({ monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
    return results;
  }
  let cursor = new Date(g.properaData); let safe = 0;
  while (cursor <= end && safe < 50) {
    if (cursor >= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      if (!results.find((r) => r.monthKey === key)) results.push({ monthKey: key });
    }
    cursor = advanceDateFix(cursor, g.frequencia); safe++;
  }
  return results;
}

function getNext6MonthKeys(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });
}

interface FormStateFix {
  activitat: string; frequencia: string; importPrevist: string;
  metodePagament: string; properaData: string; observacions: string;
}
const EMPTY_FIX: FormStateFix = { activitat: '', frequencia: 'MENSUAL', importPrevist: '', metodePagament: 'TRANSFERENCIA', properaData: '', observacions: '' };

function GastoFixForm({ initial, onSave, onCancel, loading }: { initial: FormStateFix; onSave: (f: FormStateFix) => void; onCancel: () => void; loading: boolean }) {
  const [form, setForm] = useState<FormStateFix>(initial);
  const set = (k: keyof FormStateFix) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Field label="Activitat" required htmlFor="gf-act"><Input id="gf-act" value={form.activitat} onChange={set('activitat')} placeholder="Lloguer, llum, asseguranca..." /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frequencia" htmlFor="gf-freq">
          <Select id="gf-freq" value={form.frequencia} onChange={set('frequencia')}>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
          </Select>
        </Field>
        <Field label="Import previst (EUR)" htmlFor="gf-imp">
          <Input id="gf-imp" type="number" step="0.01" min="0" value={form.importPrevist} onChange={set('importPrevist')} placeholder="0.00" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Metode de pagament" htmlFor="gf-met">
          <Select id="gf-met" value={form.metodePagament} onChange={set('metodePagament')}>
            {METODES_FIX.map((m) => <option key={m} value={m}>{METODE_LABELS_FIX[m]}</option>)}
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
        <Button size="sm" onClick={() => onSave(form)} disabled={loading || !form.activitat || !form.properaData}>{loading ? 'Desant...' : 'Desar'}</Button>
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={loading}>Cancel&middot;lar</Button>
      </div>
    </div>
  );
}

function GastosFixesTab() {
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
    } catch { setError('Error carregant els gastos fixos'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(form: FormStateFix) {
    try {
      setSaving(true);
      await postJSON('/api/gastos-fixos', { activitat: form.activitat, frequencia: form.frequencia, importPrevist: form.importPrevist ? parseFloat(form.importPrevist) : null, metodePagament: form.metodePagament, properaData: form.properaData, observacions: form.observacions || null });
      setShowNew(false); await load();
    } catch { setError('Error creant el gasto fix'); } finally { setSaving(false); }
  }

  async function handleEdit(id: string, form: FormStateFix) {
    try {
      setSaving(true);
      await patchJSON(`/api/gastos-fixos/${id}`, { activitat: form.activitat, frequencia: form.frequencia, importPrevist: form.importPrevist ? parseFloat(form.importPrevist) : null, metodePagament: form.metodePagament, properaData: form.properaData, observacions: form.observacions || null });
      setEditingId(null); await load();
    } catch { setError('Error actualitzant el gasto fix'); } finally { setSaving(false); }
  }

  async function handlePagar(id: string) {
    try { setPayingId(id); await postJSON(`/api/gastos-fixos/${id}/pagar`, {}); await load(); }
    catch { setError('Error registrant el pagament'); } finally { setPayingId(null); }
  }

  const monthKeys = getNext6MonthKeys();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setShowNew(true); setEditingId(null); }}>+ Nova despesa fixa</Button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}<button className="ml-2 underline" onClick={() => setError(null)}>Tancar</button></div>}

      {showNew && <GastoFixForm initial={EMPTY_FIX} onSave={handleCreate} onCancel={() => setShowNew(false)} loading={saving} />}

      {loading ? (
        <p className="text-sm text-slate-500">Carregant...</p>
      ) : gastos.length === 0 ? (
        <p className="text-sm text-slate-500">Cap despesa fixa registrada. Fes clic a &quot;Nova despesa fixa&quot; per afegir-ne una.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gastos.map((g) => {
            const status = statusInfo(g.properaData);
            const isEditing = editingId === g.id;
            const editInitial: FormStateFix = { activitat: g.activitat, frequencia: g.frequencia, importPrevist: g.importPrevist ?? '', metodePagament: g.metodePagament, properaData: g.properaData.slice(0, 10), observacions: g.observacions ?? '' };
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
                    <GastoFixForm initial={editInitial} onSave={(form) => handleEdit(g.id, form)} onCancel={() => setEditingId(null)} loading={saving} />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-slate-800">{g.importPrevist != null ? formatEur(g.importPrevist) : '—'}</span>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                      <div className="text-sm text-slate-600"><span className="font-medium">Propera data:</span> {formatDate(g.properaData)}</div>
                      <div className="text-sm text-slate-600"><span className="font-medium">Pagament:</span> {METODE_LABELS_FIX[g.metodePagament] ?? g.metodePagament}</div>
                      {g.observacions && <p className="text-xs text-slate-500">{g.observacions}</p>}
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
                        <Button size="sm" variant="primary" onClick={() => handlePagar(g.id)} disabled={payingId === g.id}>{payingId === g.id ? 'Registrant...' : 'Registrar pagament'}</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(g.id)}>Editar</Button>
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
              const gastosMes = gastos.filter((g) => getOccurrencesInNext6Months(g).some((o) => o.monthKey === monthKey));
              if (gastosMes.length === 0) return null;
              const now = new Date();
              const [y, m] = monthKey.split('-');
              const monthPast = new Date(Number(y), Number(m), 0) < now;
              return (
                <div key={monthKey} className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">{monthLabel(monthKey)}</h3>
                  <div className="space-y-2">
                    {gastosMes.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-sm">
                        <span className={monthPast ? 'text-green-700' : 'text-slate-700'}>{monthPast ? '✓ ' : ''}{g.activitat}</span>
                        <span className="font-medium text-slate-800">{g.importPrevist != null ? formatEur(g.importPrevist) : '—'}</span>
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

// ─── Gastos variables ─────────────────────────────────────────────────────────

function GastosVariablesTab() {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [proveidors, setProveidors] = useState<Prov[]>([]);
  const [habitacions, setHabitacions] = useState<Hab[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [_total, setTotal] = useState(0);
  const [perCat, setPerCat] = useState<Record<string, number>>({});

  const [fDesde, setFDesde] = useState('');
  const [fFins, setFFins] = useState('');
  const [fCat, setFCat] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [nova, setNova] = useState({ data: toISODate(new Date()), import: '', categoriaId: '', proveidorId: '', habitacioId: '', metodePagament: 'TARGETA', descripcio: '', esFianca: false });
  const [file, setFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (fDesde) p.set('desde', fDesde);
    if (fFins) p.set('fins', fFins);
    if (fCat) p.set('categoriaId', fCat);
    const res = await getJSON<{ gastos: Gasto[]; total: number; perCategoria: Record<string, number> }>(`/api/gastos?${p.toString()}`);
    setGastos(res.gastos); setTotal(res.total); setPerCat(res.perCategoria);
  }, [fDesde, fFins, fCat]);

  useEffect(() => {
    getJSON<{ categories: Cat[] }>('/api/categories-gasto').then((r) => setCategories(r.categories));
    getJSON<{ proveidors: Prov[] }>('/api/proveidors').then((r) => setProveidors(r.proveidors));
    getJSON<{ habitacions: Hab[] }>('/api/habitacions').then((r) => setHabitacions(r.habitacions));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nova.categoriaId || !nova.import) return;
    setSaving(true); setError(null);
    try {
      let adjuntPath: string | undefined;
      if (file) {
        const fd = new FormData(); fd.append('file', file);
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!up.ok) throw new ApiError('No s\'ha pogut pujar l\'adjunt', up.status);
        adjuntPath = (await up.json()).path;
      }
      await postJSON('/api/gastos', { data: nova.data, import: Number(nova.import), categoriaId: nova.categoriaId, proveidorId: nova.proveidorId || undefined, habitacioId: nova.habitacioId || undefined, metodePagament: nova.metodePagament, descripcio: nova.descripcio, adjuntPath, esFianca: nova.esFianca });
      setNova({ data: toISODate(new Date()), import: '', categoriaId: '', proveidorId: '', habitacioId: '', metodePagament: 'TARGETA', descripcio: '', esFianca: false });
      setFile(null); setShowForm(false); load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Error desant la despesa'); } finally { setSaving(false); }
  }

  async function esborrar(id: string) {
    if (!confirm('Segur que vols eliminar aquesta despesa?')) return;
    await fetch(`/api/gastos/${id}`, { method: 'DELETE' }); load();
  }

  async function toggleFianca(g: Gasto) {
    const nouEsFianca = !g.esFianca;
    const msg = nouEsFianca
      ? 'Marcar com a fiança/dipòsit? No comptarà al balanç.'
      : 'Marcar com a despesa real? Comptarà al balanç.';
    if (!confirm(msg)) return;
    try {
      await patchJSON(`/api/gastos/${g.id}`, { esFianca: nouEsFianca });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error actualitzant');
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <div className="flex gap-2">
          <HideAmountsButton />
          <Button onClick={() => setShowForm((s) => !s)}><Plus className="h-4 w-4" /> Nova despesa</Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crear} className="grid gap-3 sm:grid-cols-3">
              <Field label="Data" required><Input type="date" value={nova.data} onChange={(e) => setNova({ ...nova, data: e.target.value })} /></Field>
              <Field label="Import €" required><Input type="number" step="0.01" value={nova.import} onChange={(e) => setNova({ ...nova, import: e.target.value })} /></Field>
              <Field label="Categoria" required>
                <Select value={nova.categoriaId} onChange={(e) => setNova({ ...nova, categoriaId: e.target.value })}>
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </Select>
              </Field>
              <Field label="Proveïdor">
                <Select value={nova.proveidorId} onChange={(e) => setNova({ ...nova, proveidorId: e.target.value })}>
                  <option value="">—</option>
                  {proveidors.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </Select>
              </Field>
              <Field label="Habitació" hint="Deixa-ho en «General» si no és d'una habitació concreta.">
                <Select value={nova.habitacioId} onChange={(e) => setNova({ ...nova, habitacioId: e.target.value })}>
                  <option value="">General</option>
                  {habitacions.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
                </Select>
              </Field>
              <Field label="Mètode de pagament">
                <Select value={nova.metodePagament} onChange={(e) => setNova({ ...nova, metodePagament: e.target.value })}>
                  {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Adjunt (factura/ticket)" hint="Fes una foto amb el mòbil o puja un fitxer (PDF o imatge).">
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}><Camera className="h-4 w-4" /> Fer foto</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Pujar fitxer</Button>
                  {file && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                      <span className="max-w-40 truncate">{file.name}</span>
                      <button type="button" onClick={() => { setFile(null); if (cameraRef.current) cameraRef.current.value = ''; if (fileRef.current) fileRef.current.value = ''; }} className="text-slate-400 hover:text-red-600" aria-label="Treure l'adjunt"><X className="h-3.5 w-3.5" /></button>
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Descripció" required className="sm:col-span-3"><Input value={nova.descripcio} onChange={(e) => setNova({ ...nova, descripcio: e.target.value })} /></Field>
              <label className="sm:col-span-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-amber-600"
                  checked={nova.esFianca}
                  onChange={(e) => setNova({ ...nova, esFianca: e.target.checked })}
                />
                <span>
                  <span className="font-medium text-amber-800">És una fiança</span>
                  <span className="block text-xs text-amber-700/80">
                    No es comptarà com a despesa al balanç. Quan la vulguis declarar, desmarca-la (passa a despesa real).
                  </span>
                </span>
              </label>
              <div className="sm:col-span-3 flex items-center gap-3">
                <Button type="submit" disabled={saving}>{saving ? 'Desant…' : 'Desar despesa'}</Button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Des de"><Input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} /></Field>
          <Field label="Fins a"><Input type="date" value={fFins} onChange={(e) => setFFins(e.target.value)} /></Field>
          <Field label="Categoria">
            <Select className="min-w-44" value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="">Totes</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Select>
          </Field>
          <div className="ml-auto flex flex-wrap gap-2">
            {Object.entries(perCat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nom, imp]) => (
              <Badge key={nom} tone="neutral">{nom}: <Eur value={imp} /></Badge>
            ))}
          </div>
        </CardBody>
      </Card>

      {gastos.length === 0 ? (
        <EmptyState><Filter className="mx-auto mb-2 h-5 w-5 text-slate-300" /> Cap despesa en aquest període.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr><Th>Data</Th><Th>Descripció</Th><Th>Categoria</Th><Th>Habitació</Th><Th>Proveïdor</Th><Th>Mètode</Th><Th className="text-right">Import</Th><Th></Th></tr>
          </Thead>
          <tbody>
            {gastos.map((g) => (
              <Tr key={g.id} className={g.esFianca ? 'bg-amber-50/40' : undefined}>
                <Td>{formatDate(g.data)}</Td>
                <Td className="font-medium text-slate-800">
                  {g.descripcio}
                  {g.esFianca && (
                    <Badge tone="warning" className="ml-2 align-middle">Fiança</Badge>
                  )}
                  {g.adjuntPath && <a href={`/api/files?path=${encodeURIComponent(g.adjuntPath)}`} target="_blank" rel="noreferrer" className="ml-2 inline-flex text-brand-600" title="Veure adjunt"><Paperclip className="h-3.5 w-3.5" /></a>}
                </Td>
                <Td>{g.categoria.nom}</Td>
                <Td>{g.habitacio?.nom ? `Hab. ${g.habitacio.nom}` : 'General'}</Td>
                <Td>{g.proveidor?.nom ?? '—'}</Td>
                <Td>{METODE_COBRAMENT_LABELS[g.metodePagament]}</Td>
                <Td className={cn('text-right font-medium', g.esFianca && 'text-amber-700')}><Eur value={Number(g.import)} /></Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className={g.esFianca ? 'text-amber-600 hover:text-slate-600' : 'text-slate-400 hover:text-amber-600'}
                      onClick={() => toggleFianca(g)}
                      title={g.esFianca ? 'Marcar com a despesa real (comptarà al balanç)' : 'Marcar com a fiança/dipòsit (no comptarà al balanç)'}
                    >
                      {g.esFianca ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                    <button className="text-slate-400 hover:text-red-600" onClick={() => esborrar(g.id)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

// ─── Pestanya Personal ────────────────────────────────────────────────────────

interface JornadaRow {
  id: string;
  data: string;
  import: string | number;
  notes: string | null;
  pagada: boolean;
  treballador: { id: string; nom: string; carrec: string | null } | null;
}

function PersonalTab() {
  const mesActual = toISODate(new Date()).slice(0, 7);
  const [mes, setMes] = useState(mesActual);
  const [jornades, setJornades] = useState<JornadaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getJSON<{ jornades: JornadaRow[] }>(`/api/jornades?mes=${mes}`)
      .then((r) => setJornades(r.jornades))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mes]);

  const total = jornades.reduce((a, j) => a + Number(j.import), 0);
  const pendent = jornades.filter((j) => !j.pagada).reduce((a, j) => a + Number(j.import), 0);

  // Genera 12 mesos disponibles (mes actual + 11 anteriors)
  const mesos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Mes:</span>
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm capitalize"
          >
            {mesos.map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01T00:00:00`).toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </label>
        <span className="text-sm text-slate-600">
          Total: <strong>{formatEur(total)}</strong>
        </span>
        {pendent > 0 && (
          <span className="text-sm text-amber-600">
            Pendent: <strong>{formatEur(pendent)}</strong>
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Carregant…</p>
      ) : jornades.length === 0 ? (
        <EmptyState>Sense registres de personal per a aquest mes.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Data</Th>
              <Th>Treballador</Th>
              <Th>Concepte</Th>
              <Th>Estat</Th>
              <Th className="text-right">Import</Th>
            </tr>
          </Thead>
          <tbody>
            {jornades.map((j) => (
              <Tr key={j.id}>
                <Td>{formatDate(j.data)}</Td>
                <Td>
                  <a href={`/personal/${j.treballador?.id}`} className="font-medium text-brand-700 hover:underline">
                    {j.treballador?.nom ?? '—'}
                  </a>
                  {j.treballador?.carrec && (
                    <span className="ml-1 text-xs text-slate-400">({j.treballador.carrec})</span>
                  )}
                </Td>
                <Td className="text-sm text-slate-600">
                  {j.notes
                    ? j.notes.replace('[auto] ', '')
                    : `${Number(j.import) > 0 ? 'Jornada' : '—'}`}
                </Td>
                <Td>
                  {j.pagada
                    ? <Badge tone="success">Pagat</Badge>
                    : <Badge tone="warning">Pendent</Badge>}
                </Td>
                <Td className="text-right font-medium">{formatEur(Number(j.import))}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

// ─── Pàgina principal ─────────────────────────────────────────────────────────

function GastosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab') ?? 'variables';

  return (
    <div>
      <PageHeader title="Despeses" subtitle="Gestió de despeses del hostal" />
      <FinancesNav />

      {/* Sub-pestanyes Variables / Fixes / Personal */}
      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {(['variables', 'fixes', 'personal'] as const).map((t) => (
          <button
            key={t}
            onClick={() => router.replace(t === 'variables' ? '/gastos' : `/gastos?tab=${t}`)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors',
              tab === t ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t === 'variables' ? 'Variables' : t === 'fixes' ? 'Fixes' : (
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Personal</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'fixes' ? <GastosFixesTab /> : tab === 'personal' ? <PersonalTab /> : <GastosVariablesTab />}
    </div>
  );
}

export default function GastosPage() {
  return (
    <Suspense>
      <GastosContent />
    </Suspense>
  );
}
