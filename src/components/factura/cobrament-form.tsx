'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { postJSON, ApiError } from '@/lib/api';
import { optionsFrom, metodeCobramentValues, METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';

export function CobramentForm({ facturaId, pendent }: { facturaId: string; pendent: number }) {
  const router = useRouter();
  const [metode, setMetode] = useState('EFECTIU');
  const [importVal, setImportVal] = useState(pendent > 0 ? String(pendent) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/factures/${facturaId}/cobraments`, {
        metode,
        import: Number(importVal),
      });
      setImportVal('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error registrant el cobrament');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs text-slate-500">Mètode</label>
        <Select className="h-9 w-40" value={metode} onChange={(e) => setMetode(e.target.value)}>
          {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">Import €</label>
        <Input
          className="h-9 w-32"
          type="number"
          step="0.01"
          value={importVal}
          onChange={(e) => setImportVal(e.target.value)}
        />
      </div>
      <Button type="submit" size="sm" disabled={saving || !importVal}>
        {saving ? 'Desant…' : 'Registrar cobrament'}
      </Button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
