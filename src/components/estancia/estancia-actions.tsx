'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { patchJSON, ApiError } from '@/lib/api';
import { ESTAT_ENVIAMENT_LABELS, estatEnviamentValues } from '@/lib/validation/enums';
import { formatDate } from '@/lib/utils';
import type { EstatEnviament } from '@prisma/client';

interface Enviament {
  id: string;
  estat: EstatEnviament;
  fitxerNom: string;
  seq: number;
  dataEnviament: string | null;
  codiValidacio: string | null;
  numRegistre: string | null;
  errorMsg: string | null;
}

export function EstanciaActions({
  estanciaId,
  enviaments,
}: {
  estanciaId: string;
  enviaments: Enviament[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; msg: string } | null>(null);

  async function generarFitxer() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/estancies/${estanciaId}/fitxer`, { method: 'POST' });
      const ct = res.headers.get('Content-Type') ?? '';
      if (!res.ok || ct.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        setNotice({ tone: 'error', msg: data.error ?? 'No s’ha pogut generar el fitxer' });
        return;
      }
      // Descarga del .txt
      const blob = await res.blob();
      const disp = res.headers.get('Content-Disposition') ?? '';
      const name = /filename="([^"]+)"/.exec(disp)?.[1] ?? 'fitxer.txt';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setNotice({ tone: 'info', msg: `Fitxer ${name} generat. Puja’l al portal de Mossos.` });
      router.refresh();
    } catch {
      setNotice({ tone: 'error', msg: 'Error generant el fitxer' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generarFitxer} disabled={busy}>
          <FileText className="h-4 w-4" /> Generar fitxer massiu
        </Button>
        <p className="text-xs text-slate-500">
          Genera el .txt i puja’l manualment al portal de Mossos (el conector automàtic és §9.5).
        </p>
      </div>

      {notice && (
        <div
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            notice.tone === 'error'
              ? 'bg-red-50 text-red-700'
              : 'bg-brand-50 text-brand-800'
          }`}
        >
          {notice.tone === 'error' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{notice.msg}</span>
        </div>
      )}

      <div className="space-y-3">
        {enviaments.length === 0 && (
          <p className="text-sm text-slate-400">Encara no s’ha generat cap fitxer per a aquesta estada.</p>
        )}
        {enviaments.map((env) => (
          <EnviamentRow key={env.id} enviament={env} onChanged={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function EnviamentRow({ enviament, onChanged }: { enviament: Enviament; onChanged: () => void }) {
  const [estat, setEstat] = useState<EstatEnviament>(enviament.estat);
  const [codiValidacio, setCodi] = useState(enviament.codiValidacio ?? '');
  const [numRegistre, setNum] = useState(enviament.numRegistre ?? '');
  const [errorMsg, setErrorMsg] = useState(enviament.errorMsg ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      await patchJSON(`/api/enviaments/${enviament.id}`, {
        estat,
        codiValidacio: codiValidacio || undefined,
        numRegistre: numRegistre || undefined,
        errorMsg: errorMsg || undefined,
      });
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Download className="h-4 w-4 text-slate-400" />
          {enviament.fitxerNom}
        </div>
        <Badge tone={estat === 'ACCEPTAT' ? 'success' : estat === 'PENDENT' ? 'warning' : 'info'}>
          {ESTAT_ENVIAMENT_LABELS[estat]}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <Select value={estat} onChange={(e) => setEstat(e.target.value as EstatEnviament)}>
          {estatEnviamentValues.map((v) => (
            <option key={v} value={v}>
              {ESTAT_ENVIAMENT_LABELS[v]}
            </option>
          ))}
        </Select>
        <Input placeholder="Codi validació" value={codiValidacio} onChange={(e) => setCodi(e.target.value)} />
        <Input placeholder="Núm. registre" value={numRegistre} onChange={(e) => setNum(e.target.value)} />
        <Button size="md" onClick={save} disabled={saving}>
          {saving ? 'Desant…' : 'Actualitzar'}
        </Button>
      </div>
      {(estat === 'ERROR' || estat === 'REBUTJAT') && (
        <Input
          className="mt-2"
          placeholder="Missatge d’error / motiu del rebuig"
          value={errorMsg}
          onChange={(e) => setErrorMsg(e.target.value)}
        />
      )}
      {enviament.dataEnviament && (
        <p className="mt-1 text-xs text-slate-400">Enviat: {formatDate(enviament.dataEnviament)}</p>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
