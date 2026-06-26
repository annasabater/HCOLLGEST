'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Receipt, Undo2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatEur, formatDate } from '@/lib/utils';
import {
  optionsFrom,
  metodeCobramentValues,
  METODE_COBRAMENT_LABELS,
  concepteLiniaValues,
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
  const [concepte, setConcepte] = useState('ALLOTJAMENT');
  const [etapa, setEtapa] = useState<'A compte' | 'Cobro' | 'Altre'>('Cobro');
  const [altreText, setAltreText] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [facturaIdDest, setFacturaIdDest] = useState('');
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

  function obrir(t: 'PAGAMENT' | 'FIANCA') {
    setTipus(t);
    setError(null);
    setOpen(true);
  }

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    if (!importVal) return;
    setBusy(true);
    setError(null);
    try {
      const notesVal = tipus === 'FIANCA'
        ? (altreText || undefined)
        : (etapa === 'Altre' ? (altreText || undefined) : etapa);
      if (tipus === 'FIANCA') {
        await postJSON(`/api/estancies/${estanciaId}/diposits`, {
          import: Number(importVal),
          metode,
          destinacio: 'CUSTODIA',
          notes: notesVal,
        });
      } else {
        await postJSON(`/api/estancies/${estanciaId}/pagaments`, {
          import: Number(importVal),
          metode,
          concepte,
          descripcio: notesVal,
          facturaId: facturaIdDest || undefined,
        });
      }
      setImport('');
      setAltreText('');
      setFacturaIdDest('');
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
      alert(err instanceof ApiError ? err.message : 'No s’ha pogut eliminar');
    }
  }

  async function generarRebut() {
    const ids = aCompte.filter((p) => sel.has(p.id)).map((p) => p.id);
    if (!ids.length) return;
    setBusy(true);
    setError(null);
    try {
      await postJSON(`/api/estancies/${estanciaId}/factura-seleccio`, { pagamentIds: ids });
      setSel(new Set());
      router.refresh();
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
      alert(err instanceof ApiError ? err.message : 'No s’ha pogut actualitzar la fiança');
    }
  }

  async function eliminarFianca(id: string) {
    if (!confirm('Eliminar aquesta fiança definitivament?')) return;
    try {
      await delJSON(`/api/diposits/${id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'No s’ha pogut eliminar');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Registra els cobraments de l’estada (inicial, resta, extres). Compten com a ingrés de seguida.
        Després fes la factura/rebut marcant quins hi vols incloure; els que deixis sense marcar queden
        a compte i els pots tornar.
      </p>
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
        A compte (sense factura): <strong>{formatEur(totalACompte)}</strong>
      </div>

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
                · {CONCEPTE_LINIA_LABELS[p.concepte]}
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
          <Button type="button" size="sm" onClick={generarRebut} disabled={busy || selTotal <= 0}>
            <Receipt className="h-4 w-4" /> Fer rebut amb els marcats ({formatEur(selTotal)})
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

      {/* Fiances (garantia retornable) — en custòdia, no són ingrés fins que es retenen */}
      {fiancesActives.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Fiances (garantia retornable)
            </p>
            <span className="text-xs text-slate-500">
              En custòdia: <strong>{formatEur(custodia)}</strong>
            </span>
          </div>
          {fiancesActives.map((f) => (
            <div key={f.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">
                  {formatEur(f.import)}{' '}
                  <span className="text-slate-400">
                    · {METODE_COBRAMENT_LABELS[f.metode]} · {formatDate(f.data)}
                  </span>
                </span>
                <Badge tone={f.estat === 'RETINGUT' ? 'success' : 'neutral'}>
                  {FIANCA_ESTAT_LABEL[f.estat]}
                </Badge>
              </div>
              {f.motiu && <p className="mt-1 text-xs text-slate-500">{f.motiu}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {f.estat === 'EN_CUSTODIA' && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => resoldreFianca(f.id, 'TORNAT')}
                    >
                      <Undo2 className="h-4 w-4" /> Tornar a l’hoste
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => resoldreFianca(f.id, 'RETINGUT')}
                    >
                      Retenir (ingrés)
                    </Button>
                  </>
                )}
                {f.estat === 'RETINGUT' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => resoldreFianca(f.id, 'TORNAT')}
                  >
                    <Undo2 className="h-4 w-4" /> Tornar (reemborsar)
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => eliminarFianca(f.id)}
                  title="Eliminar fiança"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <form onSubmit={afegir} className="space-y-2 rounded-lg border border-slate-200 p-3">
          {tipus === 'FIANCA' && (
            <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
              La fiança queda <strong>en custòdia</strong> i <strong>no</strong> compta com a ingrés
              fins que la retens.
            </p>
          )}
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
            {tipus === 'PAGAMENT' && (
              <Select value={concepte} onChange={(e) => setConcepte(e.target.value)}>
                {optionsFrom(concepteLiniaValues, CONCEPTE_LINIA_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
            {tipus === 'PAGAMENT' ? (
              <Select value={etapa} onChange={(e) => setEtapa(e.target.value as typeof etapa)}>
                <option value="A compte">A compte (reserva anticipada)</option>
                <option value="Cobro">Cobro (pagament a l&apos;arribada)</option>
                <option value="Altre">Altre…</option>
              </Select>
            ) : (
              <Input
                placeholder="Notes (opcional)"
                value={altreText}
                onChange={(e) => setAltreText(e.target.value)}
              />
            )}
            {tipus === 'PAGAMENT' && etapa === 'Altre' && (
              <Input
                placeholder="Descripció"
                value={altreText}
                onChange={(e) => setAltreText(e.target.value)}
                className="col-span-2"
              />
            )}
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
