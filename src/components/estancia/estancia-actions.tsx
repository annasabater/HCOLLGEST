'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, AlertTriangle, FileCheck, Send, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GenerarFitxerButton, type FitxerNotice } from './generar-fitxer-button';
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
  esAmpliacio = false,
}: {
  estanciaId: string;
  enviaments: Enviament[];
  /** Si és una ampliació d'una estada: els hostes ja es van comunicar a Mossos. */
  esAmpliacio?: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<FitxerNotice | null>(null);
  const [enviant, setEnviant] = useState(false);
  const [confirmaEnviar, setConfirmaEnviar] = useState(false);

  async function enviarAuto() {
    setEnviant(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/estancies/${estanciaId}/fitxer/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setNotice({
          tone: 'info',
          msg: `Pujat a Mossos correctament${data.codiValidacio ? ` (codi ${data.codiValidacio})` : ''}.`,
        });
        router.refresh();
      } else {
        setNotice({ tone: 'error', msg: data.error ?? data.errorMsg ?? 'No s’ha pogut pujar a Mossos.' });
      }
    } catch {
      setNotice({ tone: 'error', msg: 'Error de connexió pujant a Mossos.' });
    } finally {
      setEnviant(false);
      setConfirmaEnviar(false);
    }
  }

  return (
    <div className="space-y-4">
      {esAmpliacio && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <p className="font-medium">Ampliació — normalment no cal reenviar a Mossos.</p>
          <p className="mt-0.5 text-blue-700">
            Aquests hostes ja es van comunicar en l’estada original. Segons el manual (§4):{' '}
            <em>«només cal trametre les altes de cada client… no cal tornar a relacionar els
            clients que ja han estat informats en enviaments anteriors».</em> Pots generar el
            fitxer igualment si vols comunicar la nova estada, però sigues-ne conscient.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setConfirmaEnviar(true)} disabled={enviant}>
          <Send className="h-4 w-4" /> {enviant ? 'Pujant a Mossos…' : 'Pujar a Mossos (automàtic)'}
        </Button>
        <GenerarFitxerButton
          estanciaId={estanciaId}
          label="Descarregar .txt (manual)"
          variant="outline"
          onResult={(n) => setNotice(n)}
          onDone={() => router.refresh()}
        />
      </div>
      <p className="text-xs text-slate-500">
        <strong>Automàtic</strong>: l’app puja el fitxer al portal de Mossos sola i desa el comprovant.
        <strong> Manual</strong>: descarrega el .txt per pujar-lo tu.
      </p>

      {confirmaEnviar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-brand-800">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <h2 className="text-lg font-semibold">Pujar a Mossos automàticament</h2>
            </div>
            <p className="text-sm text-slate-600">
              L’app obrirà el portal de Mossos en un navegador remot, farà login amb les teves
              credencials i <strong>comunicarà oficialment</strong> les dades dels viatgers (com a
              «Pagament a destinació»). Pot trigar uns segons. Vols continuar?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmaEnviar(false)} disabled={enviant}>
                Cancel·lar
              </Button>
              <Button variant="danger" size="sm" onClick={enviarAuto} disabled={enviant}>
                {enviant ? 'Pujant…' : 'Sí, pujar ara'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
      <div className="mt-2">
        <a href={`/api/enviaments/${enviament.id}/justificant`} target="_blank" rel="noreferrer">
          <Button type="button" variant="outline" size="sm">
            <FileCheck className="h-4 w-4" /> Justificant PDF
          </Button>
        </a>
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
