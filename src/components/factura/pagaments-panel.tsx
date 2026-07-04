'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Undo2, ShieldCheck, ChevronDown, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatEur, formatDate } from '@/lib/utils';
import {
  optionsFrom,
  metodeCobramentValues,
  METODE_COBRAMENT_LABELS,
  CONCEPTE_LINIA_LABELS,
} from '@/lib/validation/enums';

export interface Pagament {
  id: string;
  import: number;
  metode: keyof typeof METODE_COBRAMENT_LABELS;
  concepte: keyof typeof CONCEPTE_LINIA_LABELS;
  descripcio: string | null;
  data: string;
  facturaId: string | null;
  facturaNumero: string | null;
}

export interface Fianca {
  id: string;
  import: number;
  data: string;
  metode: keyof typeof METODE_COBRAMENT_LABELS;
  estat: 'EN_CUSTODIA' | 'TORNAT' | 'RETINGUT';
  motiu: string | null;
  notes: string | null;
  observacions: string | null;
  facturaId: string | null;
  facturaNumero: string | null;
}

const FIANCA_ESTAT_LABEL: Record<Fianca['estat'], string> = {
  EN_CUSTODIA: 'Fiança',
  TORNAT: 'Tornada',
  RETINGUT: 'Retinguda (ingrés)',
};

export function PagamentsPanel({
  estanciaId,
  pagaments,
  fiances,
  numContracte,
  facturesActuals,
}: {
  estanciaId: string;
  pagaments: Pagament[];
  fiances: Fianca[];
  numContracte?: string | null;
  facturesActuals?: { id: string; numero: string }[];
}) {
  const router = useRouter();

  // Form state
  const [open, setOpen] = useState(false);
  const [tipus, setTipus] = useState<'PAGAMENT' | 'FIANCA'>('PAGAMENT');
  const [importVal, setImport] = useState('');
  const [metode, setMetode] = useState('EFECTIU');
  const [dataCobrament, setDataCobrament] = useState(() => new Date().toISOString().slice(0, 10));
  const [etapa, setEtapa] = useState<'A compte' | 'Cobro' | 'Total' | 'Altre'>('A compte');
  const [altreText, setAltreText] = useState('');
  const [observacions, setObservacions] = useState('');
  const [facturaIdDest, setFacturaIdDest] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded fiances section
  const [fiancaOberta, setFiancaOberta] = useState(false);
  // Edit pagament inline
  const [editPagId, setEditPagId] = useState<string | null>(null);
  const [editPagImport, setEditPagImport] = useState('');
  const [editPagMetode, setEditPagMetode] = useState('EFECTIU');
  const [editPagData, setEditPagData] = useState('');
  const [editPagBusy, setEditPagBusy] = useState(false);

  // Edit fiança inline
  const [editFiancaId, setEditFiancaId] = useState<string | null>(null);
  const [editFiancaImport, setEditFiancaImport] = useState('');
  const [editFiancaMetode, setEditFiancaMetode] = useState('EFECTIU');
  const [editFiancaData, setEditFiancaData] = useState('');
  const [editFiancaNotes, setEditFiancaNotes] = useState('');
  const [editFiancaFacturaId, setEditFiancaFacturaId] = useState<string>('');
  const [editFiancaBusy, setEditFiancaBusy] = useState(false);

  const aCompte = pagaments.filter((p) => !p.facturaId);
  const facturats = pagaments.filter((p) => p.facturaId);
  const totalACompte = aCompte.reduce((a, p) => a + p.import, 0);

  const fiancesCustodia = fiances.filter((f) => f.estat === 'EN_CUSTODIA' && !f.facturaId);
  const fiancesFacturades = fiances.filter((f) => f.facturaId);

  function obrir(t: 'PAGAMENT' | 'FIANCA') {
    setTipus(t);
    setEtapa(t === 'PAGAMENT' ? 'A compte' : 'Cobro');
    setObservacions('');
    setImport('');
    setAltreText('');
    setError(null);
    setOpen(true);
  }

  // ── Edit pagament ──────────────────────────────────────────────────────────
  function startEditPag(p: Pagament) {
    setEditPagId(p.id);
    setEditPagImport(String(p.import));
    setEditPagMetode(p.metode);
    setEditPagData(p.data.slice(0, 10));
  }

  async function desarPagament(id: string) {
    setEditPagBusy(true);
    try {
      await patchJSON(`/api/cobraments/${id}`, {
        import: Number(editPagImport),
        metode: editPagMetode,
        data: editPagData || undefined,
      });
      setEditPagId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error desant');
    } finally {
      setEditPagBusy(false);
    }
  }

  // ── Edit fiança ────────────────────────────────────────────────────────────
  function startEditFianca(f: Fianca) {
    setEditFiancaId(f.id);
    setEditFiancaImport(String(f.import));
    setEditFiancaMetode(f.metode);
    setEditFiancaData(f.data.slice(0, 10));
    setEditFiancaNotes(f.notes ?? '');
    setEditFiancaFacturaId(f.facturaId ?? '');
  }

  async function desarFianca(id: string) {
    setEditFiancaBusy(true);
    try {
      await patchJSON(`/api/diposits/${id}`, {
        import: Number(editFiancaImport),
        metode: editFiancaMetode,
        data: editFiancaData || undefined,
        notes: editFiancaNotes || undefined,
        facturaId: editFiancaFacturaId || null,
      });
      setEditFiancaId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error desant');
    } finally {
      setEditFiancaBusy(false);
    }
  }

  // ── Afegir pagament / fiança ───────────────────────────────────────────────
  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    if (!importVal) return;
    setBusy(true);
    setError(null);
    try {
      const notesVal = etapa === 'Altre' ? (altreText || undefined) : etapa;
      if (tipus === 'FIANCA') {
        await postJSON(`/api/estancies/${estanciaId}/diposits`, {
          import: Number(importVal),
          metode,
          destinacio: 'CUSTODIA',
          notes: notesVal,
          observacions: observacions || undefined,
          data: dataCobrament || undefined,
        });
      } else {
        await postJSON(`/api/estancies/${estanciaId}/pagaments`, {
          import: Number(importVal),
          metode,
          concepte: 'ALLOTJAMENT',
          descripcio: notesVal,
          observacions: observacions || undefined,
          data: dataCobrament || undefined,
          facturaId: facturaIdDest || undefined,
        });
      }
      setImport('');
      setAltreText('');
      setObservacions('');
      setFacturaIdDest('');
      setDataCobrament(new Date().toISOString().slice(0, 10));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error registrant');
    } finally {
      setBusy(false);
    }
  }

  async function eliminarPagament(id: string) {
    if (!confirm('Eliminar aquest pagament a compte?')) return;
    try {
      await delJSON(`/api/cobraments/${id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No s'ha pogut eliminar");
    }
  }

  async function resoldreFianca(id: string, estat: 'TORNAT' | 'RETINGUT') {
    const motiu =
      estat === 'RETINGUT' ? (window.prompt('Motiu de la retenció (opcional):') ?? undefined) : undefined;
    try {
      await patchJSON(`/api/diposits/${id}`, { estat, motiu });
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No s'ha pogut actualitzar la fiança");
    }
  }

  async function eliminarFianca(id: string) {
    if (!confirm('Eliminar aquesta fiança definitivament?')) return;
    try {
      await delJSON(`/api/diposits/${id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No s'ha pogut eliminar");
    }
  }

  const teBres = aCompte.length > 0 || facturats.length > 0 || fiancesCustodia.length > 0 || fiances.some((f) => f.estat !== 'EN_CUSTODIA');

  return (
    <div className="space-y-4">
      {!teBres && (
        <p className="text-sm text-slate-400 italic">Sense pagaments ni fiances registrats.</p>
      )}

      {/* ── Pagaments a compte ─────────────────────────────────────────── */}
      {aCompte.length > 0 && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
          A compte (sense factura): <strong>{formatEur(totalACompte)}</strong>
        </div>
      )}

      {aCompte.length > 0 && (
        <div className="space-y-2">
          {aCompte.map((p) =>
            editPagId === p.id ? (
              <div key={p.id} className="rounded-lg border border-brand-200 bg-brand-50/30 px-3 py-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-28">
                    <label className="mb-1 block text-xs text-slate-500">Import</label>
                    <Input type="number" step="0.01" value={editPagImport} onChange={(e) => setEditPagImport(e.target.value)} />
                  </div>
                  <div className="w-32">
                    <label className="mb-1 block text-xs text-slate-500">Mètode</label>
                    <Select value={editPagMetode} onChange={(e) => setEditPagMetode(e.target.value)}>
                      {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-36">
                    <label className="mb-1 block text-xs text-slate-500">Data</label>
                    <Input type="date" value={editPagData} onChange={(e) => setEditPagData(e.target.value)} />
                  </div>
                  <Button type="button" size="sm" onClick={() => desarPagament(p.id)} disabled={editPagBusy}>
                    <Check className="h-4 w-4" /> Desar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditPagId(null)}>
                    <X className="h-4 w-4" /> Cancel·lar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">{formatEur(p.import)}</span>
                <span className="text-slate-400">
                  {p.descripcio ? ` · ${p.descripcio}` : ''} · {METODE_COBRAMENT_LABELS[p.metode]} ·{' '}
                  {formatDate(p.data)}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-brand-600"
                    onClick={(e) => { e.preventDefault(); startEditPag(p); }}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-600"
                    onClick={(e) => { e.preventDefault(); eliminarPagament(p.id); }}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          )}

          {/* Fiances en custòdia — estil igual que pagaments */}
          {fiancesCustodia.map((f) =>
            editFiancaId === f.id ? (
              <div key={f.id} className="rounded-lg border border-amber-300 bg-amber-50/30 px-3 py-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-28">
                    <label className="mb-1 block text-xs text-slate-500">Import</label>
                    <Input type="number" step="0.01" value={editFiancaImport} onChange={(e) => setEditFiancaImport(e.target.value)} />
                  </div>
                  <div className="w-32">
                    <label className="mb-1 block text-xs text-slate-500">Mètode</label>
                    <Select value={editFiancaMetode} onChange={(e) => setEditFiancaMetode(e.target.value)}>
                      {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-36">
                    <label className="mb-1 block text-xs text-slate-500">Data</label>
                    <Input type="date" value={editFiancaData} onChange={(e) => setEditFiancaData(e.target.value)} />
                  </div>
                  <div className="w-40">
                    <label className="mb-1 block text-xs text-slate-500">Etiqueta</label>
                    <Input placeholder="Cobro, A compte…" value={editFiancaNotes} onChange={(e) => setEditFiancaNotes(e.target.value)} />
                  </div>
                  {(facturesActuals ?? []).length > 0 && (
                    <div className="w-44">
                      <label className="mb-1 block text-xs text-slate-500">Vincular a factura</label>
                      <Select value={editFiancaFacturaId} onChange={(e) => setEditFiancaFacturaId(e.target.value)}>
                        <option value="">— Sense factura —</option>
                        {(facturesActuals ?? []).map((fac) => (
                          <option key={fac.id} value={fac.id}>{fac.numero}</option>
                        ))}
                      </Select>
                    </div>
                  )}
                  <Button type="button" size="sm" onClick={() => desarFianca(f.id)} disabled={editFiancaBusy}>
                    <Check className="h-4 w-4" /> Desar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditFiancaId(null)}>
                    <X className="h-4 w-4" /> Cancel·lar
                  </Button>
                  <div className="ml-auto flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setEditFiancaId(null); resoldreFianca(f.id, 'TORNAT'); }}>
                      <Undo2 className="h-4 w-4" /> Tornar
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setEditFiancaId(null); resoldreFianca(f.id, 'RETINGUT'); }}>
                      Retenir
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={f.id}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">{formatEur(f.import)}</span>
                <span className="text-slate-400">
                  · {f.notes ?? 'Fiança'} · {METODE_COBRAMENT_LABELS[f.metode]} · {formatDate(f.data)}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-brand-600"
                    onClick={(e) => { e.preventDefault(); startEditFianca(f); }}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-600"
                    onClick={(e) => { e.preventDefault(); eliminarFianca(f.id); }}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ── Facturats (pagaments + fiances) ───────────────────────────── */}
      {(facturats.length > 0 || fiancesFacturades.length > 0) && (
        <div className="space-y-1 border-t border-slate-100 pt-2">
          <p className="text-xs font-medium text-slate-500">Ja en una factura</p>
          {facturats.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-slate-500"
            >
              <span>
                {formatEur(p.import)} · {METODE_COBRAMENT_LABELS[p.metode]} · {formatDate(p.data)}
              </span>
              {p.facturaId && (
                <Link href={`/factures/${p.facturaId}`}>
                  <Badge tone="neutral">{numContracte ? `Contracte ${numContracte}` : (p.facturaNumero ?? 'Factura')}</Badge>
                </Link>
              )}
            </div>
          ))}
          {fiancesFacturades.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-slate-500"
            >
              <span>
                {formatEur(f.import)} · {f.notes ?? 'Fiança'} · {METODE_COBRAMENT_LABELS[f.metode]} · {formatDate(f.data)}
              </span>
              {f.facturaId && (
                <Link href={`/factures/${f.facturaId}`}>
                  <Badge tone="neutral">{numContracte ? `Contracte ${numContracte}` : (f.facturaNumero ?? 'Factura')}</Badge>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Fiances resoltes (TORNAT / RETINGUT) — historial col·lapsable ── */}
      {fiances.filter((f) => f.estat !== 'EN_CUSTODIA').length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setFiancaOberta((o) => !o)}
          >
            <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Fiances resoltes
            </p>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform text-slate-400 ${fiancaOberta ? 'rotate-180' : ''}`} />
          </button>
          {fiancaOberta && (
            <div className="mt-2 space-y-1">
              {fiances.filter((f) => f.estat !== 'EN_CUSTODIA').map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-slate-500">
                  <span>
                    {formatEur(f.import)}{f.notes ? ` · ${f.notes}` : ''} · {METODE_COBRAMENT_LABELS[f.metode]} · {formatDate(f.data)}
                  </span>
                  <Badge tone={f.estat === 'RETINGUT' ? 'success' : 'neutral'}>
                    {FIANCA_ESTAT_LABEL[f.estat]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Formulari afegir ────────────────────────────────────────────── */}
      {open ? (
        <form onSubmit={afegir} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="Import €"
              value={importVal}
              onChange={(e) => setImport(e.target.value)}
            />
            <Select value={metode} onChange={(e) => setMetode(e.target.value)}>
              {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Input
              type="date"
              value={dataCobrament}
              onChange={(e) => setDataCobrament(e.target.value)}
              aria-label="Data de cobrament"
            />
            <Select value={etapa} onChange={(e) => setEtapa(e.target.value as typeof etapa)}>
              <option value="A compte">A compte (reserva anticipada)</option>
              <option value="Cobro">Cobro (pagament a l&apos;arribada)</option>
              <option value="Total">Total (pagament complet)</option>
              <option value="Altre">Altre…</option>
            </Select>
            {etapa === 'Altre' && (
              <Input
                placeholder="Descripció"
                value={altreText}
                onChange={(e) => setAltreText(e.target.value)}
                className="col-span-2"
              />
            )}
            <Input
              placeholder="Observacions internes (no apareix a la factura)"
              value={observacions}
              onChange={(e) => setObservacions(e.target.value)}
              className="col-span-2"
            />
            {tipus === 'PAGAMENT' && facturesActuals && facturesActuals.length > 0 && (
              <Select value={facturaIdDest} onChange={(e) => setFacturaIdDest(e.target.value)} className="col-span-2">
                <option value="">No afegir a cap factura</option>
                {facturesActuals.map((f) => (
                  <option key={f.id} value={f.id}>Afegir a la factura {f.numero}</option>
                ))}
              </Select>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy || !importVal}>
              {tipus === 'FIANCA' ? 'Desar fiança' : 'Desar pagament'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel·lar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => obrir('PAGAMENT')}>
            <Plus className="h-4 w-4" /> Afegir pagament
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-orange-400 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
            onClick={() => obrir('FIANCA')}
          >
            <ShieldCheck className="h-4 w-4" /> Afegir fiança
          </Button>
        </div>
      )}
      {error && !open && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
