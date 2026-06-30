'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getJSON, postJSON, ApiError } from '@/lib/api';
import { Receipt, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatEur, formatDate } from '@/lib/utils';
import { METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';

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
interface PagamentLite {
  id: string;
  import: number;
  descripcio: string | null;
  metode: keyof typeof METODE_COBRAMENT_LABELS;
  data: string;
  facturaId: string | null;
}
interface FiancaLite {
  id: string;
  import: number;
  notes: string | null;
  metode: keyof typeof METODE_COBRAMENT_LABELS;
  data: string;
  estat: string;
  facturaId: string | null;
}

const TIPUS_LABEL: Record<string, string> = {
  RECIBO: 'Rebut',
  FACTURA_SIMPLIFICADA: 'Factura simplificada',
  FACTURA: 'Factura fiscal',
};

export function FacturaPanel({
  estanciaId,
  factures,
  habitacioNom,
  numViatgers,
  dataEntrada,
  dataSortida,
  pagaments = [],
  fiances = [],
}: {
  estanciaId: string;
  factures: FacturaLite[];
  habitacioNom?: string | null;
  numViatgers?: number | null;
  dataEntrada?: string | null;
  dataSortida?: string | null;
  pagaments?: PagamentLite[];
  fiances?: FiancaLite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // La factura es crea com a simplificada per defecte; el tipus/format (simple o
  // fiscal) es tria després des del detall de la factura en imprimir.
  const tipus = 'FACTURA_SIMPLIFICADA' as const;
  const [numero, setNumero] = useState('');
  const [selPag, setSelPag] = useState<Set<string>>(new Set());
  const [selFi, setSelFi] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pendents de facturar: pagaments sense factura i fiances en custòdia sense factura.
  const pagamentsLliures = pagaments.filter((p) => !p.facturaId);
  const fiancesLliures = fiances.filter((f) => f.estat === 'EN_CUSTODIA' && !f.facturaId);

  const totalPag = pagamentsLliures.filter((p) => selPag.has(p.id)).reduce((a, p) => a + p.import, 0);
  const totalFi = fiancesLliures.filter((f) => selFi.has(f.id)).reduce((a, f) => a + f.import, 0);

  function buildDesc(): string {
    const habLabel = tipusHabitacio(habitacioNom);
    const personesLabel = numViatgers ? ` (${numViatgers} ${numViatgers === 1 ? 'persona' : 'persones'})` : '';
    const datesLabel =
      dataEntrada && dataSortida ? ` · Del ${fmtDateShort(dataEntrada)} al ${fmtDateShort(dataSortida)}` : '';
    return habitacioNom ? `${habLabel}${personesLabel}${datesLabel}` : 'Allotjament';
  }

  const togglePag = (id: string) =>
    setSelPag((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleFi = (id: string) =>
    setSelFi((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function obrir() {
    setError(null);
    // Preselecciona tots els pendents (el cas habitual: facturar-ho tot).
    setSelPag(new Set(pagamentsLliures.map((p) => p.id)));
    setSelFi(new Set(fiancesLliures.map((f) => f.id)));
    try {
      const res = await getJSON<{ numero: string }>('/api/factures/seguent-numero');
      setNumero(res.numero);
    } catch {
      setNumero('');
    }
    setOpen(true);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (selPag.size === 0 && selFi.size === 0) {
      setError('Selecciona almenys un pagament o una fiança.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/estancies/${estanciaId}/factura-seleccio`, {
        pagamentIds: [...selPag],
        fiancaIds: [...selFi],
        tipusDocument: tipus,
        numero: numero.trim() || undefined,
        descripcioAllotjament: buildDesc(),
      });
      setOpen(false);
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
        </div>
      ))}

      {open ? (
        <form onSubmit={crear} className="space-y-3 rounded-lg border border-slate-200 p-3">
          {/* Número */}
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs font-medium text-slate-500">Núm. factura:</span>
            <Input className="h-9 w-40" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </label>

          {/* Pagaments (ingrés) */}
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">Pagaments (ingrés)</p>
            {pagamentsLliures.length === 0 ? (
              <p className="text-xs italic text-slate-400">Cap pagament pendent de facturar.</p>
            ) : (
              <div className="space-y-1">
                {pagamentsLliures.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  >
                    <input type="checkbox" checked={selPag.has(p.id)} onChange={() => togglePag(p.id)} />
                    <span className="font-medium text-slate-800">{formatEur(p.import)}</span>
                    <span className="text-slate-400">
                      {p.descripcio ? `· ${p.descripcio} ` : ''}· {METODE_COBRAMENT_LABELS[p.metode]} · {formatDate(p.data)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Fiança (a part) */}
          {fiancesLliures.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Fiança (a part — surt al document «amb fiança»)
              </p>
              <div className="space-y-1">
                {fiancesLliures.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-1.5 text-sm"
                  >
                    <input type="checkbox" checked={selFi.has(f.id)} onChange={() => toggleFi(f.id)} />
                    <span className="font-medium text-slate-800">{formatEur(f.import)}</span>
                    <span className="text-slate-400">
                      · {f.notes ?? 'Fiança'} · {METODE_COBRAMENT_LABELS[f.metode]} · {formatDate(f.data)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Resum */}
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Factura: <strong>{formatEur(totalPag)}</strong>
            {totalFi > 0 && (
              <span className="text-slate-500"> · amb fiança: <strong>{formatEur(totalPag + totalFi)}</strong></span>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving || (selPag.size === 0 && selFi.size === 0)}>
              {saving ? 'Creant…' : 'Crear factura'}
            </Button>
            <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => setOpen(false)}>
              Cancel·lar
            </button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={obrir}>
          <Receipt className="h-4 w-4" /> Nova factura
        </Button>
      )}
    </div>
  );
}
