'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Printer, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { patchJSON, delJSON, ApiError } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EstadaPicker } from '@/components/pressupost/estada-picker';
import { LANGS, type Lang } from '@/lib/plantilles';
import { formatEur } from '@/lib/utils';

export interface PressupostData {
  id: string;
  numero: string;
  data: string; // ISO yyyy-mm-dd
  validesa: string | null;
  idioma: Lang;
  estanciaId: string | null;
  estanciaLabel: string | null;
  clientNom: string;
  clientNif: string;
  clientAdreca: string;
  clientLocalitat: string;
  compte: string;
  notes: string;
  ivaPercent: number;
  linies: { descripcio: string; import: string }[];
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function PressupostForm({ inicial }: { inicial: PressupostData }) {
  const router = useRouter();
  const [v, setV] = useState<PressupostData>(inicial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = <K extends keyof PressupostData>(k: K, val: PressupostData[K]) => setV((p) => ({ ...p, [k]: val }));

  const totals = useMemo(() => {
    const base = r2(v.linies.reduce((a, l) => a + (parseFloat(l.import.replace(',', '.')) || 0), 0));
    const iva = r2((base * (Number(v.ivaPercent) || 0)) / 100);
    return { base, iva, total: r2(base + iva) };
  }, [v.linies, v.ivaPercent]);

  const setLinia = (i: number, patch: Partial<{ descripcio: string; import: string }>) =>
    setV((p) => ({ ...p, linies: p.linies.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));
  const addLinia = () => setV((p) => ({ ...p, linies: [...p.linies, { descripcio: '', import: '' }] }));
  const removeLinia = (i: number) => setV((p) => ({ ...p, linies: p.linies.filter((_, k) => k !== i) }));

  async function desa() {
    setSaving(true);
    setError(null);
    try {
      await patchJSON(`/api/pressupostos/${v.id}`, {
        numero: v.numero.trim(),
        data: v.data || undefined,
        validesa: v.validesa || undefined,
        idioma: v.idioma,
        estanciaId: v.estanciaId, // id = assignar; null = desassignar
        clientNom: v.clientNom,
        clientNif: v.clientNif,
        clientAdreca: v.clientAdreca,
        clientLocalitat: v.clientLocalitat,
        compte: v.compte,
        notes: v.notes,
        ivaPercent: Number(v.ivaPercent) || 0,
        linies: v.linies
          .filter((l) => l.descripcio.trim() || l.import.trim())
          .map((l) => ({ descripcio: l.descripcio, import: parseFloat(l.import.replace(',', '.')) || 0 })),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut desar');
    } finally {
      setSaving(false);
    }
  }

  async function elimina() {
    try {
      await delJSON(`/api/pressupostos/${v.id}`);
      router.push('/pressupostos');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut eliminar');
      setConfirmDel(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={desa} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Desant…' : 'Desar'}
        </Button>
        <a href={`/imprimir/pressupost/${v.id}`} target="_blank" rel="noreferrer">
          <Button variant="outline">
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </Button>
        </a>
        <Button variant="ghost" onClick={() => setConfirmDel(true)} className="text-red-600">
          <Trash2 className="h-4 w-4" /> Eliminar
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <Card>
        <CardHeader><CardTitle>Dades del pressupost</CardTitle></CardHeader>
        <CardBody className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Número" hint="Editable: proposat el següent. Deixa’l com vulguis.">
            <Input uppercase value={v.numero} onChange={(e) => set('numero', e.target.value)} />
          </Field>
          <Field label="Data">
            <Input type="date" value={v.data} onChange={(e) => set('data', e.target.value)} />
          </Field>
          <Field label="Vàlid fins a" hint="Opcional">
            <Input type="date" value={v.validesa ?? ''} onChange={(e) => set('validesa', e.target.value)} />
          </Field>
          <Field label="Idioma del document" hint="En quin idioma es genera el pressupost imprès.">
            <Select value={v.idioma} onChange={(e) => set('idioma', e.target.value as Lang)}>
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Estada (opcional)</CardTitle></CardHeader>
        <CardBody>
          <Field label="Enllaça aquest pressupost a una estada" hint="Apareixerà al panell «Pressupostos» de l’estada. Deixa-ho buit si és un pressupost solt.">
            <EstadaPicker
              pressupostId={v.id}
              estanciaId={v.estanciaId}
              estanciaLabel={v.estanciaLabel}
              onSelect={(id, label) => setV((p) => ({ ...p, estanciaId: id, estanciaLabel: label }))}
              onClear={() => setV((p) => ({ ...p, estanciaId: null, estanciaLabel: null }))}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Client</CardTitle></CardHeader>
        <CardBody className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Nom / Empresa" className="xl:col-span-2">
            <Input value={v.clientNom} onChange={(e) => set('clientNom', e.target.value)} />
          </Field>
          <Field label="NIF / CIF">
            <Input uppercase value={v.clientNif} onChange={(e) => set('clientNif', e.target.value)} />
          </Field>
          <Field label="Adreça" className="xl:col-span-2">
            <Input value={v.clientAdreca} onChange={(e) => set('clientAdreca', e.target.value)} />
          </Field>
          <Field label="Localitat">
            <Input value={v.clientLocalitat} onChange={(e) => set('clientLocalitat', e.target.value)} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conceptes</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {v.linies.map((l, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_140px_auto]">
              <Field label={i === 0 ? 'Descripció' : undefined}>
                <Input value={l.descripcio} onChange={(e) => setLinia(i, { descripcio: e.target.value })} placeholder="Concepte…" />
              </Field>
              <Field label={i === 0 ? 'Import (€)' : undefined}>
                <Input inputMode="decimal" value={l.import} onChange={(e) => setLinia(i, { import: e.target.value })} placeholder="0,00" className="text-right" />
              </Field>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeLinia(i)} disabled={v.linies.length <= 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addLinia}>
            <Plus className="h-4 w-4" /> Afegir concepte
          </Button>

          <div className="ml-auto w-full max-w-xs space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Base</span><span>{formatEur(totals.base)}</span></div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-slate-500">
                IVA
                <input
                  inputMode="decimal"
                  value={String(v.ivaPercent)}
                  onChange={(e) => set('ivaPercent', Number(e.target.value.replace(',', '.')) || 0)}
                  className="w-12 rounded border border-slate-300 px-1 text-right"
                />
                %
              </span>
              <span>{formatEur(totals.iva)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-1 text-base font-semibold text-slate-900">
              <span>Total</span><span>{formatEur(totals.total)}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pagament i notes</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <Field label="Número de compte (IBAN)" hint="Perquè el client hi pugui pagar. Per defecte, el de l’establiment.">
            <Input uppercase value={v.compte} onChange={(e) => set('compte', e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" />
          </Field>
          <Field label="Notes / observacions">
            <Textarea value={v.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Condicions, terminis…" />
          </Field>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmDel}
        title="Eliminar pressupost"
        message={`Segur que vols eliminar el pressupost ${v.numero}? El número quedarà lliure.`}
        onConfirm={elimina}
        onCancel={() => setConfirmDel(false)}
      />
    </div>
  );
}
