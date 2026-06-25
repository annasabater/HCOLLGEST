'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { postJSON, ApiError } from '@/lib/api';
import { formatEur } from '@/lib/utils';
import { optionsFrom, concepteLiniaValues, CONCEPTE_LINIA_LABELS } from '@/lib/validation/enums';

interface FacturaLite {
  id: string;
  numero: string;
  total: string | number;
  estat: 'PENDENT' | 'COBRADA';
}
type Linia = { concepte: string; descripcio: string; import: string };

export function FacturaPanel({
  estanciaId,
  factures,
  preuSuggerit,
  nitsSuggerides,
}: {
  estanciaId: string;
  factures: FacturaLite[];
  preuSuggerit?: number;
  nitsSuggerides?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [linies, setLinies] = useState<Linia[]>([
    {
      concepte: 'ALLOTJAMENT',
      descripcio: nitsSuggerides ? `Allotjament (${nitsSuggerides} nits)` : 'Allotjament',
      import: preuSuggerit ? String(preuSuggerit) : '',
    },
  ]);
  const [ivaPercent, setIvaPercent] = useState('10');
  const [aplicarTasa, setAplicarTasa] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLinia = (i: number, patch: Partial<Linia>) =>
    setLinies((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJSON('/api/factures', {
        estanciaId,
        ivaPercent: Number(ivaPercent),
        aplicarTasa,
        linies: linies.map((l) => ({
          concepte: l.concepte,
          descripcio: l.descripcio,
          import: Number(l.import || 0),
        })),
      });
      setOpen(false);
      setLinies([{ concepte: 'ALLOTJAMENT', descripcio: 'Allotjament', import: '' }]);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error creant la factura');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {factures.length === 0 && !open && (
        <p className="text-sm text-slate-400">Sense factures.</p>
      )}
      {factures.map((f) => (
        <div key={f.id} className="rounded-lg border border-slate-200 text-sm">
          <Link
            href={`/factures/${f.id}`}
            className="flex items-center justify-between px-3 py-2 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 font-medium text-slate-800">
              <Receipt className="h-4 w-4 text-slate-400" /> {f.numero}
            </span>
            <span className="flex items-center gap-2">
              {formatEur(Number(f.total))}
              <Badge tone={f.estat === 'COBRADA' ? 'success' : 'warning'}>
                {f.estat === 'COBRADA' ? 'Cobrada' : 'Pendent'}
              </Badge>
            </span>
          </Link>
          <div className="flex gap-2 border-t border-slate-100 px-3 py-1.5">
            <a
              href={`/imprimir/factura-simple/${f.id}?custodia=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline"
            >
              Factura simple (client)
            </a>
            <span className="text-slate-300">·</span>
            <a
              href={`/imprimir/factura-simple/${f.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:underline"
            >
              Sense custòdia
            </a>
          </div>
        </div>
      ))}

      {open ? (
        <form onSubmit={crear} className="space-y-3 rounded-lg border border-slate-200 p-3">
          {linies.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Select
                className="col-span-3 h-9"
                value={l.concepte}
                onChange={(e) => setLinia(i, { concepte: e.target.value })}
              >
                {optionsFrom(concepteLiniaValues, CONCEPTE_LINIA_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Input
                className="col-span-5 h-9"
                placeholder="Descripció"
                value={l.descripcio}
                onChange={(e) => setLinia(i, { descripcio: e.target.value })}
              />
              <Input
                className="col-span-3 h-9"
                type="number"
                step="0.01"
                placeholder="Import €"
                value={l.import}
                onChange={(e) => setLinia(i, { import: e.target.value })}
              />
              <button
                type="button"
                className="col-span-1 text-slate-400 hover:text-red-600"
                onClick={() => setLinies((p) => p.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setLinies((p) => [...p, { concepte: 'EXTRA', descripcio: '', import: '' }])}
          >
            <Plus className="h-4 w-4" /> Línia
          </Button>

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
            <label className="flex items-center gap-2 text-sm">
              IVA %
              <Input
                className="h-9 w-20"
                type="number"
                value={ivaPercent}
                onChange={(e) => setIvaPercent(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={aplicarTasa}
                onChange={(e) => setAplicarTasa(e.target.checked)}
              />
              Aplicar tassa turística (IEET)
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Creant…' : 'Crear factura'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel·lar
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova factura
        </Button>
      )}
    </div>
  );
}
