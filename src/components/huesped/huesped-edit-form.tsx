'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { patchJSON, ApiError } from '@/lib/api';
import {
  optionsFrom,
  sexeValues,
  SEXE_LABELS,
  tipusDocumentValues,
  TIPUS_DOCUMENT_LABELS,
} from '@/lib/validation/enums';

export type HuespedFormValues = {
  nom: string;
  cognom1: string;
  cognom2: string;
  sexe: string;
  dataNaixement: string;
  nacionalitat: string;
  tipusDocument: string;
  numDocument: string;
  numSuport: string;
  dataExpedicio: string;
  email: string;
  telefon: string;
  adreca: string;
  pais: string;
  provincia: string;
  municipi: string;
  localitat: string;
  codiPostal: string;
};

export function HuespedEditForm({
  huespedId,
  initial,
}: {
  huespedId: string;
  initial: HuespedFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState<HuespedFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<HuespedFormValues>) => setV({ ...v, ...patch });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await patchJSON(`/api/huespedes/${huespedId}`, v);
      router.push(`/huespedes/${huespedId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant la fitxa');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dades personals</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nom" required>
            <Input value={v.nom} onChange={(e) => set({ nom: e.target.value })} />
          </Field>
          <Field label="Primer cognom" required>
            <Input value={v.cognom1} onChange={(e) => set({ cognom1: e.target.value })} />
          </Field>
          <Field label="Segon cognom">
            <Input value={v.cognom2} onChange={(e) => set({ cognom2: e.target.value })} />
          </Field>
          <Field label="Sexe">
            <Select value={v.sexe} onChange={(e) => set({ sexe: e.target.value })}>
              <option value="">—</option>
              {optionsFrom(sexeValues, SEXE_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data de naixement">
            <Input
              type="date"
              value={v.dataNaixement}
              onChange={(e) => set({ dataNaixement: e.target.value })}
            />
          </Field>
          <Field label="Nacionalitat">
            <Input value={v.nacionalitat} onChange={(e) => set({ nacionalitat: e.target.value })} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document i contacte</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tipus de document">
            <Select value={v.tipusDocument} onChange={(e) => set({ tipusDocument: e.target.value })}>
              <option value="">—</option>
              {optionsFrom(tipusDocumentValues, TIPUS_DOCUMENT_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Número de document">
            <Input value={v.numDocument} onChange={(e) => set({ numDocument: e.target.value })} />
          </Field>
          <Field label="Número de suport">
            <Input value={v.numSuport} onChange={(e) => set({ numSuport: e.target.value })} />
          </Field>
          <Field label="Data d’expedició">
            <Input
              type="date"
              value={v.dataExpedicio}
              onChange={(e) => set({ dataExpedicio: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Telèfon">
            <Input value={v.telefon} onChange={(e) => set({ telefon: e.target.value })} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adreça</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Adreça" className="lg:col-span-2">
            <Input value={v.adreca} onChange={(e) => set({ adreca: e.target.value })} />
          </Field>
          <Field label="Codi postal">
            <Input value={v.codiPostal} onChange={(e) => set({ codiPostal: e.target.value })} />
          </Field>
          <Field label="País">
            <Input value={v.pais} onChange={(e) => set({ pais: e.target.value })} />
          </Field>
          <Field label="Província">
            <Input value={v.provincia} onChange={(e) => set({ provincia: e.target.value })} />
          </Field>
          <Field label="Municipi">
            <Input value={v.municipi} onChange={(e) => set({ municipi: e.target.value })} />
          </Field>
          <Field label="Localitat">
            <Input value={v.localitat} onChange={(e) => set({ localitat: e.target.value })} />
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Desant…' : 'Desar canvis'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel·lar
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
