'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getJSON, postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { Receipt, ShieldCheck, ShieldOff, Pencil, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
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
  habitacioOpcions,
}: {
  estanciaId: string;
  factures: FacturaLite[];
  habitacioNom?: string | null;
  numViatgers?: number | null;
  dataEntrada?: string | null;
  dataSortida?: string | null;
  pagaments?: PagamentLite[];
  fiances?: FiancaLite[];
  /** Habitacions facturables de l'estada (real + separades) amb el nre. de persones. */
  habitacioOpcions?: { nom: string | null; persones: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Es tria en obrir: "Factura simple" (fiança a part) o "Factura fiscal" (fiança
  // sempre inclosa al total, sèrie NN/YY).
  const [tipus, setTipus] = useState<'FACTURA_SIMPLIFICADA' | 'FACTURA'>('FACTURA_SIMPLIFICADA');
  const esFiscal = tipus === 'FACTURA';
  const [numero, setNumero] = useState('');
  const [selPag, setSelPag] = useState<Set<string>>(new Set());
  const [selFi, setSelFi] = useState<Set<string>>(new Set());
  // Simple: si la fiança seleccionada compta al total (fiscal sempre la inclou).
  const [ambFianca, setAmbFianca] = useState(true);
  // Mode "simple + fiscal alhora" (crea les dues amb el mateix import).
  const [dupla, setDupla] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edició inline d'una factura (número + línies) sense sortir de l'estada.
  const [editId, setEditId] = useState<string | null>(null);
  const [editNumero, setEditNumero] = useState('');
  const [editLinies, setEditLinies] = useState<{ concepte: string; descripcio: string; import: string }[]>([]);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Factura rectificativa (reducció): quan s'han retornat diners.
  const [rectOpen, setRectOpen] = useState(false);
  const [rectFacturaId, setRectFacturaId] = useState('');
  const [rectImport, setRectImport] = useState('');
  const [rectMotiu, setRectMotiu] = useState('reducción de estancia');
  const [rectBusy, setRectBusy] = useState(false);
  const [rectError, setRectError] = useState<string | null>(null);

  // Devolucions detectades (cobraments negatius): habiliten la rectificativa.
  const devolucions = pagaments.filter((p) => p.import < 0);
  const totalDevolucions = Math.abs(devolucions.reduce((a, p) => a + p.import, 0));
  const facturesSimples = factures.filter((f) => f.tipusDocument !== 'FACTURA');
  const potRectificar = factures.length > 0 && devolucions.length > 0;

  function obrirRectificativa() {
    setRectError(null);
    // Original per defecte: la darrera factura simplificada (o qualsevol).
    const orig = facturesSimples[0] ?? factures[0];
    setRectFacturaId(orig?.id ?? '');
    setRectImport(totalDevolucions ? totalDevolucions.toFixed(2) : '');
    setRectMotiu('reducción de estancia');
    setRectOpen(true);
  }

  async function crearRectificativa(e: React.FormEvent) {
    e.preventDefault();
    const imp = Number(rectImport.replace(',', '.'));
    if (!rectFacturaId) { setRectError('Tria la factura que es rectifica.'); return; }
    if (!imp || imp <= 0) { setRectError("Indica l'import de la reducció (positiu)."); return; }
    setRectBusy(true);
    setRectError(null);
    try {
      const res = await postJSON<{ factura: { id: string } }>(
        `/api/estancies/${estanciaId}/factura-rectificativa`,
        { facturaOriginalId: rectFacturaId, import: imp, motiu: rectMotiu.trim() || undefined },
      );
      setRectOpen(false);
      if (res?.factura?.id) {
        window.open(`/imprimir/factura-simple/${res.factura.id}`, '_blank', 'noopener,noreferrer');
      }
      router.refresh();
    } catch (err) {
      setRectError(err instanceof ApiError ? err.message : 'Error creant la rectificativa');
    } finally {
      setRectBusy(false);
    }
  }

  // Pendents de facturar: pagaments sense factura i fiances en custòdia sense factura.
  const pagamentsLliures = pagaments.filter((p) => !p.facturaId);
  const fiancesLliures = fiances.filter((f) => f.estat === 'EN_CUSTODIA' && !f.facturaId);

  const totalPag = pagamentsLliures.filter((p) => selPag.has(p.id)).reduce((a, p) => a + p.import, 0);
  const totalFi = fiancesLliures.filter((f) => selFi.has(f.id)).reduce((a, f) => a + f.import, 0);
  // La fiança compta al total si és fiscal, dupla, o si a la simple s'ha triat "amb fiança".
  const incloureFianca = esFiscal || dupla || ambFianca;
  const totalFactura = incloureFianca ? totalPag + totalFi : totalPag;

  // Habitació que sortirà a la factura: la real o una de "separada" (per a viatgers
  // que als papers consten en una altra habitació).
  const opcionsHab: { nom: string | null; persones: number }[] =
    habitacioOpcions && habitacioOpcions.length > 0
      ? habitacioOpcions
      : [{ nom: habitacioNom ?? null, persones: numViatgers ?? 0 }];
  const [habIdx, setHabIdx] = useState(0);
  const habSel = opcionsHab[Math.min(habIdx, opcionsHab.length - 1)]!;

  function buildDesc(): string {
    const nomHab = habSel.nom ?? habitacioNom ?? null;
    const habLabel = tipusHabitacio(nomHab);
    const n = habSel.persones || numViatgers || 0;
    const personesLabel = n ? ` (${n} ${n === 1 ? 'persona' : 'persones'})` : '';
    const datesLabel =
      dataEntrada && dataSortida ? ` · Del ${fmtDateShort(dataEntrada)} al ${fmtDateShort(dataSortida)}` : '';
    return nomHab ? `${habLabel}${personesLabel}${datesLabel}` : 'Allotjament';
  }

  const togglePag = (id: string) =>
    setSelPag((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleFi = (id: string) =>
    setSelFi((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function obrir(mode: 'simple' | 'fiscal' | 'dupla') {
    const t = mode === 'fiscal' ? 'FACTURA' : 'FACTURA_SIMPLIFICADA';
    setTipus(t);
    setDupla(mode === 'dupla');
    setError(null);
    setAmbFianca(true);
    // Preselecciona tots els pendents (el cas habitual: facturar-ho tot).
    setSelPag(new Set(pagamentsLliures.map((p) => p.id)));
    setSelFi(new Set(fiancesLliures.map((f) => f.id)));
    if (mode === 'dupla') {
      setNumero(''); // números automàtics (fiscal NN/YY + contracte)
    } else {
      try {
        const res = await getJSON<{ numero: string }>(
          `/api/factures/seguent-numero?estanciaId=${estanciaId}&tipus=${t}`,
        );
        setNumero(res.numero);
      } catch {
        setNumero('');
      }
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
      if (dupla) {
        const res = await postJSON<{ fiscal: { id: string } }>(
          `/api/estancies/${estanciaId}/factura-dupla`,
          {
            pagamentIds: [...selPag],
            fiancaIds: [...selFi],
            descripcioAllotjament: buildDesc(),
          },
        );
        setOpen(false);
        if (res?.fiscal?.id) {
          window.open(`/imprimir/factura/${res.fiscal.id}`, '_blank', 'noopener,noreferrer');
        }
        router.refresh();
        return;
      }
      const res = await postJSON<{ factura: { id: string } }>(
        `/api/estancies/${estanciaId}/factura-seleccio`,
        {
          pagamentIds: [...selPag],
          fiancaIds: [...selFi],
          tipusDocument: tipus,
          ambFianca: incloureFianca,
          numero: numero.trim() || undefined,
          descripcioAllotjament: buildDesc(),
        },
      );
      setOpen(false);
      // En crear, obre directament la impressió (fiscal o simple), sense passar
      // per la pàgina de detall.
      if (res?.factura?.id) {
        const url = esFiscal
          ? `/imprimir/factura/${res.factura.id}`
          : `/imprimir/factura-simple/${res.factura.id}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error creant la factura');
    } finally {
      setSaving(false);
    }
  }

  function printUrl(f: FacturaLite): string {
    return f.tipusDocument === 'FACTURA'
      ? `/imprimir/factura/${f.id}`
      : `/imprimir/factura-simple/${f.id}`;
  }

  async function eliminarFactura(id: string, num: string) {
    if (!window.confirm(`Eliminar la factura ${num}?`)) return;
    try {
      await delJSON(`/api/factures/${id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No s'ha pogut eliminar la factura");
    }
  }

  async function toggleEstat(id: string, actual: 'PENDENT' | 'COBRADA') {
    const nou = actual === 'COBRADA' ? 'PENDENT' : 'COBRADA';
    try {
      await patchJSON(`/api/factures/${id}`, { estat: nou });
      router.refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No s'ha pogut canviar l'estat");
    }
  }

  async function obrirEdicio(f: FacturaLite) {
    try {
      const r = await getJSON<{
        factura: { numero: string; linies: { concepte: string; descripcio: string | null; import: number | string }[] };
      }>(`/api/factures/${f.id}`);
      setEditNumero(r.factura.numero);
      setEditLinies(
        r.factura.linies.map((l) => ({ concepte: l.concepte, descripcio: l.descripcio ?? '', import: String(Number(l.import)) })),
      );
      setEditError(null);
      setEditId(f.id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No s'ha pogut carregar la factura");
    }
  }

  async function desarEdicio() {
    if (!editId) return;
    const linies = editLinies
      .filter((l) => l.descripcio.trim() || Number(l.import))
      .map((l) => ({ concepte: l.concepte, descripcio: l.descripcio.trim() || 'Concepte', import: Number(l.import) || 0 }));
    if (linies.length === 0) {
      setEditError('Cal almenys una línia.');
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      await patchJSON(`/api/factures/${editId}`, { numero: editNumero.trim() || undefined, linies });
      setEditId(null);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Error desant la factura');
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {factures.length === 0 && !open && (
        <p className="text-sm text-slate-400 italic">Sense factures.</p>
      )}
      {factures.map((f) => (
        <div key={f.id} className="rounded-lg border border-slate-200">
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <a
              href={printUrl(f)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 font-medium text-slate-800 hover:underline"
              title="Obrir / imprimir"
            >
              <Receipt className="h-4 w-4 shrink-0 text-slate-400" /> {f.numero}
              {f.tipusDocument && (
                <span className="truncate text-xs font-normal text-slate-400">
                  {TIPUS_LABEL[f.tipusDocument] ?? f.tipusDocument}
                </span>
              )}
            </a>
            <div className="flex items-center gap-2">
              {formatEur(Number(f.total))}
              <button
                type="button"
                onClick={() => toggleEstat(f.id, f.estat)}
                title="Canviar entre Cobrada i Pendent"
                className="cursor-pointer"
              >
                <Badge tone={f.estat === 'COBRADA' ? 'success' : 'warning'}>
                  {f.estat === 'COBRADA' ? 'Cobrada' : 'Pendent'}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => (editId === f.id ? setEditId(null) : obrirEdicio(f))}
                title="Editar la factura aquí"
                className="text-slate-400 hover:text-brand-600"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => eliminarFactura(f.id, f.numero)}
                title="Eliminar"
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Editor inline: número + línies, sense sortir de l'estada */}
          {editId === f.id && (
            <div className="space-y-2 border-t border-slate-100 px-3 py-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-xs font-medium text-slate-500">Núm. factura:</span>
                <Input className="h-9 w-44" value={editNumero} onChange={(e) => setEditNumero(e.target.value)} />
              </label>
              {editLinies.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="h-9 flex-1"
                    placeholder="Concepte"
                    value={l.descripcio}
                    onChange={(e) => setEditLinies((p) => p.map((x, xi) => (xi === i ? { ...x, descripcio: e.target.value } : x)))}
                  />
                  <Input
                    className="h-9 w-28 text-right"
                    type="number"
                    step="0.01"
                    placeholder="Import €"
                    value={l.import}
                    onChange={(e) => setEditLinies((p) => p.map((x, xi) => (xi === i ? { ...x, import: e.target.value } : x)))}
                  />
                  {editLinies.length > 1 && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-600"
                      title="Treure línia"
                      onClick={() => setEditLinies((p) => p.filter((_, xi) => xi !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditLinies((p) => [...p, { concepte: 'EXTRA', descripcio: '', import: '' }])}
                >
                  + Afegir línia
                </Button>
                <span className="ml-auto text-sm text-slate-600">
                  Total: <strong>{formatEur(editLinies.reduce((a, l) => a + (Number(l.import) || 0), 0))}</strong>
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditId(null)} disabled={editBusy}>
                  Cancel·lar
                </Button>
                <Button type="button" size="sm" onClick={desarEdicio} disabled={editBusy}>
                  {editBusy ? 'Desant…' : 'Desar'}
                </Button>
              </div>
              {editError && <p className="text-xs text-red-600">{editError}</p>}
            </div>
          )}
        </div>
      ))}

      {open ? (
        <form onSubmit={crear} className="space-y-3 rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-800">
            {dupla ? 'Nova factura simple + fiscal' : esFiscal ? 'Nova factura fiscal' : 'Nova factura simple'}
          </p>
          {dupla ? (
            <p className="text-xs text-slate-500">
              Es crearan dues factures amb el mateix import: una <strong>fiscal</strong> (sèrie NN/YY, va a
              Veri*Factu) i una <strong>simplificada</strong> (número de contracte). L&apos;ingrés només es
              compta un cop.
            </p>
          ) : (
            /* Número: contracte (26004…) per a la simple; sèrie NN/YY per a la fiscal */
            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs font-medium text-slate-500">Núm. factura:</span>
              <Input
                className="h-9 w-40"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </label>
          )}

          {/* Si hi ha viatgers amb habitació separada, tria quina habitació surt a la factura */}
          {opcionsHab.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs font-medium text-slate-500">Habitació de la factura:</span>
              <Select
                className="h-9 max-w-64"
                value={String(habIdx)}
                onChange={(e) => setHabIdx(Number(e.target.value))}
              >
                {opcionsHab.map((o, i) => (
                  <option key={i} value={i}>
                    Habitació {o.nom ?? '—'} · {o.persones} {o.persones === 1 ? 'persona' : 'persones'}
                    {i === 0 ? ' (real)' : ' (separada)'}
                  </option>
                ))}
              </Select>
            </label>
          )}

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
              {esFiscal || dupla ? (
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5" /> Fiança (inclosa al total)
                </p>
              ) : (
                <div className="mb-2">
                  <p className="mb-1.5 text-xs font-medium text-slate-500">Fiança inclosa a la factura:</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAmbFianca(true)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        ambFianca
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" /> Amb fiança
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmbFianca(false)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        !ambFianca
                          ? 'border-slate-400 bg-slate-100 text-slate-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <ShieldOff className="h-4 w-4" /> Sense fiança
                    </button>
                  </div>
                </div>
              )}
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
            {dupla ? 'Cada factura: ' : esFiscal ? 'Factura fiscal: ' : 'Factura: '}
            <strong>{formatEur(totalFactura)}</strong>
            {totalFi > 0 && incloureFianca && <span className="text-slate-500"> (fiança inclosa)</span>}
            {totalFi > 0 && !incloureFianca && (
              <span className="text-slate-500"> · amb fiança: <strong>{formatEur(totalPag + totalFi)}</strong></span>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving || (selPag.size === 0 && selFi.size === 0)}>
              {saving ? 'Creant…' : dupla ? 'Crear les dues' : 'Crear factura'}
            </Button>
            <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => setOpen(false)}>
              Cancel·lar
            </button>
          </div>
        </form>
      ) : rectOpen ? (
        <form onSubmit={crearRectificativa} className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/40 p-3">
          <p className="text-sm font-semibold text-slate-800">Factura rectificativa (reducció)</p>
          <p className="text-xs text-slate-500">
            S&apos;ha detectat una devolució de <strong>{formatEur(totalDevolucions)}</strong>. Es crearà una
            factura simplificada amb import <strong>negatiu</strong> que redueix la factura original (número{' '}
            <code>26001 → 26001.1</code>). No es torna a comptar cap ingrés (la devolució ja està registrada).
          </p>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs font-medium text-slate-500">Rectifica la factura:</span>
            <Select
              className="h-9 max-w-64"
              value={rectFacturaId}
              onChange={(e) => setRectFacturaId(e.target.value)}
            >
              {factures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.numero} · {TIPUS_LABEL[f.tipusDocument ?? ''] ?? 'Factura'} · {formatEur(Number(f.total))}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs font-medium text-slate-500">Import de la reducció (€):</span>
            <Input
              className="h-9 w-32 text-right"
              inputMode="decimal"
              value={rectImport}
              onChange={(e) => setRectImport(e.target.value)}
              placeholder="452,00"
            />
            <span className="text-xs text-slate-400">es desarà com a −{rectImport || '0'} €</span>
          </label>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs font-medium text-slate-500">Motiu:</span>
            <Input
              className="h-9 flex-1 min-w-48"
              value={rectMotiu}
              onChange={(e) => setRectMotiu(e.target.value)}
              placeholder="reducción de estancia"
            />
          </label>
          {rectError && <p className="text-sm text-red-600">{rectError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={rectBusy}>
              {rectBusy ? 'Creant…' : 'Crear rectificativa'}
            </Button>
            <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => setRectOpen(false)}>
              Cancel·lar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => obrir('simple')}>
            <Receipt className="h-4 w-4" /> Factura simple
          </Button>
          <Button variant="outline" size="sm" onClick={() => obrir('fiscal')}>
            <Receipt className="h-4 w-4" /> Factura fiscal
          </Button>
          <Button variant="outline" size="sm" onClick={() => obrir('dupla')}>
            <Receipt className="h-4 w-4" /> Simple + Fiscal
          </Button>
          {potRectificar && (
            <Button variant="outline" size="sm" onClick={obrirRectificativa} title="S'han retornat diners: crea una factura de reducció">
              <Undo2 className="h-4 w-4" /> Rectificativa (reducció)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
