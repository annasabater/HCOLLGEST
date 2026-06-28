'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, FileText, Undo2, ShieldCheck, ChevronDown, Pencil, Check, X } from 'lucide-react';
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
}

const FIANCA_ESTAT_LABEL: Record<Fianca['estat'], string> = {
  EN_CUSTODIA: 'En custòdia',
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

  // Selecció per crear factura
  const [sel, setSel] = useState<Set<string>>(new Set());

  // Expanded fiances section
  const [fiancaOberta, setFiancaOberta] = useState(false);
  const [pucTornar, setPucTornar] = useState<Set<string>>(new Set());

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
  const [editFiancaBusy, setEditFiancaBusy] = useState(false);

  const aCompte = pagaments.filter((p) => !p.facturaId);
  const facturats = pagaments.filter((p) => p.facturaId);
  const totalACompte = aCompte.reduce((a, p) => a + p.import, 0);
  const selTotal = aCompte.filter((p) => sel.has(p.id)).reduce((a, p) => a + p.import, 0);

  const fiancesActives = fiances.filter((f) => f.estat !== 'TORNAT');
  const fiancesCustodia = fiances.filter((f) => f.estat === 'EN_CUSTODIA');
  const custodia = fiancesCustodia.reduce((a, f) => a + f.import, 0);

  const toggle = (id: string) =>
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePucTornar = (id: string) =>
    setPucTornar((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

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
  }

  async function desarFianca(id: string) {
    setEditFiancaBusy(true);
    try {
      await patchJSON(`/api/diposits/${id}`, {
        import: Number(editFiancaImport),
        metode: editFiancaMetode,
        data: editFiancaData || undefined,
        notes: editFiancaNotes || undefined,
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

  async function crearFactura(tipusDocument: 'FACTURA_SIMPLIFICADA' | 'FACTURA') {
    const ids = aCompte.filter((p) => sel.has(p.id)).map((p) => p.id);
    if (!ids.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postJSON(`/api/estancies/${estanciaId}/factura-seleccio`, {
        pagamentIds: ids,
        tipusDocument,
      }) as { factura: { id: string } };
      setSel(new Set());
      window.open(`/imprimir/factura-simple/${res.factura.id}`, '_blank');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error creant la factura');
    } finally {
      setBusy(false);
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

  const teBres = aCompte.length > 0 || facturats.length > 0 || fiancesActives.length > 0;

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
              <label
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
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
              </label>
            )
          )}

          {/* Fiances en custòdia — visualització ràpida (no seleccionables aquí) */}
          {fiancesCustodia.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm"
            >
              <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="font-medium text-slate-800">{formatEur(f.import)}</span>
              <span className="text-slate-400">
                · {f.notes ?? 'Fiança'} · {METODE_COBRAMENT_LABELS[f.metode]} · {formatDate(f.data)}
              </span>
            </div>
          ))}

          {selTotal > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-500">Crear factura amb {formatEur(selTotal)}:</span>
              <Button type="button" size="sm" variant="outline" onClick={() => crearFactura('FACTURA_SIMPLIFICADA')} disabled={busy}>
                <FileText className="h-4 w-4" /> Factura simplificada
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => crearFactura('FACTURA')} disabled={busy}>
                <FileText className="h-4 w-4" /> Factura fiscal
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Facturats ─────────────────────────────────────────────────── */}
      {facturats.length > 0 && (
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
        </div>
      )}

      {/* ── Fiances (gestió / resolució) ───────────────────────────────── */}
      {fiancesActives.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setFiancaOberta((o) => !o)}
          >
            <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Fiances (garantia retornable)
            </p>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              En custòdia: <strong>{formatEur(custodia)}</strong>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${fiancaOberta ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {fiancaOberta && (
            <div className="mt-2 space-y-2">
              {fiancesActives.map((f) =>
                editFiancaId === f.id ? (
                  <div key={f.id} className="rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2">
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
                      <Button type="button" size="sm" onClick={() => desarFianca(f.id)} disabled={editFiancaBusy}>
                        <Check className="h-4 w-4" /> Desar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditFiancaId(null)}>
                        <X className="h-4 w-4" /> Cancel·lar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={f.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">
                        {formatEur(f.import)}
                        <span className="text-slate-400 font-normal">
                          {f.notes ? ` · ${f.notes}` : ''} · {METODE_COBRAMENT_LABELS[f.metode]} · {formatDate(f.data)}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge tone={f.estat === 'RETINGUT' ? 'success' : 'neutral'}>
                          {FIANCA_ESTAT_LABEL[f.estat]}
                        </Badge>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-brand-600"
                          onClick={() => startEditFianca(f)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => eliminarFianca(f.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {f.observacions && (
                      <p className="mt-1 text-xs text-slate-400 italic">{f.observacions}</p>
                    )}
                    {f.motiu && <p className="mt-0.5 text-xs text-slate-500">{f.motiu}</p>}

                    {f.estat === 'EN_CUSTODIA' && (
                      <label className="mt-2 flex items-center gap-2 cursor-pointer text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={pucTornar.has(f.id)}
                          onChange={() => togglePucTornar(f.id)}
                          className="rounded"
                        />
                        Es pot tornar / gestionar
                      </label>
                    )}
                    {pucTornar.has(f.id) && f.estat === 'EN_CUSTODIA' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => resoldreFianca(f.id, 'TORNAT')}>
                          <Undo2 className="h-4 w-4" /> Tornar a l&apos;hoste
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => resoldreFianca(f.id, 'RETINGUT')}>
                          Retenir (ingrés)
                        </Button>
                      </div>
                    )}
                    {f.estat === 'RETINGUT' && (
                      <div className="mt-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => resoldreFianca(f.id, 'TORNAT')}>
                          <Undo2 className="h-4 w-4" /> Tornar (reemborsar)
                        </Button>
                      </div>
                    )}
                  </div>
                )
              )}
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
          <Button size="sm" variant="outline" onClick={() => obrir('FIANCA')}>
            <ShieldCheck className="h-4 w-4" /> Afegir fiança
          </Button>
        </div>
      )}
      {error && !open && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
