'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Check, Undo2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import { toISODate } from '@/lib/dates';

interface Jornada {
  id: string;
  data: string;
  hores: number;
  preuHora: number;
  import: number;
  notes: string | null;
  pagada: boolean;
  dataPagament: string | null;
}

export function JornadesSection({
  treballadorId,
  preuHora,
  jornades,
}: {
  treballadorId: string;
  preuHora: number | null;
  jornades: Jornada[];
}) {
  const router = useRouter();
  const [data, setData] = useState(toISODate(new Date()));
  const [hores, setHores] = useState('');
  const [preu, setPreu] = useState('');
  const [importe, setImporte] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sense preu/hora → es cobra PER TASQUES: el pagament s'introdueix com un import.
  const perTasques = !preuHora || preuHora <= 0;

  // Filtre per mes (YYYY-MM). Per defecte, el mes en curs.
  const mesActual = toISODate(new Date()).slice(0, 7);
  const [mesSel, setMesSel] = useState(mesActual);
  const months = Array.from(new Set([mesActual, ...jornades.map((j) => j.data.slice(0, 7))]))
    .sort()
    .reverse();
  const filtered = mesSel === 'all' ? jornades : jornades.filter((j) => j.data.slice(0, 7) === mesSel);
  const totalSel = filtered.reduce((a, j) => a + j.import, 0);
  const horesSel = filtered.reduce((a, j) => a + j.hores, 0);
  const totalGeneral = jornades.reduce((a, j) => a + j.import, 0);
  const pendentSel = filtered.filter((j) => !j.pagada).reduce((a, j) => a + j.import, 0);
  const totPagat = filtered.length > 0 && filtered.every((j) => j.pagada);
  const dataPagat = filtered.find((j) => j.pagada && j.dataPagament)?.dataPagament ?? null;
  const mesLabel = (ym: string) =>
    new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(new Date(`${ym}-01T00:00:00`));

  const [paying, setPaying] = useState(false);
  async function marcarMes(pagada: boolean) {
    if (mesSel === 'all') return;
    setPaying(true);
    try {
      await patchJSON(`/api/treballadors/${treballadorId}/jornades`, { mes: mesSel, pagada });
      router.refresh();
    } catch {
      /* l'usuari pot tornar-ho a provar */
    } finally {
      setPaying(false);
    }
  }

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    // Per hores: hores × €/h. Per tasques: un import directe.
    if (perTasques ? !importe : !hores) return;
    setSaving(true);
    setError(null);
    try {
      const payload = perTasques
        ? { data, hores: 1, preuHora: Number(importe) }
        : { data, hores: Number(hores), preuHora: preu || undefined };
      await postJSON(`/api/treballadors/${treballadorId}/jornades`, payload);
      setHores('');
      setPreu('');
      setImporte('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  const [confirmEsborrar, setConfirmEsborrar] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  async function togglePagada(id: string, pagada: boolean) {
    setToggling(id);
    try {
      await patchJSON(`/api/jornades/${id}`, { pagada });
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  async function esborrar(id: string) {
    await delJSON(`/api/jornades/${id}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-600">Mes:</span>
          <select
            value={mesSel}
            onChange={(e) => setMesSel(e.target.value)}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm capitalize"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {mesLabel(m)}
              </option>
            ))}
            <option value="all">Tots</option>
          </select>
        </label>
        <span>
          Total mes: <strong>{formatEur(totalSel)}</strong>{' '}
          {!perTasques && <span className="text-slate-500">({horesSel} h)</span>}
        </span>
        {filtered.length > 0 &&
          mesSel !== 'all' &&
          (totPagat ? (
            <span className="flex items-center gap-2">
              <Badge tone="success">Pagat{dataPagat ? ` · ${formatDate(dataPagat)}` : ''}</Badge>
              <Button type="button" variant="ghost" size="sm" disabled={paying} onClick={() => marcarMes(false)}>
                <Undo2 className="h-4 w-4" /> Desfer
              </Button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Badge tone="warning">Pendent: {formatEur(pendentSel)}</Badge>
              <Button type="button" size="sm" disabled={paying} onClick={() => marcarMes(true)}>
                <Check className="h-4 w-4" /> {paying ? 'Desant…' : 'Marcar com a pagat'}
              </Button>
            </span>
          ))}
        <span className="text-slate-400">·</span>
        <span className="text-slate-600">Total acumulat: {formatEur(totalGeneral)}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>
          {jornades.length === 0 ? 'Encara no hi ha pagaments registrats.' : 'Cap pagament en aquest mes.'}
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Dia</Th>
              <Th>Concepte</Th>
              {!perTasques && <Th>Hores</Th>}
              {!perTasques && <Th>€/h</Th>}
              <Th className="text-right">Import</Th>
              <Th>Estat</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((j) => (
              <Tr key={j.id} className={j.pagada ? 'opacity-60' : ''}>
                <Td>{formatDate(j.data)}</Td>
                <Td className="text-xs text-slate-500">{j.notes ? j.notes.replace('[auto] ', '') : '—'}</Td>
                {!perTasques && <Td>{j.hores > 0 ? `${j.hores} h` : '—'}</Td>}
                {!perTasques && <Td>{j.preuHora > 0 ? formatEur(j.preuHora) : '—'}</Td>}
                <Td className="text-right font-medium">{formatEur(j.import)}</Td>
                <Td>
                  <button
                    type="button"
                    disabled={toggling === j.id}
                    onClick={() => togglePagada(j.id, !j.pagada)}
                    title={j.pagada ? 'Marcar com a pendent' : 'Marcar com a pagat'}
                    className="flex items-center gap-1"
                  >
                    {j.pagada ? (
                      <Badge tone="success">
                        <Check className="h-3 w-3 mr-0.5" />
                        Pagat
                      </Badge>
                    ) : (
                      <Badge tone="warning">Pendent</Badge>
                    )}
                  </button>
                </Td>
                <Td>
                  <button className="text-slate-400 hover:text-red-600" onClick={() => setConfirmEsborrar(j.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {perTasques ? (
        <form onSubmit={afegir} className="grid items-end gap-2 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <Field label="Dia">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field label="Import (€)">
            <Input type="number" step="0.01" placeholder="0,00" value={importe} onChange={(e) => setImporte(e.target.value)} />
          </Field>
          <Button type="submit" disabled={saving || !importe}>
            <Plus className="h-4 w-4" /> Afegir pagament
          </Button>
        </form>
      ) : (
        <form onSubmit={afegir} className="grid items-end gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <Field label="Dia">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field label="Hores">
            <Input type="number" step="0.25" value={hores} onChange={(e) => setHores(e.target.value)} />
          </Field>
          <Field label={`€/hora${preuHora ? ` (per defecte ${preuHora})` : ''}`}>
            <Input
              type="number"
              step="0.01"
              placeholder={preuHora ? String(preuHora) : 'Indica el preu'}
              value={preu}
              onChange={(e) => setPreu(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={saving || !hores}>
            <Plus className="h-4 w-4" /> Afegir jornada
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ConfirmDialog
        open={!!confirmEsborrar}
        title="Eliminar pagament"
        message="Segur que vols eliminar aquest pagament?"
        onConfirm={() => {
          esborrar(confirmEsborrar!);
          setConfirmEsborrar(null);
        }}
        onCancel={() => setConfirmEsborrar(null)}
      />
    </div>
  );
}
