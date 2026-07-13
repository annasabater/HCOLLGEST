'use client';

import { useEffect, useState } from 'react';
import { Building2, FileStack, Receipt, Scale, Bell, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
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
  // Dades per a la factura impresa.
  raoSocial: string | null;
  adreca: string | null;
  codiPostal: string | null;
  poblacio: string | null;
  telefon: string | null;
  iban: string | null;
  descriptor: string | null;
  facturaTitular: string | null;
  facturaNif: string | null;
  benvingudaAutomatica: boolean;
  benvingudaTothom: boolean;
  saldoInicialTresoreria: string;
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
        raoSocial: e.raoSocial ?? '',
        adreca: e.adreca ?? '',
        codiPostal: e.codiPostal ?? '',
        poblacio: e.poblacio ?? '',
        telefon: e.telefon ?? '',
        iban: e.iban ?? '',
        descriptor: e.descriptor ?? '',
        facturaTitular: e.facturaTitular ?? '',
        facturaNif: e.facturaNif ?? '',
        benvingudaAutomatica: e.benvingudaAutomatica,
        benvingudaTothom: e.benvingudaTothom,
        saldoInicialTresoreria: e.saldoInicialTresoreria ? Number(e.saldoInicialTresoreria) : 0,
      });
      setMossosPass('');
      setMsg({ tone: 'ok', text: 'Configuració desada.' });
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof ApiError ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  }

  const SaveRow = () => (
    <div className="flex items-center gap-3 border-t border-slate-100 pt-4 mt-2">
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? 'Desant…' : 'Desar configuració'}
      </Button>
      {msg && (
        <span className={msg.tone === 'ok' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
          {msg.text}
        </span>
      )}
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-4">
      <CollapsibleCard title="Dades de l'establiment" icon={<Building2 className="h-4 w-4 text-brand-600" />}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nom">
            <Input value={e.nom} disabled />
          </Field>
          <Field label="Id policial">
            <Input value={e.idPolicial} disabled />
          </Field>
          <Field label="CIF">
            <Input value={e.cif} disabled />
          </Field>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Fitxer massiu de Mossos" icon={<FileStack className="h-4 w-4 text-brand-600" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="File identifier"
            hint="9-10 car. alfanumèrics de «Dades de l'establiment» del portal. NO és l'Id policial."
          >
            <Input
              value={e.fileIdentifier ?? ''}
              onChange={(ev) => setE({ ...e, fileIdentifier: ev.target.value })}
              placeholder="p.ex. 08043AAR02"
            />
          </Field>
          <Field label="Codificació">
            <Select value={e.encoding} onChange={(ev) => setE({ ...e, encoding: ev.target.value })}>
              <option value="latin1">ISO-8859-1 (latin1)</option>
              <option value="utf-8">UTF-8</option>
            </Select>
          </Field>
          <Field label="Usuari Mossos">
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
        </div>
        <SaveRow />
      </CollapsibleCard>

      <CollapsibleCard title="Dades per a la factura" icon={<Receipt className="h-4 w-4 text-brand-600" />}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Titular / raó social" hint="Si es deixa buit, s'usa el nom de l'establiment.">
            <Input
              value={e.raoSocial ?? ''}
              onChange={(ev) => setE({ ...e, raoSocial: ev.target.value })}
              placeholder={e.nom}
            />
          </Field>
          <Field label="Descriptor" hint="Subtítol del membret.">
            <Input
              value={e.descriptor ?? ''}
              onChange={(ev) => setE({ ...e, descriptor: ev.target.value })}
              placeholder="p. ex. Pensió · Calella"
            />
          </Field>
          <Field label="Telèfon">
            <Input value={e.telefon ?? ''} onChange={(ev) => setE({ ...e, telefon: ev.target.value })} />
          </Field>
          <Field label="Adreça">
            <Input
              value={e.adreca ?? ''}
              onChange={(ev) => setE({ ...e, adreca: ev.target.value })}
              placeholder="C/ … , núm."
            />
          </Field>
          <Field label="Codi postal">
            <Input value={e.codiPostal ?? ''} onChange={(ev) => setE({ ...e, codiPostal: ev.target.value })} />
          </Field>
          <Field label="Població">
            <Input value={e.poblacio ?? ''} onChange={(ev) => setE({ ...e, poblacio: ev.target.value })} />
          </Field>
          <Field label="IBAN" className="sm:col-span-3">
            <Input
              value={e.iban ?? ''}
              onChange={(ev) => setE({ ...e, iban: ev.target.value })}
              placeholder="ES00 0000 0000 0000 0000 0000"
            />
          </Field>
          <Field
            label="Titular de facturació"
            hint="Persona física que surt com a emissora a les factures (pot ser diferent del titular policial/Mossos)."
          >
            <Input
              value={e.facturaTitular ?? ''}
              onChange={(ev) => setE({ ...e, facturaTitular: ev.target.value })}
              placeholder="p. ex. Elisabet Nualart Coll"
            />
          </Field>
          <Field
            label="NIF de facturació"
            hint="NIF que surt a les factures. Pot ser diferent del CIF de dalt (usat només per a Mossos)."
          >
            <Input
              value={e.facturaNif ?? ''}
              onChange={(ev) => setE({ ...e, facturaNif: ev.target.value })}
              placeholder="p. ex. 38835174L"
            />
          </Field>
        </div>
        <SaveRow />
      </CollapsibleCard>

      <CollapsibleCard title="Facturació i RGPD" icon={<Scale className="h-4 w-4 text-brand-600" />}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="IEET (€/persona·nit)">
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
        </div>
        <SaveRow />
      </CollapsibleCard>

      <CollapsibleCard title="Benvinguda als hostes" icon={<Bell className="h-4 w-4 text-brand-600" />}>
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={e.benvingudaAutomatica}
              onChange={(ev) => setE({ ...e, benvingudaAutomatica: ev.target.checked })}
            />
            <span>
              <span className="font-medium">Mostrar només el titular</span> — quan el tauler avisa
              que toca enviar la benvinguda per WhatsApp, mostra directament el botó del titular
              sense llistar tots els hostes. Si es desactiva, apareixen tots els adults per triar
              a qui enviar.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={e.benvingudaTothom}
              disabled={!e.benvingudaAutomatica}
              onChange={(ev) => setE({ ...e, benvingudaTothom: ev.target.checked })}
            />
            <span>
              <span className="font-medium">Mostrar tots els hostes adults</span> — si s&apos;activa
              l&apos;opció anterior, aquesta permet tornar a veure tots els adults al tauler.
              Els menors no hi apareixen mai.
            </span>
          </label>
        </div>
        <SaveRow />
      </CollapsibleCard>

      <CollapsibleCard title="Balanç de situació" icon={<TrendingUp className="h-4 w-4 text-brand-600" />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Saldo inicial de tresoreria (€)"
            hint="Efectiu al compte/caixa en el moment d'activar el PMS. Serveix per calcular la tresoreria actual al balanç de situació."
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              value={e.saldoInicialTresoreria ?? '0'}
              onChange={(ev) => setE({ ...e, saldoInicialTresoreria: ev.target.value })}
              placeholder="0.00"
            />
          </Field>
        </div>
        <SaveRow />
      </CollapsibleCard>
    </form>
  );
}
