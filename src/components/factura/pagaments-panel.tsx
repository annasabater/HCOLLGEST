'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Receipt, Undo2, ShieldCheck, ChevronDown } from 'lucide-react';
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

// Fiança = garantia retornable. Queda en custòdia i NO és ingrés fins que es
// reté. Es gestiona aquí mateix, dins dels pagaments de l'estada.
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
  const [open, setOpen] = useState(false);
  const [tipus, setTipus] = useState<'PAGAMENT' | 'FIANCA'>('PAGAMENT');
  const [importVal, setImport] = useState('');
  const [metode, setMetode] = useState('EFECTIU');
  const [dataCobrament, setDataCobrament] = useState(() => new Date().toISOString().slice(0, 10));
  const [etapa, setEtapa] = useState<'A compte' | 'Cobro' | 'Altre'>('Cobro');
  const [altreText, setAltreText] = useState('');
  const [observacions, setObservacions] = useState('');
  const [pucTornar, setPucTornar] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [facturaIdDest, setFacturaIdDest] = useState('');
  const [incloureFianca, setIncloureFianca] = useState(false);
  const [fiancaOberta, setFiancaOberta] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aCompte = pagaments.filter((p) => !p.facturaId);
  const facturats = pagaments.filter((p) => p.facturaId);
  const totalACompte = aCompte.reduce((a, p) => a + p.import, 0);
  const selTotal = aCompte.filter((p) => sel.has(p.id)).reduce((a, p) => a + p.import, 0);

  const fiancesActives = fiances.filter((f) => f.estat !== 'TORNAT');
  const custodia = fiances.filter((f) => f.estat === 'EN_CUSTODIA').reduce((a, f) => a + f.import, 0);

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const togglePucTornar = (id: string) =>
    setPucTornar((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  function obrir(t: 'PAGAMENT' | 'FIANCA') {
    setTipus(t);
    setObservacions('');
    setError(null);
    setOpen(true);
  }

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

  async function generarRebut() {
    const ids = aCompte.filter((p) => sel.has(p.id)).map((p) => p.id);
    if (!ids.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postJSON(`/api/estancies/${estanciaId}/factura-seleccio`, { pagamentIds: ids }) as { factura: { id: string } };
      setSel(new Set());
      if (incloureFianca && custodia > 0 && res?.factura?.id) {
        router.push(`/imprimir/factura-simple/${res.factura.id}?custodia=true`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error generant el rebut');
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
      {aCompte.length > 0 && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
          A compte (sense factura): <strong>{formatEur(totalACompte)}</strong>
        </div>
      )}

      {aCompte.length > 0 && (
        <div className="space-y-2">
          {aCompte.map((p) => (
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
              <button
                type="button"
                className="ml-auto text-slate-400 hover:text-red-600"
                onClick={() => eliminarPagament(p.id)}
                title="Eliminar pagament"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </label>
          ))}
          {custodia > 0 && (
            <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={incloureFianca}
                onChange={(e) => setIncloureFianca(e.target.checked)}
              />
              <span className="font-medium text-slate-800">{formatEur(custodia)}</span>
              <span className="text-slate-400"> · Fiança · En custòdia</span>
            </label>
          )}
          <Button type="button" size="sm" onClick={generarRebut} disabled={busy || selTotal <= 0}>
            <Receipt className="h-4 w-4" /> Fer rebut ({formatEur(incloureFianca ? selTotal + custodia : selTotal)})
          </Button>
        </div>
      )}

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

      {/* Fiances (garantia retornable) — col·lapsable, mateixa estètica que pagaments */}
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
              {fiancesActives.map((f) => (
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
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => eliminarFianca(f.id)}
                        title="Eliminar fiança"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {f.observacions && (
                    <p className="mt-1 text-xs text-slate-400 italic">{f.observacions}</p>
                  )}
                  {f.motiu && <p className="mt-0.5 text-xs text-slate-500">{f.motiu}</p>}

                  {/* Checkbox per activar les accions de resolució */}
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
                        <Undo2 className="h-4 w-4" /> Tornar a l'hoste
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
              ))}
            </div>
          )}
        </div>
      )}

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
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
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
