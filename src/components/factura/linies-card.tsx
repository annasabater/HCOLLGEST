'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { patchJSON, ApiError } from '@/lib/api';
import { formatEur } from '@/lib/utils';
import {
  CONCEPTE_LINIA_LABELS,
  concepteLiniaValues,
  optionsFrom,
} from '@/lib/validation/enums';

type Linia = { id: string; concepte: string; descripcio: string; import: number };
type EditLinia = { concepte: string; descripcio: string; import: string };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const conceptes = optionsFrom(concepteLiniaValues, CONCEPTE_LINIA_LABELS);

/**
 * Targeta de línies d'una factura. En mode lectura mostra la taula + totals;
 * si `editable` (només rebuts, no factures fiscals Veri*Factu) permet editar
 * conceptes/descripcions/imports inline. En desar, el servidor recalcula
 * base/IVA/total i l'estat (cobrada/pendent) segons el cobrat.
 */
export function LiniesCard({
  facturaId,
  linies,
  base,
  iva,
  total,
  ivaPercent,
  tasaTotal,
  editable,
}: {
  facturaId: string;
  linies: Linia[];
  base: number;
  iva: number;
  total: number;
  ivaPercent: number;
  tasaTotal: number;
  editable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<EditLinia[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function obrir() {
    setRows(
      linies.map((l) => ({
        concepte: l.concepte,
        descripcio: l.descripcio,
        import: String(l.import),
      })),
    );
    setError(null);
    setEditing(true);
  }

  function setRow(i: number, patch: Partial<EditLinia>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { concepte: 'EXTRA', descripcio: '', import: '' }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  // Previsualització: el % d'IVA i la tassa es conserven; només canvia la base.
  const previewBase = round2(rows.reduce((a, r) => a + (Number(r.import) || 0), 0));
  const previewIva = round2((previewBase * ivaPercent) / 100);
  const previewTotal = round2(previewBase + previewIva + tasaTotal);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await patchJSON(`/api/factures/${facturaId}`, {
        linies: rows.map((r) => ({
          concepte: r.concepte,
          descripcio: r.descripcio.trim(),
          import: Number(r.import) || 0,
        })),
      });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut desar la factura');
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    rows.length > 0 && rows.every((r) => r.descripcio.trim() !== '' && r.import.trim() !== '');

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Línies</CardTitle>
        {editable && !editing && (
          <Button type="button" variant="ghost" size="sm" onClick={obrir}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {!editing ? (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Concepte</Th>
                  <Th>Descripció</Th>
                  <Th className="text-right">Import</Th>
                </tr>
              </Thead>
              <tbody>
                {linies.map((l) => (
                  <Tr key={l.id}>
                    <Td>{CONCEPTE_LINIA_LABELS[l.concepte as keyof typeof CONCEPTE_LINIA_LABELS]}</Td>
                    <Td>{l.descripcio}</Td>
                    <Td className="text-right">{formatEur(l.import)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <dl className="mt-4 space-y-1 text-sm">
              {iva > 0 && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Base imposable</dt>
                    <dd>{formatEur(base)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">IVA</dt>
                    <dd>{formatEur(iva)}</dd>
                  </div>
                </>
              )}
              {tasaTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tassa turística</dt>
                  <dd>{formatEur(tasaTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatEur(total)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
                <div className="w-36">
                  <label className="mb-1 block text-xs text-slate-500">Concepte</label>
                  <Select
                    className="h-9"
                    value={r.concepte}
                    onChange={(e) => setRow(i, { concepte: e.target.value })}
                  >
                    {conceptes.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="min-w-40 flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Descripció</label>
                  <Input
                    className="h-9"
                    value={r.descripcio}
                    onChange={(e) => setRow(i, { descripcio: e.target.value })}
                  />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs text-slate-500">Import €</label>
                  <Input
                    className="h-9"
                    type="number"
                    step="0.01"
                    value={r.import}
                    onChange={(e) => setRow(i, { import: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(i)}
                  disabled={rows.length <= 1}
                  title="Treure línia"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="ghost" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" /> Afegir línia
            </Button>

            <dl className="space-y-1 border-t border-slate-200 pt-3 text-sm">
              {previewIva > 0 && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Base imposable</dt>
                    <dd>{formatEur(previewBase)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">IVA ({round2(ivaPercent)}%)</dt>
                    <dd>{formatEur(previewIva)}</dd>
                  </div>
                </>
              )}
              {tasaTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tassa turística</dt>
                  <dd>{formatEur(tasaTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatEur(previewTotal)}</dd>
              </div>
            </dl>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={save} disabled={saving || !canSave}>
                {saving ? 'Desant…' : 'Desar canvis'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                <X className="h-4 w-4" /> Cancel·lar
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
