'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { postJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import { toISODate } from '@/lib/dates';

interface Jornada {
  id: string;
  data: string;
  hores: number;
  preuHora: number;
  import: number;
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
  const mesLabel = (ym: string) =>
    new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(
      new Date(`${ym}-01T00:00:00`),
    );

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    if (!hores) return;
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/treballadors/${treballadorId}/jornades`, {
        data,
        hores: Number(hores),
        preuHora: preu || undefined,
      });
      setHores('');
      setPreu('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function esborrar(id: string) {
    if (!confirm('Segur que vols eliminar aquesta jornada?')) return;
    await fetch(`/api/jornades/${id}`, { method: 'DELETE' });
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
          A pagar: <strong>{formatEur(totalSel)}</strong>{' '}
          <span className="text-slate-500">({horesSel} h)</span>
        </span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-600">Total acumulat: {formatEur(totalGeneral)}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>
          {jornades.length === 0 ? 'Encara no hi ha jornades registrades.' : 'Cap jornada en aquest mes.'}
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Dia</Th>
              <Th>Hores</Th>
              <Th>€/h</Th>
              <Th className="text-right">Import</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((j) => (
              <Tr key={j.id}>
                <Td>{formatDate(j.data)}</Td>
                <Td>{j.hores} h</Td>
                <Td>{formatEur(j.preuHora)}</Td>
                <Td className="text-right font-medium">{formatEur(j.import)}</Td>
                <Td>
                  <button className="text-slate-400 hover:text-red-600" onClick={() => esborrar(j.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

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
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
