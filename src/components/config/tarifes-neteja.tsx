'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { getJSON, patchJSON, ApiError } from '@/lib/api';

interface Tarifes {
  preuNetejaSortida: string | null;
  preuNetejaManteniment: string | null;
  preuNetejaZones: string | null;
}

export function TarifesNeteja() {
  const [t, setT] = useState({ sortida: '', manteniment: '', zones: '' });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    getJSON<{ establiment: Tarifes }>('/api/establiment').then((r) => {
      setT({
        sortida: r.establiment.preuNetejaSortida ?? '',
        manteniment: r.establiment.preuNetejaManteniment ?? '',
        zones: r.establiment.preuNetejaZones ?? '',
      });
      setLoaded(true);
    });
  }, []);

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await patchJSON('/api/establiment', {
        preuNetejaSortida: t.sortida ? Number(t.sortida) : 0,
        preuNetejaManteniment: t.manteniment ? Number(t.manteniment) : 0,
        preuNetejaZones: t.zones ? Number(t.zones) : 0,
      });
      setMsg({ tone: 'ok', text: 'Tarifes desades.' });
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof ApiError ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <CardTitle>Tarifes de neteja</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="mb-4 text-sm text-slate-500">
          Preus per calcular el que pagues a la dona de neteja al full diari de Neteja.
        </p>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
          <Field label="Sortida (€/habitació)">
            <Input
              type="number"
              step="0.01"
              value={t.sortida}
              onChange={(e) => setT({ ...t, sortida: e.target.value })}
              placeholder="15"
              disabled={!loaded}
            />
          </Field>
          <Field label="Manteniment (€/habitació)">
            <Input
              type="number"
              step="0.01"
              value={t.manteniment}
              onChange={(e) => setT({ ...t, manteniment: e.target.value })}
              placeholder="12.50"
              disabled={!loaded}
            />
          </Field>
          <Field label="Zones comunes (€ pack)" hint="Passadís + vorera + pati, tot junt.">
            <Input
              type="number"
              step="0.01"
              value={t.zones}
              onChange={(e) => setT({ ...t, zones: e.target.value })}
              placeholder="12.50"
              disabled={!loaded}
            />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-3">
            <Button type="submit" disabled={saving || !loaded}>
              {saving ? 'Desant…' : 'Desar tarifes'}
            </Button>
            {msg && (
              <span className={msg.tone === 'ok' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
                {msg.text}
              </span>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
