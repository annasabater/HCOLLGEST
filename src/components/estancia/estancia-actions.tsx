'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, AlertTriangle, FileCheck, Send, ShieldAlert, Trash2 } from 'lucide-react';
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

  // Si ja s'ha comunicat correctament, avisem abans de tornar-ho a enviar (duplicat).
  const jaComunicada = enviaments.find((e) => e.estat === 'ENVIAT' || e.estat === 'ACCEPTAT');

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
            {jaComunicada && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> Aquesta estada ja s’ha comunicat a Mossos
                  {jaComunicada.dataEnviament ? ` el ${formatDate(jaComunicada.dataEnviament)}` : ''}
                  {jaComunicada.codiValidacio ? ` (codi ${jaComunicada.codiValidacio})` : ''}.
                </p>
                <p className="mt-0.5 text-amber-700">
                  Tornar-ho a enviar comunicarà els hostes <strong>per duplicat</strong> (el manual diu
                  que no cal reenviar els ja informats). Fes-ho només si realment cal.
                </p>
              </div>
            )}
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
  // Eliminació amb doble confirmació (0 cap · 1 avís · 2 confirmació final).
  const [delStep, setDelStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);

  async function eliminar() {
    setDeleting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/enviaments/${enviament.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'No s’ha pogut eliminar');
      }
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error eliminant');
      setDelStep(0);
    } finally {
      setDeleting(false);
    }
  }

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
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a href={`/api/enviaments/${enviament.id}/justificant`} target="_blank" rel="noreferrer">
          <Button type="button" variant="outline" size="sm">
            <FileCheck className="h-4 w-4" /> Justificant PDF
          </Button>
        </a>
        {delStep === 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setDelStep(1)}>
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        )}
      </div>

      {delStep === 1 && (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-medium">Eliminar aquest comprovant de l’app?</p>
          <p className="mt-0.5 text-amber-700">
            Només s’esborra del teu sistema. <strong>NO es treu de Mossos</strong>: si ja s’havia
            comunicat, allà hi continua (no es pot desfer).
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDelStep(0)}>Cancel·lar</Button>
            <Button size="sm" onClick={() => setDelStep(2)}>Continuar</Button>
          </div>
        </div>
      )}
      {delStep === 2 && (
        <div className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Confirmació final
          </p>
          <p className="mt-0.5 text-red-700">
            Segur que vols eliminar <strong>{enviament.fitxerNom}</strong> definitivament de l’app?
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDelStep(0)} disabled={deleting}>
              Enrere
            </Button>
            <Button variant="danger" size="sm" onClick={eliminar} disabled={deleting}>
              {deleting ? 'Eliminant…' : 'Sí, eliminar'}
            </Button>
          </div>
        </div>
      )}
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
