'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Truck, Phone, Mail, MapPin, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/table';
import { getJSON, postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';

// Els serveis recurrents (lloguer, llum, aigua…) ja no es mostren aquí: els avisos
// van a Recordatoris. Continuen a la BD perquè les factures pujades amb foto es
// vinculen soles al servei del proveïdor i surten a «Fixes» de Despeses.

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

export default function ProveidorsPage() {
  const [proveidors, setProveidors] = useState<Prov[]>([]);
  const [showProv, setShowProv] = useState(false);
  const [provForm, setProvForm] = useState(emptyProv);
  const [editProvId, setEditProvId] = useState<string | null>(null);
  const [provErr, setProvErr] = useState<string | null>(null);
  const [savingProv, setSavingProv] = useState(false);
  const [cerca, setCerca] = useState('');

  // Cerca a l'instant (sense accents ni majúscules).
  const norm = (x: string | null) => (x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const t = norm(cerca.trim());
  const visibles = t
    ? proveidors.filter((p) => [p.nom, p.activitat, p.telefon, p.email, p.cif].some((c) => norm(c).includes(t)))
    : proveidors;

  const loadProveidors = useCallback(async () => {
    const r = await getJSON<{ proveidors: Prov[] }>('/api/proveidors');
    setProveidors(r.proveidors);
  }, []);

  useEffect(() => {
    loadProveidors();
  }, [loadProveidors]);

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

  return (
    <div>
      <PageHeader
        title="Proveïdors"
        subtitle={`Contactes dels proveïdors · ${proveidors.length}`}
        actions={
          <Button onClick={obreNouProv}>
            <Plus className="h-4 w-4" /> Nou proveïdor
          </Button>
        }
      />

      <FinancesNav />

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

      {/* Plantilla de Finances: sota les pestanyes, sempre la targeta blanca. */}
      <div className="ui-card mb-4 mt-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
        <label className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca per nom, activitat, telèfon o NIF…" aria-label="Cerca proveïdors" className="pl-9" />
        </label>
        <span className="text-sm text-slate-500">
          {visibles.length === proveidors.length ? `${proveidors.length} proveïdors` : `${visibles.length} de ${proveidors.length}`}
        </span>
      </div>

      {visibles.length === 0 ? (
        <EmptyState>
          <Truck className="mx-auto mb-2 h-5 w-5 text-slate-300" /> {proveidors.length === 0 ? 'Cap proveïdor encara.' : `Cap proveïdor amb «${cerca}».`}
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-slate-900">{p.nom}</p>
                    {p.activitat && <p className="truncate text-[13px] text-slate-500">{p.activitat}</p>}
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
                {/* Contacte en una línia (telèfon · correu) i l'adreça a sota. */}
                <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-0.5 text-[12.5px] text-slate-500">
                  {p.telefon && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <a href={`tel:${p.telefon}`} className="hover:text-brand-700">{p.telefon}</a>
                    </span>
                  )}
                  {p.email && (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <a href={`mailto:${p.email}`} className="truncate hover:text-brand-700">{p.email}</a>
                    </span>
                  )}
                  {p.adreca && (
                    <span className="flex w-full min-w-0 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{p.adreca}</span>
                    </span>
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
