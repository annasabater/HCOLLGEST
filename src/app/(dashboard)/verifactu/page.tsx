'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ShieldCheck, ShieldAlert, QrCode } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { getJSON, postJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import { optionsFrom, concepteLiniaValues, CONCEPTE_LINIA_LABELS } from '@/lib/validation/enums';

interface EstanciaLite {
  id: string;
  numContracte: string;
  anyContracte: number;
  viatgers: { huesped: { nom: string; cognom1: string; numDocument: string | null } }[];
}
interface ChainItem {
  id: string;
  facturaId: string;
  numSerieFactura: string;
  tipusFactura: string;
  dataExpedicio: string;
  importTotal: number;
  huella: string;
  estat: string;
  csv: string | null;
  qrUrl: string;
  cadenaOk: boolean;
  huellaOk: boolean;
}
type Linia = { concepte: string; descripcio: string; import: string };

const DOC_OPTIONS = [
  { value: 'RECIBO', label: 'Recibo (sense Veri*Factu)' },
  { value: 'FACTURA', label: 'Factura completa (F1)' },
  { value: 'FACTURA_SIMPLIFICADA', label: 'Factura simplificada (F2)' },
];

export default function VerifactuPage() {
  const [estancies, setEstancies] = useState<EstanciaLite[]>([]);
  const [chain, setChain] = useState<ChainItem[]>([]);
  const [integre, setIntegre] = useState(true);

  const [estanciaId, setEstanciaId] = useState('');
  const [tipusDocument, setTipusDocument] = useState('FACTURA');
  const [descripcioOperacio, setDescripcio] = useState('Allotjament i serveis');
  const [nifDestinatari, setNif] = useState('');
  const [nomDestinatari, setNom] = useState('');
  const [ivaPercent, setIva] = useState('10');
  const [aplicarTasa, setAplicarTasa] = useState(true);
  const [linies, setLinies] = useState<Linia[]>([
    { concepte: 'ALLOTJAMENT', descripcio: 'Allotjament', import: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadChain = useCallback(async () => {
    const res = await getJSON<{ items: ChainItem[]; integre: boolean }>('/api/verifactu');
    setChain(res.items);
    setIntegre(res.integre);
  }, []);

  useEffect(() => {
    getJSON<{ estancies: EstanciaLite[] }>('/api/estancies').then((r) => setEstancies(r.estancies));
    loadChain();
  }, [loadChain]);

  function onEstancia(id: string) {
    setEstanciaId(id);
    const est = estancies.find((e) => e.id === id);
    const titular = est?.viatgers[0]?.huesped;
    if (titular) {
      setNom(`${titular.nom} ${titular.cognom1}`);
      if (titular.numDocument) setNif(titular.numDocument);
    }
  }

  const setLinia = (i: number, patch: Partial<Linia>) =>
    setLinies((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const [enviantId, setEnviantId] = useState<string | null>(null);

  async function enviarAeat(id: string) {
    setEnviantId(id);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/verifactu/${id}/enviar`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'No s’ha pogut enviar a l’AEAT');
      } else {
        setInfo(
          data.estat === 'ACCEPTAT'
            ? `Registre acceptat per l’AEAT${data.csv ? ` (CSV ${data.csv})` : ''}.`
            : `Resposta de l’AEAT: ${data.estat}${data.error ? ` — ${data.error}` : ''}`,
        );
      }
      loadChain();
    } catch {
      setError('Error de connexió amb l’AEAT');
    } finally {
      setEnviantId(null);
    }
  }

  async function emetre(e: React.FormEvent) {
    e.preventDefault();
    if (!estanciaId) {
      setError('Selecciona una estada');
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      await postJSON('/api/factures', {
        estanciaId,
        tipusDocument,
        descripcioOperacio,
        nifDestinatari: nifDestinatari || undefined,
        nomDestinatari: nomDestinatari || undefined,
        ivaPercent: Number(ivaPercent),
        aplicarTasa,
        linies: linies.map((l) => ({
          concepte: l.concepte,
          descripcio: l.descripcio,
          import: Number(l.import || 0),
        })),
      });
      setInfo(
        tipusDocument === 'RECIBO'
          ? 'Recibo creat.'
          : 'Factura creada i registre Veri*Factu generat (huella encadenada + QR).',
      );
      setLinies([{ concepte: 'ALLOTJAMENT', descripcio: 'Allotjament', import: '' }]);
      loadChain();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error emetent el document');
    } finally {
      setSaving(false);
    }
  }

  const esF1 = tipusDocument === 'FACTURA';
  const esFiscal = tipusDocument !== 'RECIBO';

  return (
    <div>
      <PageHeader
        title="Veri*Factu"
        subtitle="Emissió de documents de cobrament amb el format de l’AEAT (obligatori 2027)"
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          Cada <strong>factura</strong> genera un registre d’alta amb <strong>huella SHA-256
          encadenada</strong> i <strong>QR de cotejo</strong>. Els <strong>recibos</strong> no són
          factura fiscal i no entren a Veri*Factu. Configura sèrie, mode de proves i dades del
          software a <Link href="/config" className="underline">Configuració</Link>.
        </div>
      </div>

      {/* Formulario de emisión (pestaña/formulari apart) */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Emetre document</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={emetre} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Estada" required>
                <Select value={estanciaId} onChange={(e) => onEstancia(e.target.value)}>
                  <option value="">— Selecciona —</option>
                  {estancies.map((e) => {
                    const t = e.viatgers[0]?.huesped;
                    return (
                      <option key={e.id} value={e.id}>
                        {e.numContracte}/{e.anyContracte}
                        {t ? ` · ${t.nom} ${t.cognom1}` : ''}
                      </option>
                    );
                  })}
                </Select>
              </Field>
              <Field label="Tipus de document" required>
                <Select value={tipusDocument} onChange={(e) => setTipusDocument(e.target.value)}>
                  {DOC_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="IVA %">
                <Input type="number" value={ivaPercent} onChange={(e) => setIva(e.target.value)} />
              </Field>
            </div>

            {esFiscal && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Descripció de l’operació" className="sm:col-span-3">
                  <Input value={descripcioOperacio} onChange={(e) => setDescripcio(e.target.value)} />
                </Field>
                <Field label="NIF destinatari" required={esF1} hint={esF1 ? 'Obligatori per a F1' : 'Opcional en F2'}>
                  <Input value={nifDestinatari} onChange={(e) => setNif(e.target.value)} />
                </Field>
                <Field label="Nom destinatari">
                  <Input value={nomDestinatari} onChange={(e) => setNom(e.target.value)} />
                </Field>
              </div>
            )}

            {/* Líneas */}
            <div className="space-y-2">
              {linies.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Select className="col-span-3 h-9" value={l.concepte} onChange={(e) => setLinia(i, { concepte: e.target.value })}>
                    {optionsFrom(concepteLiniaValues, CONCEPTE_LINIA_LABELS).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <Input className="col-span-5 h-9" placeholder="Descripció" value={l.descripcio} onChange={(e) => setLinia(i, { descripcio: e.target.value })} />
                  <Input className="col-span-3 h-9" type="number" step="0.01" placeholder="Import €" value={l.import} onChange={(e) => setLinia(i, { import: e.target.value })} />
                  <button type="button" className="col-span-1 text-slate-400 hover:text-red-600" onClick={() => setLinies((p) => p.filter((_, idx) => idx !== i))}>
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button type="button" size="sm" variant="ghost" onClick={() => setLinies((p) => [...p, { concepte: 'EXTRA', descripcio: '', import: '' }])}>
                  <Plus className="h-4 w-4" /> Línia
                </Button>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={aplicarTasa} onChange={(e) => setAplicarTasa(e.target.checked)} />
                  Aplicar tassa turística (IEET, no subjecta a IVA)
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Emetent…' : esFiscal ? 'Emetre factura (Veri*Factu)' : 'Emetre recibo'}
              </Button>
              {error && <span className="text-sm text-red-600">{error}</span>}
              {info && <span className="text-sm text-green-600">{info}</span>}
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Cadena de registros */}
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Cadena de registres</h2>
        {chain.length > 0 &&
          (integre ? (
            <Badge tone="success">
              <ShieldCheck className="mr-1 h-3 w-3" /> Cadena íntegra
            </Badge>
          ) : (
            <Badge tone="danger">
              <ShieldAlert className="mr-1 h-3 w-3" /> Integritat compromesa
            </Badge>
          ))}
      </div>

      {chain.length === 0 ? (
        <EmptyState>Encara no s’ha emès cap factura Veri*Factu.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Núm. sèrie</Th>
              <Th>Tipus</Th>
              <Th>Data</Th>
              <Th className="text-right">Total</Th>
              <Th>Huella</Th>
              <Th>Integritat</Th>
              <Th>AEAT</Th>
              <Th>QR</Th>
            </tr>
          </Thead>
          <tbody>
            {chain.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <Link href={`/factures/${c.facturaId}`} className="font-medium text-brand-700">
                    {c.numSerieFactura}
                  </Link>
                </Td>
                <Td>{c.tipusFactura}</Td>
                <Td>{formatDate(c.dataExpedicio)}</Td>
                <Td className="text-right">{formatEur(c.importTotal)}</Td>
                <Td>
                  <code className="text-xs text-slate-500" title={c.huella}>
                    {c.huella.slice(0, 12)}…
                  </code>
                </Td>
                <Td>
                  {c.cadenaOk && c.huellaOk ? (
                    <Badge tone="success">OK</Badge>
                  ) : (
                    <Badge tone="danger">Error</Badge>
                  )}
                </Td>
                <Td>
                  {c.estat === 'ACCEPTAT' ? (
                    <Badge tone="success" title={c.csv ?? undefined}>
                      Acceptat{c.csv ? ' ✓' : ''}
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge tone={c.estat === 'ERROR' ? 'danger' : 'neutral'}>{c.estat}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={enviantId === c.id}
                        onClick={() => enviarAeat(c.id)}
                      >
                        {enviantId === c.id ? 'Enviant…' : 'Enviar AEAT'}
                      </Button>
                    </div>
                  )}
                </Td>
                <Td>
                  <a href={c.qrUrl} target="_blank" rel="noreferrer" className="text-brand-600" title="URL de cotejo AEAT">
                    <QrCode className="h-4 w-4" />
                  </a>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
