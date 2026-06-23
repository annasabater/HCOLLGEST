'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Truck, CalendarClock, Phone, Mail, MapPin, Pause, Play } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { getJSON, postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import { toISODate } from '@/lib/dates';
import { optionsFrom, metodeCobramentValues, METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';
import {
  frequenciaServeiValues,
  FREQUENCIA_SERVEI_LABELS,
  type FrequenciaServeiValue,
} from '@/lib/validation/servei';

interface Cat {
  id: string;
  nom: string;
}
interface Prov {
  id: string;
  nom: string;
  cif: string | null;
  contacte: string | null;
  telefon: string | null;
  email: string | null;
  adreca: string | null;
  web: string | null;
  activitat: string | null;
  notes: string | null;
}
interface Servei {
  id: string;
  activitat: string;
  frequencia: FrequenciaServeiValue;
  importPrevist: string | number | null;
  metodePagament: keyof typeof METODE_COBRAMENT_LABELS;
  properaData: string;
  vigenciaInici: string | null;
  vigenciaFi: string | null;
  generaDespesa: boolean;
  observacions: string | null;
  actiu: boolean;
  proveidor: { id: string; nom: string } | null;
  categoria: { nom: string } | null;
}

const emptyServei = {
  activitat: '',
  proveidorId: '',
  categoriaId: '',
  frequencia: 'ANUAL' as FrequenciaServeiValue,
  importPrevist: '',
  metodePagament: 'TRANSFERENCIA',
  properaData: toISODate(new Date()),
  vigenciaInici: '',
  vigenciaFi: '',
  generaDespesa: true,
  observacions: '',
};
const emptyProv = {
  nom: '',
  activitat: '',
  telefon: '',
  email: '',
  adreca: '',
  web: '',
  cif: '',
  notes: '',
};

export default function ServeisPage() {
  const [serveis, setServeis] = useState<Servei[]>([]);
  const [proveidors, setProveidors] = useState<Prov[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);

  const [showServei, setShowServei] = useState(false);
  const [serveiForm, setServeiForm] = useState(emptyServei);
  const [editServeiId, setEditServeiId] = useState<string | null>(null);
  const [serveiErr, setServeiErr] = useState<string | null>(null);
  const [savingServei, setSavingServei] = useState(false);

  const [showProv, setShowProv] = useState(false);
  const [provForm, setProvForm] = useState(emptyProv);
  const [editProvId, setEditProvId] = useState<string | null>(null);
  const [provErr, setProvErr] = useState<string | null>(null);
  const [savingProv, setSavingProv] = useState(false);

  const loadServeis = useCallback(async () => {
    const r = await getJSON<{ serveis: Servei[] }>('/api/serveis-recurrents');
    setServeis(r.serveis);
  }, []);
  const loadProveidors = useCallback(async () => {
    const r = await getJSON<{ proveidors: Prov[] }>('/api/proveidors');
    setProveidors(r.proveidors);
  }, []);

  useEffect(() => {
    loadServeis();
    loadProveidors();
    getJSON<{ categories: Cat[] }>('/api/categories-gasto').then((r) => setCategories(r.categories));
  }, [loadServeis, loadProveidors]);

  // ---- Serveis -----------------------------------------------------------
  function obreNouServei() {
    setEditServeiId(null);
    setServeiForm(emptyServei);
    setServeiErr(null);
    setShowServei(true);
  }
  function editaServei(s: Servei) {
    setEditServeiId(s.id);
    setServeiForm({
      activitat: s.activitat,
      proveidorId: s.proveidor?.id ?? '',
      categoriaId: '',
      frequencia: s.frequencia,
      importPrevist: s.importPrevist != null ? String(s.importPrevist) : '',
      metodePagament: s.metodePagament,
      properaData: toISODate(new Date(s.properaData)),
      vigenciaInici: s.vigenciaInici ? toISODate(new Date(s.vigenciaInici)) : '',
      vigenciaFi: s.vigenciaFi ? toISODate(new Date(s.vigenciaFi)) : '',
      generaDespesa: s.generaDespesa,
      observacions: s.observacions ?? '',
    });
    setServeiErr(null);
    setShowServei(true);
  }

  async function desaServei(e: React.FormEvent) {
    e.preventDefault();
    if (!serveiForm.activitat || !serveiForm.properaData) return;
    setSavingServei(true);
    setServeiErr(null);
    try {
      const payload = {
        activitat: serveiForm.activitat,
        proveidorId: serveiForm.proveidorId || undefined,
        categoriaId: serveiForm.categoriaId || undefined,
        frequencia: serveiForm.frequencia,
        importPrevist: serveiForm.importPrevist || undefined,
        metodePagament: serveiForm.metodePagament,
        properaData: serveiForm.properaData,
        vigenciaInici: serveiForm.vigenciaInici || undefined,
        vigenciaFi: serveiForm.vigenciaFi || undefined,
        generaDespesa: serveiForm.generaDespesa,
        observacions: serveiForm.observacions || undefined,
      };
      if (editServeiId) {
        await patchJSON(`/api/serveis-recurrents/${editServeiId}`, payload);
      } else {
        await postJSON('/api/serveis-recurrents', payload);
      }
      setShowServei(false);
      setEditServeiId(null);
      setServeiForm(emptyServei);
      await loadServeis();
    } catch (err) {
      setServeiErr(err instanceof ApiError ? err.message : 'Error desant el servei');
    } finally {
      setSavingServei(false);
    }
  }

  async function toggleServei(s: Servei) {
    await patchJSON(`/api/serveis-recurrents/${s.id}`, { actiu: !s.actiu });
    await loadServeis();
  }
  async function esborraServei(s: Servei) {
    if (!confirm(`Eliminar el servei "${s.activitat}"?`)) return;
    await delJSON(`/api/serveis-recurrents/${s.id}`);
    await loadServeis();
  }

  // ---- Proveïdors --------------------------------------------------------
  function obreNouProv() {
    setEditProvId(null);
    setProvForm(emptyProv);
    setProvErr(null);
    setShowProv(true);
  }
  function editaProv(p: Prov) {
    setEditProvId(p.id);
    setProvForm({
      nom: p.nom,
      activitat: p.activitat ?? '',
      telefon: p.telefon ?? '',
      email: p.email ?? '',
      adreca: p.adreca ?? '',
      web: p.web ?? '',
      cif: p.cif ?? '',
      notes: p.notes ?? '',
    });
    setProvErr(null);
    setShowProv(true);
  }
  async function desaProv(e: React.FormEvent) {
    e.preventDefault();
    if (!provForm.nom) return;
    setSavingProv(true);
    setProvErr(null);
    try {
      const payload = {
        nom: provForm.nom,
        activitat: provForm.activitat || undefined,
        telefon: provForm.telefon || undefined,
        email: provForm.email || undefined,
        adreca: provForm.adreca || undefined,
        web: provForm.web || undefined,
        cif: provForm.cif || undefined,
        notes: provForm.notes || undefined,
      };
      if (editProvId) {
        await patchJSON(`/api/proveidors/${editProvId}`, payload);
      } else {
        await postJSON('/api/proveidors', payload);
      }
      setShowProv(false);
      setEditProvId(null);
      setProvForm(emptyProv);
      await loadProveidors();
    } catch (err) {
      setProvErr(err instanceof ApiError ? err.message : 'Error desant el proveïdor');
    } finally {
      setSavingProv(false);
    }
  }
  async function esborraProv(p: Prov) {
    if (!confirm(`Eliminar el proveïdor "${p.nom}"?`)) return;
    await delJSON(`/api/proveidors/${p.id}`);
    await loadProveidors();
  }

  const actius = serveis.filter((s) => s.actiu).length;

  return (
    <div>
      <PageHeader
        title="Proveïdors i serveis"
        subtitle="Manteniments i contractes recurrents (assegurança, extintors, LOPD…) — al calendari i a la comptabilitat"
        actions={
          <Button onClick={obreNouServei}>
            <Plus className="h-4 w-4" /> Nou servei
          </Button>
        }
      />

      <FinancesNav />

      {/* ---- Formulari de servei ---- */}
      {showServei && (
        <Card className="mb-6">
          <CardHeader className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-600" />
            <CardTitle>{editServeiId ? 'Editar servei' : 'Nou servei recurrent'}</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={desaServei} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Activitat / servei" required className="lg:col-span-2">
                <Input
                  value={serveiForm.activitat}
                  onChange={(e) => setServeiForm({ ...serveiForm, activitat: e.target.value })}
                  placeholder="P. ex. Sistema de protecció contra incendi"
                />
              </Field>
              <Field label="Proveïdor">
                <Select
                  value={serveiForm.proveidorId}
                  onChange={(e) => setServeiForm({ ...serveiForm, proveidorId: e.target.value })}
                >
                  <option value="">—</option>
                  {proveidors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Freqüència" required>
                <Select
                  value={serveiForm.frequencia}
                  onChange={(e) =>
                    setServeiForm({ ...serveiForm, frequencia: e.target.value as FrequenciaServeiValue })
                  }
                >
                  {frequenciaServeiValues.map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCIA_SERVEI_LABELS[f]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Propera data (visita/renovació/pagament)" required>
                <Input
                  type="date"
                  value={serveiForm.properaData}
                  onChange={(e) => setServeiForm({ ...serveiForm, properaData: e.target.value })}
                />
              </Field>
              <Field label="Import previst €">
                <Input
                  type="number"
                  step="0.01"
                  value={serveiForm.importPrevist}
                  onChange={(e) => setServeiForm({ ...serveiForm, importPrevist: e.target.value })}
                />
              </Field>
              <Field label="Mètode de pagament">
                <Select
                  value={serveiForm.metodePagament}
                  onChange={(e) => setServeiForm({ ...serveiForm, metodePagament: e.target.value })}
                >
                  {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Categoria de despesa" hint="Si no en tries cap, va a “Serveis i manteniments”.">
                <Select
                  value={serveiForm.categoriaId}
                  onChange={(e) => setServeiForm({ ...serveiForm, categoriaId: e.target.value })}
                >
                  <option value="">— (per defecte)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Vigència — des de">
                <Input
                  type="date"
                  value={serveiForm.vigenciaInici}
                  onChange={(e) => setServeiForm({ ...serveiForm, vigenciaInici: e.target.value })}
                />
              </Field>
              <Field label="Vigència — fins a">
                <Input
                  type="date"
                  value={serveiForm.vigenciaFi}
                  onChange={(e) => setServeiForm({ ...serveiForm, vigenciaFi: e.target.value })}
                />
              </Field>
              <Field label="Observacions" className="lg:col-span-3">
                <Textarea
                  rows={2}
                  value={serveiForm.observacions}
                  onChange={(e) => setServeiForm({ ...serveiForm, observacions: e.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700 lg:col-span-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={serveiForm.generaDespesa}
                  onChange={(e) => setServeiForm({ ...serveiForm, generaDespesa: e.target.checked })}
                />
                Generar la despesa automàticament cada cop que venci (es comptabilitza l’import previst)
              </label>
              <div className="flex items-center gap-3 lg:col-span-3">
                <Button type="submit" disabled={savingServei}>
                  {savingServei ? 'Desant…' : editServeiId ? 'Desar canvis' : 'Desar servei'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowServei(false)}>
                  Cancel·lar
                </Button>
                {serveiErr && <span className="text-sm text-red-600">{serveiErr}</span>}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* ---- Llista de serveis ---- */}
      <h2 className="mb-2 mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Serveis i manteniments · {actius} actius
      </h2>
      {serveis.length === 0 ? (
        <EmptyState>
          <Truck className="mx-auto mb-2 h-5 w-5 text-slate-300" /> Cap servei donat d’alta encara.
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Activitat</Th>
              <Th>Proveïdor</Th>
              <Th>Freqüència</Th>
              <Th>Propera</Th>
              <Th className="text-right">Import</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {serveis.map((s) => {
              const vencut = new Date(s.properaData) < new Date();
              return (
                <Tr key={s.id} className={!s.actiu ? 'opacity-50' : ''}>
                  <Td className="font-medium text-slate-800">
                    {s.activitat}
                    {!s.actiu && <span className="ml-2 text-xs text-slate-400">(pausat)</span>}
                    {s.observacions && <p className="text-xs font-normal text-slate-400">{s.observacions}</p>}
                  </Td>
                  <Td>{s.proveidor?.nom ?? '—'}</Td>
                  <Td>{FREQUENCIA_SERVEI_LABELS[s.frequencia]}</Td>
                  <Td>
                    <Badge tone={!s.actiu ? 'neutral' : vencut ? 'danger' : 'info'}>
                      {formatDate(s.properaData)}
                    </Badge>
                  </Td>
                  <Td className="text-right">{s.importPrevist != null ? formatEur(Number(s.importPrevist)) : '—'}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="rounded p-1 text-slate-400 hover:text-amber-600"
                        title={s.actiu ? 'Pausar' : 'Activar'}
                        onClick={() => toggleServei(s)}
                      >
                        {s.actiu ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        className="rounded p-1 text-slate-400 hover:text-brand-600"
                        title="Editar"
                        onClick={() => editaServei(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded p-1 text-slate-400 hover:text-red-600"
                        title="Eliminar"
                        onClick={() => esborraServei(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* ---- Proveïdors ---- */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Proveïdors · {proveidors.length}
        </h2>
        <Button variant="outline" size="sm" onClick={obreNouProv}>
          <Plus className="h-4 w-4" /> Nou proveïdor
        </Button>
      </div>

      {showProv && (
        <Card className="my-4">
          <CardHeader className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-brand-600" />
            <CardTitle>{editProvId ? 'Editar proveïdor' : 'Nou proveïdor'}</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={desaProv} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nom" required>
                <Input value={provForm.nom} onChange={(e) => setProvForm({ ...provForm, nom: e.target.value })} placeholder="P. ex. SEGURVIP" />
              </Field>
              <Field label="Activitat">
                <Input value={provForm.activitat} onChange={(e) => setProvForm({ ...provForm, activitat: e.target.value })} placeholder="Assegurances, extintors…" />
              </Field>
              <Field label="Telèfon">
                <Input value={provForm.telefon} onChange={(e) => setProvForm({ ...provForm, telefon: e.target.value })} />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={provForm.email} onChange={(e) => setProvForm({ ...provForm, email: e.target.value })} />
              </Field>
              <Field label="Adreça">
                <Input value={provForm.adreca} onChange={(e) => setProvForm({ ...provForm, adreca: e.target.value })} />
              </Field>
              <Field label="Web">
                <Input value={provForm.web} onChange={(e) => setProvForm({ ...provForm, web: e.target.value })} />
              </Field>
              <Field label="CIF/NIF">
                <Input value={provForm.cif} onChange={(e) => setProvForm({ ...provForm, cif: e.target.value })} />
              </Field>
              <Field label="Notes" className="lg:col-span-2">
                <Input value={provForm.notes} onChange={(e) => setProvForm({ ...provForm, notes: e.target.value })} />
              </Field>
              <div className="flex items-center gap-3 lg:col-span-3">
                <Button type="submit" disabled={savingProv}>
                  {savingProv ? 'Desant…' : editProvId ? 'Desar canvis' : 'Desar proveïdor'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowProv(false)}>
                  Cancel·lar
                </Button>
                {provErr && <span className="text-sm text-red-600">{provErr}</span>}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {proveidors.length === 0 ? (
        <EmptyState>
          <Truck className="mx-auto mb-2 h-5 w-5 text-slate-300" /> Cap proveïdor encara.
        </EmptyState>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {proveidors.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{p.nom}</p>
                    {p.activitat && <p className="text-xs text-slate-500">{p.activitat}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button className="rounded p-1 text-slate-400 hover:text-brand-600" title="Editar" onClick={() => editaProv(p)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="rounded p-1 text-slate-400 hover:text-red-600" title="Eliminar" onClick={() => esborraProv(p)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  {p.telefon && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`tel:${p.telefon}`} className="hover:text-brand-700">{p.telefon}</a>
                    </p>
                  )}
                  {p.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`mailto:${p.email}`} className="truncate hover:text-brand-700">{p.email}</a>
                    </p>
                  )}
                  {p.adreca && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{p.adreca}</span>
                    </p>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
