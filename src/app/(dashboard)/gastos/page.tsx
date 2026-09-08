'use client';

import { Fragment, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Paperclip, Filter, Camera, Upload, X, ShieldCheck, ShieldOff, Pencil, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
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
// Valors habituals d'un proveïdor (de la seva última despesa).
interface ProvDefaults {
  categoriaId: string;
  ivaPercent: number | null;
  irpfPercent: number | null;
  metodePagament: string;
}
// Resultat de l'escàner de tiquets/factures (/api/ocr/gasto).
interface GastoOcrClient {
  data?: string;
  proveidorNom?: string;
  proveidorNif?: string;
  proveidorActivitat?: string;
  proveidorTelefon?: string;
  proveidorEmail?: string;
  proveidorAdreca?: string;
  proveidorWeb?: string;
  numFactura?: string;
  baseImposable?: number;
  ivaPercent?: number;
  irpfPercent?: number;
  import?: number;
  descripcio?: string;
  categoria?: string;
  warnings?: string[];
}
interface Gasto {
  id: string;
  data: string;
  import: string | number;
  descripcio: string;
  metodePagament: keyof typeof METODE_COBRAMENT_LABELS;
  adjuntPath: string | null;
  esFianca: boolean;
  numFactura: string | null;
  categoriaId: string;
  proveidorId: string | null;
  habitacioId: string | null;
  categoria: { nom: string };
  proveidor: { nom: string } | null;
  habitacio: { nom: string } | null;
}

interface EditForm {
  data: string; import: string; categoriaId: string; proveidorId: string; habitacioId: string;
  metodePagament: string; descripcio: string; numFactura: string;
}

interface GasFix {
  id: string;
  activitat: string;
  frequencia: string;
  importPrevist: string | null;
  metodePagament: string;
  properaData: string;
  observacions: string | null;
  gastos: { id: string; data: string; import: string; adjuntPath: string | null; numFactura: string | null }[];
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

function GastosFixesTab({ desde, fins }: { desde: string; fins: string }) {
  const [gastos, setGastos] = useState<GasFix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Registrar la factura d'una despesa fixa (puja foto → crea la despesa).
  const [registrarG, setRegistrarG] = useState<GasFix | null>(null);
  const [regForm, setRegForm] = useState({ data: toISODate(new Date()), import: '', esFianca: false, metodePagament: 'TRANSFERENCIA' });
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regBusy, setRegBusy] = useState(false);
  const [regScan, setRegScan] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

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
      // Mateix model que /serveis (ServeiRecurrent): usem el seu endpoint.
      await patchJSON(`/api/serveis-recurrents/${id}`, { activitat: form.activitat, frequencia: form.frequencia, importPrevist: form.importPrevist ? parseFloat(form.importPrevist) : null, metodePagament: form.metodePagament, properaData: form.properaData, observacions: form.observacions || null });
      setEditingId(null); await load();
    } catch { setError('Error actualitzant la despesa fixa'); } finally { setSaving(false); }
  }

  function obreRegistrar(g: GasFix) {
    setRegistrarG(g);
    setRegForm({
      data: toISODate(new Date(g.properaData) < new Date() ? new Date(g.properaData) : new Date()),
      import: g.importPrevist != null ? String(Number(g.importPrevist)) : '',
      esFianca: false,
      metodePagament: g.metodePagament,
    });
    setRegFile(null); setRegError(null);
  }

  // En triar la foto de la factura, l'escaneja (OCR) per proposar import i data.
  async function regTriaFitxer(f: File | null) {
    setRegFile(f);
    if (!f || !f.type.startsWith('image/')) return;
    setRegScan(true);
    try {
      const fd = new FormData(); fd.append('image', f);
      const res = await fetch('/api/ocr/gasto', { method: 'POST', body: fd });
      if (res.ok) {
        const { result } = (await res.json()) as { result: { import?: number; data?: string } };
        setRegForm((p) => ({ ...p, import: result.import != null ? String(result.import) : p.import, data: result.data || p.data }));
      }
    } catch { /* ignore */ } finally { setRegScan(false); }
  }

  async function registrarFactura() {
    if (!registrarG) return;
    if (!regForm.import) { setRegError('Cal l’import de la factura.'); return; }
    setRegBusy(true); setRegError(null);
    try {
      let adjuntPath: string | undefined;
      if (regFile) {
        const fd = new FormData(); fd.append('file', regFile);
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!up.ok) throw new ApiError('No s\'ha pogut pujar la factura', up.status);
        adjuntPath = (await up.json()).path;
      }
      await postJSON(`/api/serveis-recurrents/${registrarG.id}/registrar`, {
        data: regForm.data,
        import: Number(regForm.import),
        esFianca: regForm.esFianca,
        metodePagament: regForm.metodePagament,
        adjuntPath,
      });
      setRegistrarG(null); setRegFile(null); await load();
    } catch (err) {
      setRegError(err instanceof ApiError ? err.message : 'Error registrant la factura');
    } finally { setRegBusy(false); }
  }

  // Factures d'aquest contracte registrades dins del període triat a dalt.
  const alPeriode = (g: GasFix) =>
    g.gastos.filter((p) => p.data.slice(0, 10) >= desde && p.data.slice(0, 10) <= fins);
  const totalPeriode = gastos.reduce(
    (a, g) => a + alPeriode(g).reduce((b, p) => b + Number(p.import), 0),
    0,
  );
  const editant = gastos.find((g) => g.id === editingId) ?? null;
  const initialDe = (g: GasFix): FormStateFix => ({
    activitat: g.activitat,
    frequencia: g.frequencia,
    importPrevist: g.importPrevist ?? '',
    metodePagament: g.metodePagament,
    properaData: g.properaData.slice(0, 10),
    observacions: g.observacions ?? '',
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500">
          Els contractes es veuen sempre; «Al període» és el que s&apos;hi ha registrat.
        </p>
        <Button size="sm" className="ml-auto" onClick={() => { setShowNew(true); setEditingId(null); }}>
          <Plus className="h-4 w-4" /> Nova despesa fixa
        </Button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}<button className="ml-2 underline" onClick={() => setError(null)}>Tancar</button></div>}

      {showNew && <GastoFixForm initial={EMPTY_FIX} onSave={handleCreate} onCancel={() => setShowNew(false)} loading={saving} />}
      {editant && (
        <GastoFixForm
          initial={initialDe(editant)}
          onSave={(form) => handleEdit(editant.id, form)}
          onCancel={() => setEditingId(null)}
          loading={saving}
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregant...</p>
      ) : gastos.length === 0 ? (
        <EmptyState>Cap despesa fixa. Fes clic a «Nova despesa fixa» per afegir-ne una.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Contracte</Th>
              <Th>Cada</Th>
              <Th>Previst</Th>
              <Th className="text-right">Al període</Th>
              <Th>Propera</Th>
              <Th>Estat</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {gastos.map((g) => {
              const status = statusInfo(g.properaData);
              const files = alPeriode(g);
              const suma = files.reduce((a, p) => a + Number(p.import), 0);
              return (
                <Tr key={g.id}>
                  <Td>
                    <span className="font-medium text-slate-800">{g.activitat}</span>
                    {g.observacions && <span className="block text-xs text-slate-400">{g.observacions}</span>}
                  </Td>
                  <Td className="text-slate-500">{FREQ_LABELS[g.frequencia] ?? g.frequencia}</Td>
                  <Td className="text-slate-500">{g.importPrevist != null ? formatEur(g.importPrevist) : '—'}</Td>
                  <Td className="text-right">
                    {files.length === 0 ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <>
                        <span className="font-medium text-slate-800"><Eur value={suma} /></span>
                        <span className="ml-1.5 inline-flex gap-1 align-middle">
                          {files.filter((p) => p.adjuntPath).map((p) => (
                            <a
                              key={p.id}
                              href={`/api/files?path=${encodeURIComponent(p.adjuntPath!)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600"
                              title={`Factura del ${formatDate(p.data)}`}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                            </a>
                          ))}
                        </span>
                        {files.length > 1 && (
                          <span className="block text-xs text-slate-400">{files.length} factures</span>
                        )}
                      </>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">{formatDate(g.properaData)}</Td>
                  <Td><Badge tone={status.tone}>{status.label}</Badge></Td>
                  <Td className="whitespace-nowrap text-right">
                    <Button size="sm" variant="outline" onClick={() => obreRegistrar(g)}>Registrar factura</Button>
                    <button
                      type="button"
                      aria-label="Editar el contracte"
                      className="ml-1 inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                      onClick={() => { setEditingId(g.id); setShowNew(false); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </Td>
                </Tr>
              );
            })}
            <Tr className="bg-brand-50">
              <Td colSpan={3} className="font-semibold text-slate-700">Total fixes registrats al període</Td>
              <Td className="text-right font-semibold text-brand-800"><Eur value={totalPeriode} /></Td>
              <Td colSpan={3}></Td>
            </Tr>
          </tbody>
        </Table>
      )}

      {/* Modal: registrar la factura d'una despesa fixa (crea la despesa) */}
      {registrarG && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !regBusy && setRegistrarG(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold text-slate-800">Registrar factura · {registrarG.activitat}</h3>
              <button onClick={() => setRegistrarG(null)} className="shrink-0 text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Foto de la factura (opcional)" hint="Es llegeixen sols l'import i la data.">
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <Upload className="h-4 w-4" /> Pujar factura
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => regTriaFitxer(e.target.files?.[0] ?? null)} />
                  </label>
                  {regScan && <span className="text-xs font-medium text-brand-700">Llegint…</span>}
                  {regFile && <span className="max-w-40 truncate text-xs text-slate-500">{regFile.name}</span>}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data" required><Input type="date" value={regForm.data} onChange={(e) => setRegForm({ ...regForm, data: e.target.value })} /></Field>
                <Field label="Import €" required><Input type="number" step="0.01" value={regForm.import} onChange={(e) => setRegForm({ ...regForm, import: e.target.value })} /></Field>
              </div>
              <Field label="Mètode de pagament">
                <Select value={regForm.metodePagament} onChange={(e) => setRegForm({ ...regForm, metodePagament: e.target.value })}>
                  {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm">
                <input type="checkbox" className="mt-0.5 accent-amber-600" checked={regForm.esFianca} onChange={(e) => setRegForm({ ...regForm, esFianca: e.target.checked })} />
                <span>
                  <span className="font-medium text-amber-800">És una fiança</span>
                  <span className="block text-xs text-amber-700/80">Recuperable: no compta com a despesa al balanç.</span>
                </span>
              </label>
              {regError && <p className="text-sm text-red-600">{regError}</p>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setRegistrarG(null)} disabled={regBusy}>Cancel·lar</Button>
                <Button size="sm" onClick={registrarFactura} disabled={regBusy}>{regBusy ? 'Registrant…' : 'Registrar factura'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Gastos variables ─────────────────────────────────────────────────────────

// Estat inicial del formulari de nova despesa (inclou camps fiscals i el
// proveïdor detectat per l'escàner, que es buiden en desar).
function novaBuida() {
  return {
    data: toISODate(new Date()),
    import: '',
    categoriaId: '',
    proveidorId: '',
    habitacioId: '',
    metodePagament: 'TARGETA',
    descripcio: '',
    numFactura: '',
    baseImposable: '',
    ivaPercent: '',
    irpfPercent: '',
    proveidorNom: '',
    proveidorNif: '',
    proveidorActivitat: '',
    proveidorTelefon: '',
    proveidorEmail: '',
    proveidorAdreca: '',
    proveidorWeb: '',
    esFianca: false,
  };
}

function GastosVariablesTab({
  desde,
  fins,
  catNom,
  setCatNom,
}: {
  desde: string;
  fins: string;
  catNom: string | null;
  setCatNom: (c: string | null) => void;
}) {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [proveidors, setProveidors] = useState<Prov[]>([]);
  const [habitacions, setHabitacions] = useState<Hab[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [perCat, setPerCat] = useState<Record<string, number>>({});

  const [showForm, setShowForm] = useState(false);
  const [nova, setNova] = useState(novaBuida);
  const [file, setFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escàner del tiquet/factura (OCR amb Claude): estat de la lectura.
  const [scanning, setScanning] = useState(false);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [scanNouProv, setScanNouProv] = useState<{ nom: string; nif: string } | null>(null);

  // Edició inline d'una despesa existent.
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ data: '', import: '', categoriaId: '', proveidorId: '', habitacioId: '', metodePagament: 'TARGETA', descripcio: '', numFactura: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Es demana el període sencer sense filtrar per categoria: així les pastilles
  // de categoria mostren tot el que hi ha i filtrar és immediat, sense anar al servidor.
  const load = useCallback(async () => {
    const p = new URLSearchParams({ variables: '1', desde, fins });
    const res = await getJSON<{ gastos: Gasto[]; total: number; perCategoria: Record<string, number> }>(`/api/gastos?${p.toString()}`);
    setGastos(res.gastos); setPerCat(res.perCategoria);
  }, [desde, fins]);

  const visibles = catNom ? gastos.filter((g) => g.categoria.nom === catNom) : gastos;
  const totalVisible = visibles
    .filter((g) => !g.esFianca)
    .reduce((a, g) => a + Number(g.import), 0);
  const fiancaVisible = visibles
    .filter((g) => g.esFianca)
    .reduce((a, g) => a + Number(g.import), 0);

  useEffect(() => {
    getJSON<{ categories: Cat[] }>('/api/categories-gasto').then((r) => setCategories(r.categories));
    getJSON<{ proveidors: Prov[] }>('/api/proveidors').then((r) => setProveidors(r.proveidors));
    getJSON<{ habitacions: Hab[] }>('/api/habitacions').then((r) => setHabitacions(r.habitacions));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    // Avisem clarament del que falta (abans sortia sense fer res, i semblava
    // que el botó no funcionava).
    if (!nova.import) { setError('Cal indicar l’import.'); return; }
    if (!nova.categoriaId) { setError('Cal triar una categoria abans de desar.'); return; }
    if (!nova.descripcio.trim()) { setError('Cal una descripció.'); return; }
    setSaving(true); setError(null);
    try {
      let adjuntPath: string | undefined;
      if (file) {
        const fd = new FormData(); fd.append('file', file);
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!up.ok) throw new ApiError('No s\'ha pogut pujar l\'adjunt', up.status);
        adjuntPath = (await up.json()).path;
      }
      await postJSON('/api/gastos', {
        data: nova.data,
        import: Number(nova.import),
        categoriaId: nova.categoriaId,
        proveidorId: nova.proveidorId || undefined,
        habitacioId: nova.habitacioId || undefined,
        metodePagament: nova.metodePagament,
        descripcio: nova.descripcio,
        numFactura: nova.numFactura || undefined,
        baseImposable: nova.baseImposable || undefined,
        ivaPercent: nova.ivaPercent || undefined,
        irpfPercent: nova.irpfPercent || undefined,
        // Si no s'ha triat proveïdor, enviem el detectat per l'escàner (el servidor
        // el busca o el crea per tenir NIF i dades de contacte al trimestre).
        proveidorNom: nova.proveidorId ? undefined : nova.proveidorNom || undefined,
        proveidorNif: nova.proveidorId ? undefined : nova.proveidorNif || undefined,
        proveidorActivitat: nova.proveidorId ? undefined : nova.proveidorActivitat || undefined,
        proveidorTelefon: nova.proveidorId ? undefined : nova.proveidorTelefon || undefined,
        proveidorEmail: nova.proveidorId ? undefined : nova.proveidorEmail || undefined,
        proveidorAdreca: nova.proveidorId ? undefined : nova.proveidorAdreca || undefined,
        proveidorWeb: nova.proveidorId ? undefined : nova.proveidorWeb || undefined,
        adjuntPath,
        esFianca: nova.esFianca,
      });
      setNova(novaBuida());
      setFile(null); setScanWarnings([]); setScanNouProv(null); setShowForm(false); load();
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Error desant la despesa'); } finally { setSaving(false); }
  }

  // En triar un proveïdor ja usat, omple els camps buits amb els seus valors
  // habituals (categoria, %IVA, %IRPF, mètode) de l'última despesa. Així només
  // cal posar el producte i el preu; el NIF ja ve amb el proveïdor.
  async function aplicaDefaultsProveidor(id: string) {
    if (!id) return;
    try {
      const { defaults } = await getJSON<{ defaults: ProvDefaults | null }>(`/api/proveidors/${id}/defaults`);
      if (!defaults) return;
      setNova((n) => ({
        ...n,
        categoriaId: n.categoriaId || defaults.categoriaId || '',
        ivaPercent: n.ivaPercent || (defaults.ivaPercent != null ? String(defaults.ivaPercent) : ''),
        irpfPercent: n.irpfPercent || (defaults.irpfPercent != null ? String(defaults.irpfPercent) : ''),
        // El mètode només es reomple si encara és el per defecte (no tocat).
        metodePagament: n.metodePagament === 'TARGETA' && defaults.metodePagament ? defaults.metodePagament : n.metodePagament,
      }));
    } catch {
      /* si falla, es queda sense autoemplenar */
    }
  }

  // Tria un fitxer d'adjunt i, si és imatge o PDF, l'escaneja per autoemplenar.
  function triaFitxer(f: File | null) {
    setFile(f);
    setScanWarnings([]); setScanNouProv(null);
    if (f) void escaneja(f);
  }

  // Escàner OCR (Claude): llegeix data, proveïdor, NIF, nº factura, base, IVA,
  // IRPF i total del tiquet/factura i autoemplena el formulari (camps editables).
  async function escaneja(f: File) {
    setScanning(true); setError(null);
    try {
      const fd = new FormData(); fd.append('image', f);
      // Enviem la llista de categories perquè l'escàner en triï la més adient.
      fd.append('categories', JSON.stringify(categories.map((c) => c.nom)));
      const res = await fetch('/api/ocr/gasto', { method: 'POST', body: fd });
      if (!res.ok) throw new ApiError('OCR', res.status);
      const { result } = (await res.json()) as { result: GastoOcrClient };

      const matchProv = result.proveidorNom
        ? proveidors.find((p) => p.nom.trim().toLowerCase() === result.proveidorNom!.trim().toLowerCase())
        : undefined;

      // Categoria suggerida per l'escàner → id. Si no casa amb cap, caiem a "Altres".
      const catByName = (nom?: string) =>
        nom ? categories.find((c) => c.nom.trim().toLowerCase() === nom.trim().toLowerCase()) : undefined;
      const catSugg = catByName(result.categoria) ?? catByName('Altres');

      setNova((n) => {
        const next = { ...n };
        if (result.data) next.data = result.data;
        if (result.import != null) next.import = String(result.import);
        if (result.numFactura) next.numFactura = result.numFactura;
        if (result.baseImposable != null) next.baseImposable = String(result.baseImposable);
        if (result.ivaPercent != null) next.ivaPercent = String(result.ivaPercent);
        if (result.irpfPercent != null) next.irpfPercent = String(result.irpfPercent);
        if (result.descripcio && !n.descripcio.trim()) next.descripcio = result.descripcio;
        // Categoria: només si no n'hi ha cap de triada, per no trepitjar la de l'usuari.
        if (!n.categoriaId && catSugg) next.categoriaId = catSugg.id;
        if (!n.proveidorId && result.proveidorNom) {
          if (matchProv) {
            next.proveidorId = matchProv.id;
            next.proveidorNom = ''; next.proveidorNif = '';
            next.proveidorActivitat = ''; next.proveidorTelefon = '';
            next.proveidorEmail = ''; next.proveidorAdreca = ''; next.proveidorWeb = '';
          } else {
            next.proveidorNom = result.proveidorNom;
            next.proveidorNif = result.proveidorNif ?? '';
            next.proveidorActivitat = result.proveidorActivitat ?? '';
            next.proveidorTelefon = result.proveidorTelefon ?? '';
            next.proveidorEmail = result.proveidorEmail ?? '';
            next.proveidorAdreca = result.proveidorAdreca ?? '';
            next.proveidorWeb = result.proveidorWeb ?? '';
          }
        }
        return next;
      });

      if (result.proveidorNom && !matchProv && !nova.proveidorId) {
        setScanNouProv({ nom: result.proveidorNom, nif: result.proveidorNif ?? '' });
      }
      // Si l'OCR ha casat amb un proveïdor existent, completem els camps que el
      // tiquet no dona (p.ex. la categoria) amb els seus valors habituals.
      if (matchProv && !nova.proveidorId) void aplicaDefaultsProveidor(matchProv.id);
      setScanWarnings(result.warnings ?? []);
    } catch {
      setScanWarnings(['No s’ha pogut escanejar el fitxer. Omple les dades a mà.']);
    } finally {
      setScanning(false);
    }
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

  function startEdit(g: Gasto) {
    setError(null);
    setEditId(g.id);
    setEditForm({
      data: g.data.slice(0, 10),
      import: String(Number(g.import)),
      categoriaId: g.categoriaId,
      proveidorId: g.proveidorId ?? '',
      habitacioId: g.habitacioId ?? '',
      metodePagament: g.metodePagament,
      descripcio: g.descripcio,
      numFactura: g.numFactura ?? '',
    });
  }

  async function desarEdit(id: string) {
    if (!editForm.categoriaId || !editForm.import) { setError('Cal categoria i import.'); return; }
    setEditSaving(true); setError(null);
    try {
      await patchJSON(`/api/gastos/${id}`, {
        data: editForm.data,
        import: Number(editForm.import),
        categoriaId: editForm.categoriaId,
        proveidorId: editForm.proveidorId,
        habitacioId: editForm.habitacioId,
        metodePagament: editForm.metodePagament,
        descripcio: editForm.descripcio,
        numFactura: editForm.numFactura,
      });
      setEditId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant la despesa');
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}><Plus className="h-4 w-4" /> Nova despesa</Button>
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
                <Select
                  value={nova.proveidorId}
                  onChange={(e) => { const id = e.target.value; setNova({ ...nova, proveidorId: id, proveidorNom: '', proveidorNif: '' }); if (id) { setScanNouProv(null); void aplicaDefaultsProveidor(id); } }}
                >
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
              <Field label="Nº factura" hint="Del proveïdor (per al llibre d'IVA).">
                <Input value={nova.numFactura} onChange={(e) => setNova({ ...nova, numFactura: e.target.value })} />
              </Field>
              <Field label="Base imponible €" hint="Sense IVA (opcional).">
                <Input type="number" step="0.01" value={nova.baseImposable} onChange={(e) => setNova({ ...nova, baseImposable: e.target.value })} />
              </Field>
              <Field label="% IVA">
                <Input type="number" step="0.01" value={nova.ivaPercent} onChange={(e) => setNova({ ...nova, ivaPercent: e.target.value })} />
              </Field>
              <Field label="% IRPF" hint="Retenció (deixa buit si no n'hi ha).">
                <Input type="number" step="0.01" value={nova.irpfPercent} onChange={(e) => setNova({ ...nova, irpfPercent: e.target.value })} />
              </Field>
              <Field label="Adjunt (factura/ticket)" hint="Fes una foto o puja el fitxer: es llegiran les dades automàticament." className="sm:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => triaFitxer(e.target.files?.[0] ?? null)} />
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => triaFitxer(e.target.files?.[0] ?? null)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}><Camera className="h-4 w-4" /> Fer foto</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Pujar fitxer</Button>
                  {scanning && <span className="text-xs font-medium text-brand-700">Llegint el tiquet…</span>}
                  {file && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                      <span className="max-w-40 truncate">{file.name}</span>
                      <button type="button" onClick={() => { setFile(null); setScanWarnings([]); setScanNouProv(null); if (cameraRef.current) cameraRef.current.value = ''; if (fileRef.current) fileRef.current.value = ''; }} className="p-2 touch-manipulation text-slate-400 hover:text-red-600" aria-label="Treure l'adjunt"><X className="h-3.5 w-3.5" /></button>
                    </span>
                  )}
                </div>
              </Field>
              {(scanNouProv || scanWarnings.length > 0) && (
                <div className="sm:col-span-3 space-y-2">
                  {scanNouProv && !nova.proveidorId && (
                    <div className="rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2.5 text-sm text-brand-800">
                      <p className="mb-2 font-medium">Proveïdor nou detectat — revisa’l i edita’l si cal (es crearà en desar):</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Nom del proveïdor">
                          <Input value={nova.proveidorNom} onChange={(e) => setNova({ ...nova, proveidorNom: e.target.value })} placeholder="Nom del proveïdor" />
                        </Field>
                        <Field label="NIF/CIF">
                          <Input value={nova.proveidorNif} onChange={(e) => setNova({ ...nova, proveidorNif: e.target.value })} placeholder="Ex. ESA82037292" />
                        </Field>
                        <Field label="Activitat">
                          <Input value={nova.proveidorActivitat} onChange={(e) => setNova({ ...nova, proveidorActivitat: e.target.value })} placeholder="Ex. Electrònica, Ferreteria…" />
                        </Field>
                        <Field label="Telèfon">
                          <Input value={nova.proveidorTelefon} onChange={(e) => setNova({ ...nova, proveidorTelefon: e.target.value })} placeholder="Ex. 937 66 08 93" />
                        </Field>
                        <Field label="E-mail">
                          <Input value={nova.proveidorEmail} onChange={(e) => setNova({ ...nova, proveidorEmail: e.target.value })} placeholder="Ex. info@proveidor.cat" />
                        </Field>
                        <Field label="Web">
                          <Input value={nova.proveidorWeb} onChange={(e) => setNova({ ...nova, proveidorWeb: e.target.value })} placeholder="Ex. www.proveidor.cat" />
                        </Field>
                        <Field label="Adreça" className="sm:col-span-2">
                          <Input value={nova.proveidorAdreca} onChange={(e) => setNova({ ...nova, proveidorAdreca: e.target.value })} placeholder="Carrer, població" />
                        </Field>
                      </div>
                      <p className="mt-1.5 text-xs text-brand-700/70">O tria’n un d’existent a la llista «Proveïdor» de dalt.</p>
                    </div>
                  )}
                  {scanWarnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
                      <span className="font-medium">Revisa les dades llegides:</span>
                      <ul className="mt-1 list-disc pl-4">
                        {scanWarnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {Object.entries(perCat).sort((a, b) => b[1] - a[1]).map(([nom, imp]) => (
          <button
            key={nom}
            type="button"
            aria-pressed={catNom === nom}
            onClick={() => setCatNom(catNom === nom ? null : nom)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              catNom === nom
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-slate-300 text-slate-600 hover:border-brand-600 hover:text-brand-700',
            )}
          >
            {nom} · <Eur value={imp} />
          </button>
        ))}
        {catNom && (
          <Button size="sm" variant="ghost" onClick={() => setCatNom(null)}>Treure el filtre</Button>
        )}
      </div>

      {visibles.length === 0 ? (
        <EmptyState><Filter className="mx-auto mb-2 h-5 w-5 text-slate-300" /> Cap despesa en aquest període.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr><Th>Data</Th><Th>Descripció</Th><Th>Categoria</Th><Th>Habitació</Th><Th>Proveïdor</Th><Th>Mètode</Th><Th className="text-right">Import</Th><Th></Th></tr>
          </Thead>
          <tbody>
            {visibles.map((g) => (
              <Fragment key={g.id}>
              <Tr className={g.esFianca ? 'bg-amber-50/40' : undefined}>
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
                      className="p-2 touch-manipulation text-slate-400 hover:text-brand-600"
                      onClick={() => (editId === g.id ? setEditId(null) : startEdit(g))}
                      title="Editar despesa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className={g.esFianca ? 'text-amber-600 hover:text-slate-600' : 'text-slate-400 hover:text-amber-600'}
                      onClick={() => toggleFianca(g)}
                      title={g.esFianca ? 'Marcar com a despesa real (comptarà al balanç)' : 'Marcar com a fiança/dipòsit (no comptarà al balanç)'}
                    >
                      {g.esFianca ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                    <button className="p-2 touch-manipulation text-slate-400 hover:text-red-600" onClick={() => esborrar(g.id)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </Td>
              </Tr>
              {editId === g.id && (
                <tr className="bg-brand-50/40">
                  <td colSpan={8} className="px-4 py-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Data"><Input type="date" value={editForm.data} onChange={(e) => setEditForm({ ...editForm, data: e.target.value })} /></Field>
                      <Field label="Import €"><Input type="number" step="0.01" value={editForm.import} onChange={(e) => setEditForm({ ...editForm, import: e.target.value })} /></Field>
                      <Field label="Categoria">
                        <Select value={editForm.categoriaId} onChange={(e) => setEditForm({ ...editForm, categoriaId: e.target.value })}>
                          <option value="">—</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </Select>
                      </Field>
                      <Field label="Proveïdor">
                        <Select value={editForm.proveidorId} onChange={(e) => setEditForm({ ...editForm, proveidorId: e.target.value })}>
                          <option value="">—</option>
                          {proveidors.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                        </Select>
                      </Field>
                      <Field label="Habitació">
                        <Select value={editForm.habitacioId} onChange={(e) => setEditForm({ ...editForm, habitacioId: e.target.value })}>
                          <option value="">General</option>
                          {habitacions.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
                        </Select>
                      </Field>
                      <Field label="Mètode de pagament">
                        <Select value={editForm.metodePagament} onChange={(e) => setEditForm({ ...editForm, metodePagament: e.target.value })}>
                          {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Núm. factura (proveïdor)"><Input value={editForm.numFactura} onChange={(e) => setEditForm({ ...editForm, numFactura: e.target.value })} /></Field>
                      <Field label="Descripció" className="sm:col-span-2"><Input value={editForm.descripcio} onChange={(e) => setEditForm({ ...editForm, descripcio: e.target.value })} /></Field>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" onClick={() => desarEdit(g.id)} disabled={editSaving}><Check className="h-4 w-4" /> {editSaving ? 'Desant…' : 'Desar'}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)} disabled={editSaving}>Cancel·lar</Button>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            <Tr className="bg-brand-50">
              <Td colSpan={6} className="font-semibold text-slate-700">
                Total variables{catNom ? ` · ${catNom}` : ''}
                {fiancaVisible > 0 && (
                  <span className="ml-2 font-normal text-amber-700">
                    (fiances a part: <Eur value={fiancaVisible} />)
                  </span>
                )}
              </Td>
              <Td className="text-right font-semibold text-brand-800"><Eur value={totalVisible} /></Td>
              <Td></Td>
            </Tr>
          </tbody>
        </Table>
      )}
    </>
  );
}

// ─── Pestanya Personal ────────────────────────────────────────────────────────

// Qui ha cobrat què dins del període. Surt del mateix càlcul que la fitxa de
// cada persona, així que hi entra la bugaderia i no només les jornades.
function PersonalTab({ detall }: { detall: PersonaPeriode[] }) {
  const router = useRouter();
  if (detall.length === 0) {
    return <EmptyState>Ningú ha treballat en aquest període.</EmptyState>;
  }
  const total = detall.reduce((a, p) => a + p.total, 0);
  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        Nòmines, neteja i bugaderia del període. Una nòmina compta el dia que tanca el seu mes,
        així que només hi entra si el període cobreix el mes sencer.
      </p>
      <Table>
        <Thead>
          <tr>
            <Th>Persona</Th>
            <Th className="text-right">Nòmines</Th>
            <Th className="text-right">Neteja</Th>
            <Th className="text-right">Bugaderia</Th>
            <Th className="text-right">Total</Th>
            <Th>Pagat / pendent</Th>
            <Th></Th>
          </tr>
        </Thead>
        <tbody>
          {detall.map((p) => (
            <Tr key={p.id}>
              <Td>
                <span className="font-medium text-slate-800">{p.nom}</span>
                {p.carrec && <span className="block text-xs text-slate-400">{p.carrec}</span>}
              </Td>
              <Td className="text-right">{p.nomines > 0 ? <Eur value={p.nomines} /> : <span className="text-slate-300">—</span>}</Td>
              <Td className="text-right">{p.neteja > 0 ? <Eur value={p.neteja} /> : <span className="text-slate-300">—</span>}</Td>
              <Td className="text-right">{p.bugaderia > 0 ? <Eur value={p.bugaderia} /> : <span className="text-slate-300">—</span>}</Td>
              <Td className="text-right font-semibold text-slate-900"><Eur value={p.total} /></Td>
              <Td>
                <span className="flex h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                  <span className="bg-green-600" style={{ width: pct(p.pagat, p.pagat + p.pendent) }} />
                  <span className="bg-amber-500" style={{ width: pct(p.pendent, p.pagat + p.pendent) }} />
                </span>
                <span className="text-xs text-slate-400">
                  {p.pendent > 0 ? <>pendent <Eur value={p.pendent} /></> : 'tot pagat'}
                </span>
              </Td>
              <Td className="text-right">
                <Button size="sm" variant="outline" onClick={() => router.push(`/personal/${p.id}`)}>Obrir fitxa</Button>
              </Td>
            </Tr>
          ))}
          <Tr className="bg-brand-50">
            <Td colSpan={4} className="font-semibold text-slate-700">Total personal al període</Td>
            <Td className="text-right font-semibold text-brand-800"><Eur value={total} /></Td>
            <Td colSpan={2}></Td>
          </Tr>
        </tbody>
      </Table>
    </>
  );
}

// ─── Pestanya Resum ───────────────────────────────────────────────────────────

const MESOS_CURT = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];

interface MesDespeses { mes: string; variables: number; fixes: number; personal: number }
interface PersonaPeriode {
  id: string; nom: string; carrec: string;
  nomines: number; neteja: number; bugaderia: number; total: number;
  pagat: number; pendent: number;
}
interface Resum {
  desde: string; fins: string;
  variables: number; fixes: number; personal: number; fiances: number; total: number;
  nVariables: number; nFixes: number; personalPendent: number;
  anterior: { desde: string; fins: string; total: number };
  categories: { nom: string; import: number; variables: number; fixes: number; personal: number }[];
  fiancesDetall: { proveidor: string; import: number }[];
  personalDetall: PersonaPeriode[];
  any: number;
  mesos: MesDespeses[];
}

const pct = (part: number, tot: number) => `${tot > 0 ? (part / tot) * 100 : 0}%`;
const eur0 = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// Gràfic de l'any: una barra apilada per mes (variables + fixes + personal).
// Els mesos que queden fora del període es veuen més fluixos, però es veuen: la
// gràcia és no perdre la tendència quan mires una setmana concreta.
function GraficAny({
  mesos,
  desde,
  fins,
  onMes,
}: {
  mesos: MesDespeses[];
  desde: string;
  fins: string;
  onMes: (desde: string, fins: string) => void;
}) {
  const totals = mesos.map((m) => m.variables + m.fixes + m.personal);
  const max = Math.max(...totals, 0);
  const sostre = max > 0 ? Math.ceil(max / 500) * 500 : 500;
  const alt = (v: number) => `${(v / sostre) * 88}%`;
  const ultimDia = (mes: string) => {
    const [y, m] = mes.split('-').map(Number);
    return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
  };
  const dinsRang = (mes: string) => mes <= fins.slice(0, 7) && mes >= desde.slice(0, 7);

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Com ha anat l&apos;any</h3>
          <p className="text-xs text-slate-400">Clica una barra per posar el període en aquell mes</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-700" /> Variables</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-sky-700" /> Fixes</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-amber-600" /> Personal</span>
        </div>
      </div>

      <div className="relative flex h-48 items-end gap-0.5 border-b border-slate-300 pl-14">
        {[sostre, sostre / 2].map((v) => (
          <div
            key={v}
            className="pointer-events-none absolute left-14 right-0 border-t border-dashed border-slate-200"
            style={{ bottom: alt(v) }}
          >
            <span className="absolute -left-14 -top-1.5 w-12 text-right text-[10px] leading-none text-slate-400">
              {eur0(v)}
            </span>
          </div>
        ))}
        {mesos.map((m, i) => {
          const dins = dinsRang(m.mes);
          const tot = totals[i] ?? 0;
          return (
            <button
              key={m.mes}
              type="button"
              onClick={() => onMes(`${m.mes}-01`, ultimDia(m.mes))}
              title={`${MESOS_CURT[i]}: ${formatEur(tot)}`}
              className="relative flex h-full flex-1 flex-col justify-end gap-0.5 px-0.5"
            >
              <span className="whitespace-nowrap text-center text-[10px] font-bold tabular-nums text-slate-600">
                {dins && tot > 0 ? eur0(tot) : ' '}
              </span>
              <span className={cn('rounded-t bg-brand-700', !dins && 'opacity-55')} style={{ height: alt(m.variables) }} />
              <span className={cn('bg-sky-700', !dins && 'opacity-55')} style={{ height: alt(m.fixes) }} />
              <span className={cn('bg-amber-600', !dins && 'opacity-55')} style={{ height: alt(m.personal) }} />
            </button>
          );
        })}
      </div>
      <div className="flex gap-0.5 pl-14 pt-1.5">
        {mesos.map((m, i) => (
          <span
            key={m.mes}
            className={cn('flex-1 text-center text-[11px]', dinsRang(m.mes) ? 'font-bold text-slate-700' : 'text-slate-400')}
          >
            {MESOS_CURT[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResumTab({
  resum,
  onMes,
  onCategoria,
}: {
  resum: Resum;
  onMes: (desde: string, fins: string) => void;
  onCategoria: (c: Resum['categories'][number]) => void;
}) {
  const [fixos, setFixos] = useState<GasFix[]>([]);
  useEffect(() => {
    getJSON<{ gastos: GasFix[] }>('/api/gastos-fixos')
      .then((r) => setFixos(r.gastos))
      .catch(() => setFixos([]));
  }, []);

  const maxCat = resum.categories[0]?.import ?? 0;
  const totalCats = resum.categories.reduce((a, c) => a + c.import, 0);
  const avui = toISODate(new Date());
  const propers = [...fixos].sort((a, b) => a.properaData.localeCompare(b.properaData)).slice(0, 6);
  const diesFins = (data: string) =>
    Math.round(
      (new Date(`${data.slice(0, 10)}T00:00:00.000Z`).getTime() -
        new Date(`${avui}T00:00:00.000Z`).getTime()) / 86400000,
    );

  return (
    <div className="space-y-4">
      <GraficAny mesos={resum.mesos} desde={resum.desde} fins={resum.fins} onMes={onMes} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">En què se&apos;n va</h3>
          <p className="mb-3 text-xs text-slate-400">
            Per categoria, dins del període. Clica&apos;n una per veure&apos;n les línies.
          </p>
          {resum.categories.length === 0 ? (
            <p className="text-sm text-slate-400">Cap despesa en aquest període.</p>
          ) : (
            resum.categories.map((c) => (
              <button
                key={c.nom}
                type="button"
                onClick={() => onCategoria(c)}
                className="flex w-full flex-col gap-1 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-brand-50"
              >
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-slate-600">
                    {c.nom}
                    <span className="ml-1.5 text-xs text-slate-400">
                      {totalCats > 0 ? Math.round((c.import / totalCats) * 100) : 0}%
                    </span>
                  </span>
                  <span className="font-semibold text-slate-800"><Eur value={c.import} /></span>
                </span>
                <span className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="bg-brand-700" style={{ width: pct(c.variables, maxCat) }} />
                  <span className="bg-sky-700" style={{ width: pct(c.fixes, maxCat) }} />
                  <span className="bg-amber-600" style={{ width: pct(c.personal, maxCat) }} />
                </span>
              </button>
            ))
          )}
          {resum.fiancesDetall.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Fiances (a part)</p>
              {resum.fiancesDetall.map((f) => (
                <div key={f.proveidor} className="flex justify-between gap-3 py-0.5 text-sm text-amber-700">
                  <span className="min-w-0 truncate">{f.proveidor}</span>
                  <span className="shrink-0 font-medium"><Eur value={f.import} /></span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Què ve ara</h3>
          <p className="mb-2 text-xs text-slate-400">
            Despeses fixes amb data de pagament pròxima, hi caigui el període o no.
          </p>
          {propers.length === 0 ? (
            <p className="text-sm text-slate-400">Cap despesa fixa registrada.</p>
          ) : (
            propers.map((g) => {
              const status = statusInfo(g.properaData);
              const d = diesFins(g.properaData);
              const quan = d < 0 ? `fa ${-d} dies` : d === 0 ? 'avui' : `en ${d} dies`;
              return (
                <div key={g.id} className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-700">{g.activitat}</span>
                    <span className="text-xs text-slate-400">{formatDate(g.properaData)} · {quan}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-slate-800">
                    {g.importPrevist != null ? formatEur(g.importPrevist) : '—'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pàgina principal ─────────────────────────────────────────────────────────

type Preset = 'mes' | 'passat' | 'trim' | 'any' | 'tot';
const PRESETS: { clau: Preset; etiqueta: string }[] = [
  { clau: 'mes', etiqueta: 'Aquest mes' },
  { clau: 'passat', etiqueta: 'Mes passat' },
  { clau: 'trim', etiqueta: 'Aquest trimestre' },
  { clau: 'any', etiqueta: 'Aquest any' },
  { clau: 'tot', etiqueta: 'Tot' },
];

const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

function rangDe(preset: Preset): { desde: string; fins: string } {
  const avui = new Date();
  const fins = toISODate(avui);
  const y = avui.getFullYear();
  const m = avui.getMonth(); // 0-11
  if (preset === 'mes') return { desde: ymd(y, m, 1), fins };
  if (preset === 'passat') return { desde: ymd(y, m - 1, 1), fins: ymd(y, m, 0) };
  if (preset === 'trim') return { desde: ymd(y, Math.floor(m / 3) * 3, 1), fins };
  if (preset === 'any') return { desde: ymd(y, 0, 1), fins };
  return { desde: '2000-01-01', fins };
}

const fmtCurt = (dia: string) => { const p = dia.split('-'); return `${p[2]}/${p[1]}`; };

function GastosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab') ?? 'resum';

  // El període mana sobre les quatre pestanyes.
  const inicial = rangDe('mes');
  const [desde, setDesde] = useState(inicial.desde);
  const [fins, setFins] = useState(inicial.fins);
  const [preset, setPreset] = useState<Preset | null>('mes');
  const [catNom, setCatNom] = useState<string | null>(null);
  const [resum, setResum] = useState<Resum | null>(null);
  const [errResum, setErrResum] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    getJSON<Resum>(`/api/gastos/resum?desde=${desde}&fins=${fins}`)
      .then((r) => { if (!cancel) { setResum(r); setErrResum(null); } })
      .catch((e) => {
        if (!cancel) {
          setResum(null);
          setErrResum(e instanceof ApiError ? e.message : 'No s’ha pogut carregar el resum');
        }
      });
    return () => { cancel = true; };
  }, [desde, fins]);

  const vesA = (t: string) => router.replace(t === 'resum' ? '/gastos' : `/gastos?tab=${t}`);
  function posaRang(d: string, f: string) {
    setDesde(d); setFins(f); setPreset(null);
  }
  function aplicaPreset(p: Preset) {
    const r = rangDe(p);
    setDesde(r.desde); setFins(r.fins); setPreset(p);
  }

  const delta = resum && resum.anterior.total > 0
    ? Math.round(((resum.total - resum.anterior.total) / resum.anterior.total) * 100)
    : null;

  const parts: { clau: string; nom: string; color: string; valor: number; peu: string }[] = resum
    ? [
        {
          clau: 'variables', nom: 'Variables', color: 'bg-brand-700', valor: resum.variables,
          peu: `${resum.nVariables} ${resum.nVariables === 1 ? 'despesa' : 'despeses'}`,
        },
        {
          clau: 'fixes', nom: 'Fixes', color: 'bg-sky-700', valor: resum.fixes,
          peu: `${resum.nFixes} ${resum.nFixes === 1 ? 'rebut registrat' : 'rebuts registrats'}`,
        },
        {
          clau: 'personal', nom: 'Personal', color: 'bg-amber-600', valor: resum.personal,
          peu: resum.personalPendent > 0 ? `pendent de pagar ${formatEur(resum.personalPendent)}` : 'tot pagat',
        },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Despeses" subtitle="Gestió de despeses del hostal" />
      <FinancesNav />

      {/* Període únic: mana sobre les quatre pestanyes */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-brand-50 px-4 py-3">
        <Field label="Des de">
          <Input type="date" value={desde} max={fins} onChange={(e) => { setDesde(e.target.value); setPreset(null); }} />
        </Field>
        <Field label="Fins a">
          <Input type="date" value={fins} min={desde} onChange={(e) => { setFins(e.target.value); setPreset(null); }} />
        </Field>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {PRESETS.map((p) => (
            <button
              key={p.clau}
              type="button"
              aria-pressed={preset === p.clau}
              onClick={() => aplicaPreset(p.clau)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                preset === p.clau
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-brand-600 hover:text-brand-700',
              )}
            >
              {p.etiqueta}
            </button>
          ))}
          <HideAmountsButton className="rounded-full" />
        </div>
      </div>

      {errResum && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errResum}</div>}

      {/* Total del període i les tres parts que el componen (que són les pestanyes) */}
      <div className="mb-5 overflow-hidden rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Despesa real del període</p>
            <p className="text-3xl font-bold tracking-tight text-brand-800">
              <Eur value={resum?.total ?? 0} />
            </p>
          </div>
          {delta !== null && resum && (
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-sm font-semibold',
              delta > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
            )}>
              {delta > 0 ? '▲ +' : '▼ '}{delta}%{' '}
              <span className="font-normal opacity-80">
                vs {fmtCurt(resum.anterior.desde)}–{fmtCurt(resum.anterior.fins)}
              </span>
            </span>
          )}
          {resum && resum.fiances > 0 && (
            <span className="ml-auto rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              Fiances <Eur value={resum.fiances} />{' '}
              <span className="font-normal opacity-85">· fora del total, són recuperables</span>
            </span>
          )}
        </div>
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
          {parts.map((p) => (
            <button
              key={p.clau}
              type="button"
              onClick={() => { setCatNom(null); vesA(p.clau); }}
              className="flex flex-col gap-0.5 bg-white px-4 py-3 text-left transition-colors hover:bg-brand-50"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <i className={cn('h-2.5 w-2.5 rounded-sm', p.color)} /> {p.nom}
              </span>
              <span className="text-xl font-bold tracking-tight text-slate-900"><Eur value={p.valor} /></span>
              <span className="text-xs text-slate-400">{p.peu}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-pestanyes Resum / Variables / Fixes / Personal.
          flex-wrap perquè, si no hi caben en una línia, passin a la següent i es
          vegin sempre TOTES (sense barra de desplaçament). */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
        {(['resum', 'variables', 'fixes', 'personal'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setCatNom(null); vesA(t); }}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t === 'resum' ? 'Resum' : t === 'variables' ? 'Variables' : t === 'fixes' ? 'Fixes' : 'Personal'}
          </button>
        ))}
      </div>

      {tab === 'resum' ? (
        resum ? (
          <ResumTab
            resum={resum}
            onMes={posaRang}
            onCategoria={(c) => {
              // Porta a la pestanya d'on ve la major part de la categoria: així
              // no s'aterra mai en una llista buida.
              const on = c.personal >= c.variables && c.personal >= c.fixes
                ? 'personal'
                : c.fixes > c.variables
                  ? 'fixes'
                  : 'variables';
              setCatNom(on === 'variables' ? c.nom : null);
              vesA(on);
            }}
          />
        ) : (
          <p className="text-sm text-slate-400">Carregant…</p>
        )
      ) : tab === 'fixes' ? (
        <GastosFixesTab desde={desde} fins={fins} />
      ) : tab === 'personal' ? (
        resum ? <PersonalTab detall={resum.personalDetall} /> : <p className="text-sm text-slate-400">Carregant…</p>
      ) : (
        <GastosVariablesTab desde={desde} fins={fins} catNom={catNom} setCatNom={setCatNom} />
      )}
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
