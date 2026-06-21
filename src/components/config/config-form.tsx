'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { getJSON, patchJSON, ApiError } from '@/lib/api';

interface Establiment {
  idPolicial: string;
  nom: string;
  cif: string;
  fileIdentifier: string | null;
  encoding: string;
  ieetImportPersonaNit: string | null;
  retencioPolicialAnys: number;
  retencioCrmAnys: number | null;
  mossosUser: string | null;
  mossosPassConfigurada?: boolean;
}

export function ConfigForm() {
  const [e, setE] = useState<Establiment | null>(null);
  const [mossosPass, setMossosPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    getJSON<{ establiment: Establiment }>('/api/establiment').then((r) => setE(r.establiment));
  }, []);

  if (!e) return <p className="text-sm text-slate-400">Carregant…</p>;

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!e) return;
    setSaving(true);
    setMsg(null);
    try {
      await patchJSON('/api/establiment', {
        fileIdentifier: e.fileIdentifier ?? '',
        encoding: e.encoding,
        ieetImportPersonaNit: e.ieetImportPersonaNit ? Number(e.ieetImportPersonaNit) : undefined,
        retencioPolicialAnys: e.retencioPolicialAnys,
        retencioCrmAnys: e.retencioCrmAnys ?? undefined,
        mossosUser: e.mossosUser ?? undefined,
        mossosPass: mossosPass || undefined,
      });
      setMossosPass('');
      setMsg({ tone: 'ok', text: 'Configuració desada.' });
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof ApiError ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dades de l’establiment</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Nom">
            <Input value={e.nom} disabled />
          </Field>
          <Field label="Id policial">
            <Input value={e.idPolicial} disabled />
          </Field>
          <Field label="CIF">
            <Input value={e.cif} disabled />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fitxer massiu de Mossos (§9)</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="File identifier (§9.2)"
            hint="9-10 car. alfanumèrics de «Dades de l’establiment» del portal. NO és l’Id policial."
          >
            <Input
              value={e.fileIdentifier ?? ''}
              onChange={(ev) => setE({ ...e, fileIdentifier: ev.target.value })}
              placeholder="p.ex. 08043AAR02"
            />
          </Field>
          <Field label="Codificació (§9.3)">
            <Select value={e.encoding} onChange={(ev) => setE({ ...e, encoding: ev.target.value })}>
              <option value="latin1">ISO-8859-1 (latin1)</option>
              <option value="utf-8">UTF-8</option>
            </Select>
          </Field>
          <Field label="Usuari Mossos (conector §9.5)">
            <Input
              value={e.mossosUser ?? ''}
              onChange={(ev) => setE({ ...e, mossosUser: ev.target.value })}
            />
          </Field>
          <Field
            label="Contrasenya Mossos"
            hint={e.mossosPassConfigurada ? 'Ja configurada (es desa xifrada). Deixa-ho buit per mantenir-la.' : 'Es desa xifrada (AES-256-GCM).'}
          >
            <Input
              type="password"
              value={mossosPass}
              onChange={(ev) => setMossosPass(ev.target.value)}
              placeholder="••••••••"
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturació i RGPD</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="IEET (€/persona·nit) (§9.7)">
            <Input
              type="number"
              step="0.01"
              value={e.ieetImportPersonaNit ?? ''}
              onChange={(ev) => setE({ ...e, ieetImportPersonaNit: ev.target.value })}
            />
          </Field>
          <Field label="Retenció policial (anys)">
            <Input
              type="number"
              value={e.retencioPolicialAnys}
              onChange={(ev) => setE({ ...e, retencioPolicialAnys: Number(ev.target.value) })}
            />
          </Field>
          <Field label="Retenció CRM (anys)">
            <Input
              type="number"
              value={e.retencioCrmAnys ?? ''}
              onChange={(ev) => setE({ ...e, retencioCrmAnys: ev.target.value ? Number(ev.target.value) : null })}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Desant…' : 'Desar configuració'}
        </Button>
        {msg && (
          <span className={msg.tone === 'ok' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
