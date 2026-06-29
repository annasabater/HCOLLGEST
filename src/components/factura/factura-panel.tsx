'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Receipt, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { postJSON, ApiError } from '@/lib/api';
import { formatEur } from '@/lib/utils';
import { optionsFrom, concepteLiniaValues, CONCEPTE_LINIA_LABELS } from '@/lib/validation/enums';

function tipusHabitacio(nom: string | null | undefined): string {
  if (!nom) return 'Habitació';
  const num = parseInt(nom.replace(/\D/g, ''), 10);
  if (!isNaN(num) && num >= 1 && num <= 4) return 'Habitació doble';
  if (!isNaN(num) && num >= 5 && num <= 6) return 'Habitació individual';
  return nom;
}
function fmtDateShort(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface FacturaLite {
  id: string;
  numero: string;
  total: string | number;
  estat: 'PENDENT' | 'COBRADA';
  tipusDocument?: string;
}
type Linia = { concepte: string; descripcio: string; import: string };

const TIPUS_LABEL: Record<string, string> = {
  RECIBO: 'Rebut',
  FACTURA_SIMPLIFICADA: 'Factura simplificada',
  FACTURA: 'Factura fiscal',
};

export function FacturaPanel({
  estanciaId,
  factures,
  preuSuggerit,
  nitsSuggerides,
  habitacioNom,
  numViatgers,
  dataEntrada,
  dataSortida,
  numContracte: _numContracte,
  pagaments,
  fiances,
}: {
  estanciaId: string;
  factures: FacturaLite[];
  preuSuggerit?: number;
  nitsSuggerides?: number;
  habitacioNom?: string | null;
  numViatgers?: number | null;
  dataEntrada?: string | null;
  dataSortida?: string | null;
  numContracte?: string | null;
  pagaments?: { import: number; facturaId: string | null }[];
  fiances?: { import: number; estat: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipusDocument, setTipusDocument] = useState('FACTURA_SIMPLIFICADA');

  // Import suggerit: suma de pagaments a compte + fiances en custòdia (si n'hi ha),
  // o bé el preu suggerit per les nits, o buit.
  function calcImportSuggerit(): string {
    const totalPagaments = (pagaments ?? [])
      .filter((p) => !p.facturaId)
      .reduce((a, p) => a + p.import, 0);
    const totalFiances = (fiances ?? [])
      .filter((f) => f.estat === 'EN_CUSTODIA')
      .reduce((a, f) => a + f.import, 0);
    const total = totalPagaments + totalFiances;
    if (total > 0) return String(total);
    if (preuSuggerit) return String(preuSuggerit);
    return '';
  }

  function buildDesc(): string {
    const habLabel = tipusHabitacio(habitacioNom);
    const personesLabel = numViatgers ? ` (${numViatgers} ${numViatgers === 1 ? 'persona' : 'persones'})` : '';
    const datesLabel = dataEntrada && dataSortida
      ? ` · Del ${fmtDateShort(dataEntrada)} al ${fmtDateShort(dataSortida)}`
      : '';
    return habitacioNom
      ? `${habLabel}${personesLabel}${datesLabel}`
      : (nitsSuggerides ? `Habitació (${nitsSuggerides} nits)` : 'Habitació');
  }

  const [linies, setLinies] = useState<Linia[]>(() => [
    { concepte: 'ALLOTJAMENT', descripcio: buildDesc(), import: calcImportSuggerit() },
  ]);
  // IVA fix (10% allotjament) i tassa turística NO a part (ja inclosa al preu).
  // No es mostren al formulari; es passen a l'API amb aquests valors per defecte.
  const [ivaPercent] = useState('10');
  const [aplicarTasa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLinia = (i: number, patch: Partial<Linia>) =>
    setLinies((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  function obrir() {
    // Re-calcula l'import cada vegada que s'obre (pagaments poden haver canviat)
    setLinies([{ concepte: 'ALLOTJAMENT', descripcio: buildDesc(), import: calcImportSuggerit() }]);
    setOpen(true);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJSON('/api/factures', {
        estanciaId,
        tipusDocument,
        ivaPercent: Number(ivaPercent),
        aplicarTasa,
        linies: linies.map((l) => ({
          concepte: l.concepte,
          descripcio: l.descripcio,
          import: Number(l.import || 0),
        })),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error creant la factura');
    } finally {
      setSaving(false);
    }
  }

  function printUrl(f: FacturaLite, ambCustodia = false): string {
    if (f.tipusDocument === 'FACTURA') return `/imprimir/factura/${f.id}`;
    return `/imprimir/factura-simple/${f.id}${ambCustodia ? '?custodia=true' : ''}`;
  }

  return (
    <div className="space-y-3">
      {factures.length === 0 && !open && (
        <p className="text-sm text-slate-400 italic">Sense factures.</p>
      )}
      {factures.map((f) => (
        <div key={f.id} className="rounded-lg border border-slate-200 text-sm">
          <Link
            href={`/factures/${f.id}`}
            className="flex items-center justify-between px-3 py-2 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 font-medium text-slate-800">
              <Receipt className="h-4 w-4 text-slate-400" /> {f.numero}
              {f.tipusDocument && (
                <span className="text-xs font-normal text-slate-400">
                  {TIPUS_LABEL[f.tipusDocument] ?? f.tipusDocument}
                </span>
              )}
            </span>
            <span className="flex items-center gap-2">
              {formatEur(Number(f.total))}
              <Badge tone={f.estat === 'COBRADA' ? 'success' : 'warning'}>
                {f.estat === 'COBRADA' ? 'Cobrada' : 'Pendent'}
              </Badge>
            </span>
          </Link>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-1.5">
            <a
              href={printUrl(f, true)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
            >
              <FileText className="h-3 w-3" /> Imprimir (amb fiança)
            </a>
            <span className="text-slate-300">·</span>
            <a
              href={printUrl(f, false)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:underline"
            >
              Sense fiança
            </a>
          </div>
        </div>
      ))}

      {open ? (
        <form onSubmit={crear} className="space-y-3 rounded-lg border border-slate-200 p-3">
          {/* Tipus de document */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Tipus:</span>
            {(['FACTURA_SIMPLIFICADA', 'FACTURA'] as const).map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="tipusDocument"
                  value={t}
                  checked={tipusDocument === t}
                  onChange={() => setTipusDocument(t)}
                />
                {TIPUS_LABEL[t]}
              </label>
            ))}
          </div>

          {/* Línies */}
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
        <Button size="sm" variant="outline" onClick={obrir}>
          <Plus className="h-4 w-4" /> Nova factura
        </Button>
      )}
    </div>
  );
}
