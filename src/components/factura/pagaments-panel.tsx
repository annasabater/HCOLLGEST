'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { postJSON, delJSON, ApiError } from '@/lib/api';
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

export function PagamentsPanel({ estanciaId, pagaments }: { estanciaId: string; pagaments: Pagament[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [importVal, setImport] = useState('');
  const [metode, setMetode] = useState('EFECTIU');
  const [concepte, setConcepte] = useState('ALLOTJAMENT');
  const [descripcio, setDescripcio] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aCompte = pagaments.filter((p) => !p.facturaId);
  const facturats = pagaments.filter((p) => p.facturaId);
  const totalACompte = aCompte.reduce((a, p) => a + p.import, 0);
  const selTotal = aCompte.filter((p) => sel.has(p.id)).reduce((a, p) => a + p.import, 0);

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    if (!importVal) return;
    setBusy(true);
    setError(null);
    try {
      await postJSON(`/api/estancies/${estanciaId}/pagaments`, {
        import: Number(importVal),
        metode,
        concepte,
        descripcio: descripcio || undefined,
      });
      setImport('');
      setDescripcio('');
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error registrant el pagament');
    } finally {
      setBusy(false);
    }
  }

  async function eliminar(id: string) {
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

  return (
    <div className="space-y-3">
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
                onClick={() => eliminar(p.id)}
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
                  <Badge tone="neutral">{p.facturaNumero ?? 'Factura'}</Badge>
                </Link>
              )}
            </div>
          ))}
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
            <Select value={concepte} onChange={(e) => setConcepte(e.target.value)}>
              {optionsFrom(concepteLiniaValues, CONCEPTE_LINIA_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Descripció (opcional)"
              value={descripcio}
              onChange={(e) => setDescripcio(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy || !importVal}>
              Desar pagament
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel·lar
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Afegir pagament
        </Button>
      )}
      {error && !open && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
